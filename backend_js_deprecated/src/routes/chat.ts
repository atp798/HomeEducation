import { Router, Response } from 'express'
import { DatabaseAdapter } from '../db/adapter'
import { SessionRepository } from '../repositories/SessionRepository'
import { MessageRepository } from '../repositories/MessageRepository'
import { streamChatCompletion, ChatMessage } from '../services/ai'
import { authMiddleware, AuthRequest } from '../middleware/auth'

export function createChatRouter(db: DatabaseAdapter): Router {
  const router = Router()
  const sessionRepo = new SessionRepository(db)
  const messageRepo = new MessageRepository(db)

  router.use(authMiddleware)

  // POST /chat/sessions
  router.post('/sessions', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const { title } = req.body
      const session = sessionRepo.create(userId, title)
      res.json({ sessionId: session.id, title: session.title, session })
    } catch (err) {
      console.error('Create session error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /chat/sessions
  router.get('/sessions', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const filter = req.query.filter as 'today' | 'week' | 'all' | undefined
      const sessions = sessionRepo.findByUserId(userId, filter || 'all')

      // Attach last message preview
      const sessionsWithPreview = sessions.map(session => {
        const messages = messageRepo.findBySessionId(session.id, 1, 1)
        const lastMessages = db.query<any>(
          'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at DESC LIMIT 1',
          [session.id]
        )
        return {
          ...session,
          lastMessage: lastMessages[0] || null,
          messageCount: messageRepo.countBySessionId(session.id),
        }
      })

      res.json(sessionsWithPreview)
    } catch (err) {
      console.error('List sessions error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /chat/sessions/:id/history
  router.get('/sessions/:id/history', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const sessionId = req.params.id
      const page = parseInt(req.query.page as string) || 1
      const size = parseInt(req.query.size as string) || 20

      const session = sessionRepo.findById(sessionId)
      if (!session || session.user_id !== userId) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      const messages = messageRepo.findBySessionId(sessionId, page, size)
      const total = messageRepo.countBySessionId(sessionId)

      res.json({ messages, total, page, size })
    } catch (err) {
      console.error('Get history error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // DELETE /chat/sessions/:id
  router.delete('/sessions/:id', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const sessionId = req.params.id

      const session = sessionRepo.findById(sessionId)
      if (!session || session.user_id !== userId) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      sessionRepo.delete(sessionId)
      res.json({ message: 'Session deleted' })
    } catch (err) {
      console.error('Delete session error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PATCH /chat/sessions/:id
  router.patch('/sessions/:id', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const sessionId = req.params.id

      const session = sessionRepo.findById(sessionId)
      if (!session || session.user_id !== userId) {
        res.status(404).json({ error: 'Session not found' })
        return
      }

      const { title, archived } = req.body
      const updated = sessionRepo.update(sessionId, { title, archived })
      res.json(updated)
    } catch (err) {
      console.error('Update session error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /chat/messages/stream
  router.post('/messages/stream', async (req: AuthRequest, res: Response) => {
    const userId = req.user!.id
    const { sessionId, content } = req.body

    if (!sessionId || !content) {
      res.status(400).json({ error: 'sessionId and content are required' })
      return
    }

    const session = sessionRepo.findById(sessionId)
    if (!session || session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' })
      return
    }

    // Save user message
    messageRepo.create({ session_id: sessionId, role: 'user', content })

    // Get conversation history for context
    const history = messageRepo.findBySessionId(sessionId, 1, 50)
    const chatMessages: ChatMessage[] = history.map(m => ({
      role: m.role,
      content: m.content,
    }))

    // Setup SSE — disable proxy/nginx buffering so chunks reach client immediately
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('X-Accel-Buffering', 'no')
    res.flushHeaders()

    // Disable Nagle's algorithm — forces each res.write() to be sent as its
    // own TCP packet immediately instead of being batched with the next write.
    // Without this, small SSE chunks can sit in the kernel buffer for up to
    // 200ms waiting for more data before being flushed to the client.
    if (res.socket) res.socket.setNoDelay(true)

    let fullResponse = ''
    let clientConnected = true

    // Detect client disconnect — continue accumulating on server, just stop writing
    req.on('close', () => { clientConnected = false })

    const safeWrite = (data: string) => {
      if (!clientConnected) return
      try { res.write(data) } catch { clientConnected = false }
    }

    const saveAndFinish = () => {
      // Always save to DB regardless of client connection state
      if (fullResponse) {
        messageRepo.create({ session_id: sessionId, role: 'assistant', content: fullResponse })
        if (session.title === '新咨询') {
          sessionRepo.update(sessionId, { title: content.slice(0, 30) })
        }
      }
      safeWrite('data: [DONE]\n\n')
      if (!res.writableEnded) res.end()
    }

    let reasoningSent = false
    streamChatCompletion(
      chatMessages,
      (chunk) => {
        fullResponse += chunk
        safeWrite(`data: ${JSON.stringify({ text: chunk })}\n\n`)
      },
      saveAndFinish,
      (err) => {
        console.error('AI streaming error:', err)
        // Still save whatever was accumulated before the error
        saveAndFinish()
      },
      (_reasoning) => {
        // Send a single "thinking" event at the start of the reasoning phase
        // so the frontend knows the model is working (not stalled)
        if (!reasoningSent) {
          reasoningSent = true
          safeWrite(`data: ${JSON.stringify({ thinking: true })}\n\n`)
        }
      }
    )
  })

  return router
}
