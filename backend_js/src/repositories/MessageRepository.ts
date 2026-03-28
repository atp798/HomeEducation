import { v4 as uuidv4 } from 'uuid'
import { DatabaseAdapter } from '../db/adapter'

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export class MessageRepository {
  constructor(private db: DatabaseAdapter) {}

  findBySessionId(sessionId: string, page: number = 1, size: number = 20): Message[] {
    const offset = (page - 1) * size
    return this.db.query<Message>(
      'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC LIMIT ? OFFSET ?',
      [sessionId, size, offset]
    )
  }

  create(data: { session_id: string; role: 'user' | 'assistant'; content: string }): Message {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, data.session_id, data.role, data.content, now]
    )
    return this.db.get<Message>('SELECT * FROM messages WHERE id = ?', [id])!
  }

  countBySessionId(sessionId: string): number {
    const result = this.db.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
      [sessionId]
    )
    return result?.count || 0
  }
}
