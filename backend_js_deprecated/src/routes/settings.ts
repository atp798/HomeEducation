import { Router, Response } from 'express'
import { DatabaseAdapter } from '../db/adapter'
import { UserRepository } from '../repositories/UserRepository'
import { hashPassword, comparePassword } from '../utils/crypto'
import { authMiddleware, AuthRequest } from '../middleware/auth'

export function createSettingsRouter(db: DatabaseAdapter): Router {
  const router = Router()
  const userRepo = new UserRepository(db)

  router.use(authMiddleware)

  // GET /settings
  router.get('/', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const user = userRepo.findById(userId)
      if (!user) {
        res.status(404).json({ error: 'User not found' })
        return
      }

      const now = new Date().toISOString()
      db.run(
        'INSERT OR IGNORE INTO user_settings (user_id, created_at, updated_at) VALUES (?, ?, ?)',
        [userId, now, now]
      )

      const settings = db.get<any>('SELECT * FROM user_settings WHERE user_id = ?', [userId])

      res.json({
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
        },
        settings,
      })
    } catch (err) {
      console.error('Get settings error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PUT /settings
  router.put('/', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const { theme, language, notification_ai_reply, notification_new_session, dnd_start, dnd_end } = req.body

      const now = new Date().toISOString()

      db.run(
        'INSERT OR IGNORE INTO user_settings (user_id, created_at, updated_at) VALUES (?, ?, ?)',
        [userId, now, now]
      )

      const fields: string[] = []
      const values: any[] = []

      if (theme !== undefined) { fields.push('theme = ?'); values.push(theme) }
      if (language !== undefined) { fields.push('language = ?'); values.push(language) }
      if (notification_ai_reply !== undefined) { fields.push('notification_ai_reply = ?'); values.push(notification_ai_reply ? 1 : 0) }
      if (notification_new_session !== undefined) { fields.push('notification_new_session = ?'); values.push(notification_new_session ? 1 : 0) }
      if (dnd_start !== undefined) { fields.push('dnd_start = ?'); values.push(dnd_start) }
      if (dnd_end !== undefined) { fields.push('dnd_end = ?'); values.push(dnd_end) }

      if (fields.length > 0) {
        fields.push('updated_at = ?')
        values.push(now)
        values.push(userId)
        db.run(`UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = ?`, values)
      }

      const settings = db.get<any>('SELECT * FROM user_settings WHERE user_id = ?', [userId])
      res.json(settings)
    } catch (err) {
      console.error('Update settings error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /settings/login-logs
  router.get('/login-logs', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const logs = db.query<any>(
        "SELECT * FROM login_logs WHERE user_id = ? AND created_at >= datetime('now', '-30 days') ORDER BY created_at DESC",
        [userId]
      )
      res.json(logs)
    } catch (err) {
      console.error('Get login logs error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // PUT /settings/password
  router.put('/password', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const { oldPassword, newPassword } = req.body

      if (!oldPassword || !newPassword) {
        res.status(400).json({ error: 'Old and new password are required' })
        return
      }

      const user = userRepo.findById(userId)
      if (!user || !user.password_hash) {
        res.status(400).json({ error: 'No password set for this account' })
        return
      }

      const valid = await comparePassword(oldPassword, user.password_hash)
      if (!valid) {
        res.status(401).json({ error: 'Current password is incorrect' })
        return
      }

      const newHash = await hashPassword(newPassword)
      userRepo.update(userId, { password_hash: newHash })

      res.json({ message: 'Password updated successfully' })
    } catch (err) {
      console.error('Update password error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /settings/bind-email
  router.post('/bind-email', async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const { email, password } = req.body

      if (!email) {
        res.status(400).json({ error: 'Email is required' })
        return
      }

      const existing = userRepo.findByEmail(email)
      if (existing && existing.id !== userId) {
        res.status(409).json({ error: 'Email already in use' })
        return
      }

      const updateData: any = { email }
      if (password) {
        updateData.password_hash = await hashPassword(password)
      }

      userRepo.update(userId, updateData)
      res.json({ message: 'Email bound successfully' })
    } catch (err) {
      console.error('Bind email error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /settings/bind-phone
  router.post('/bind-phone', (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.id
      const { phone, code } = req.body

      if (!phone || !code) {
        res.status(400).json({ error: 'Phone and code are required' })
        return
      }

      const now = new Date().toISOString()
      const otpRecord = db.get<any>(
        'SELECT * FROM otp_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > ? ORDER BY created_at DESC LIMIT 1',
        [phone, code, now]
      )

      if (!otpRecord) {
        res.status(401).json({ error: 'Invalid or expired OTP code' })
        return
      }

      db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpRecord.id])

      const existing = userRepo.findByPhone(phone)
      if (existing && existing.id !== userId) {
        res.status(409).json({ error: 'Phone already in use' })
        return
      }

      userRepo.update(userId, { phone })
      res.json({ message: 'Phone bound successfully' })
    } catch (err) {
      console.error('Bind phone error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
