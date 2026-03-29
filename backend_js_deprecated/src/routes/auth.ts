import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import jwt from 'jsonwebtoken'
import { DatabaseAdapter } from '../db/adapter'
import { UserRepository } from '../repositories/UserRepository'
import { hashPassword, comparePassword, generateOtpCode } from '../utils/crypto'
import { config } from '../config'

export function createAuthRouter(db: DatabaseAdapter): Router {
  const router = Router()
  const userRepo = new UserRepository(db)

  // POST /auth/register
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body
      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' })
        return
      }

      const existing = userRepo.findByEmail(email)
      if (existing) {
        res.status(409).json({ error: '该邮箱已注册' })
        return
      }

      const password_hash = await hashPassword(password)
      const user = userRepo.create({ email, password_hash })

      const now = new Date().toISOString()

      // Create default settings
      db.run(
        'INSERT OR IGNORE INTO user_settings (user_id, created_at, updated_at) VALUES (?, ?, ?)',
        [user.id, now, now]
      )

      // Generate email verification token (valid 24 hours)
      const verificationToken = uuidv4()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      db.run(
        'INSERT INTO email_verification_tokens (id, user_id, token, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [uuidv4(), user.id, verificationToken, expiresAt, now]
      )

      // Mock: return verification link in response (remove in production when real email is set up)
      const verifyUrl = `${req.protocol}://${req.get('host')}/verify-email?token=${verificationToken}`
      console.log(`[Mock Email] Verification link for ${email}: ${verifyUrl}`)

      // Issue token immediately so user can log in without verifying (per requirements)
      const token = jwt.sign(
        { id: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      )

      res.json({
        token,
        user: { id: user.id, email: user.email, phone: user.phone, email_verified: 0 },
        // Mock only — remove when real email service is configured
        verifyUrl,
        verificationToken,
      })
    } catch (err) {
      console.error('Register error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // GET /auth/verify-email?token=xxx
  router.get('/verify-email', async (req: Request, res: Response) => {
    try {
      const { token } = req.query
      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: '无效的激活链接' })
        return
      }

      const now = new Date().toISOString()
      const record = db.get<{ id: string; user_id: string; used: number; expires_at: string }>(
        'SELECT * FROM email_verification_tokens WHERE token = ? LIMIT 1',
        [token]
      )

      if (!record) {
        res.status(400).json({ error: '激活链接无效' })
        return
      }
      if (record.used) {
        res.status(400).json({ error: '激活链接已使用' })
        return
      }
      if (record.expires_at < now) {
        res.status(400).json({ error: '激活链接已过期，请重新注册或申请新链接' })
        return
      }

      // Mark token as used and set user email_verified
      db.run('UPDATE email_verification_tokens SET used = 1 WHERE id = ?', [record.id])
      db.run('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?', [now, record.user_id])

      const user = userRepo.findById(record.user_id)
      if (!user) {
        res.status(404).json({ error: '用户不存在' })
        return
      }

      // Log login
      const ip = req.ip || req.socket.remoteAddress || ''
      const device = req.headers['user-agent'] || ''
      db.run(
        'INSERT INTO login_logs (id, user_id, ip, device, created_at) VALUES (?, ?, ?, ?, ?)',
        [uuidv4(), user.id, ip, device, now]
      )

      const jwtToken = jwt.sign(
        { id: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      )

      res.json({
        token: jwtToken,
        user: { id: user.id, email: user.email, phone: user.phone, email_verified: 1 },
      })
    } catch (err) {
      console.error('Verify email error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /auth/login
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { type } = req.body

      if (type === 'email') {
        const { email, password } = req.body
        if (!email || !password) {
          res.status(400).json({ error: 'Email and password are required' })
          return
        }

        const user = userRepo.findByEmail(email)
        if (!user || !user.password_hash) {
          res.status(401).json({ error: 'Invalid email or password' })
          return
        }

        const valid = await comparePassword(password, user.password_hash)
        if (!valid) {
          res.status(401).json({ error: 'Invalid email or password' })
          return
        }

        // Log login
        const ip = req.ip || req.socket.remoteAddress || ''
        const device = req.headers['user-agent'] || ''
        db.run(
          'INSERT INTO login_logs (id, user_id, ip, device, created_at) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), user.id, ip, device, new Date().toISOString()]
        )

        const token = jwt.sign(
          { id: user.id, email: user.email },
          config.jwtSecret,
          { expiresIn: '7d' }
        )

        res.json({
          token,
          user: { id: user.id, email: user.email, phone: user.phone, email_verified: user.email_verified },
        })
      } else if (type === 'phone') {
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

        // Mark as used
        db.run('UPDATE otp_codes SET used = 1 WHERE id = ?', [otpRecord.id])

        const user = userRepo.findOrCreateByPhone(phone)

        // Create default settings if new user
        db.run(
          'INSERT OR IGNORE INTO user_settings (user_id, created_at, updated_at) VALUES (?, ?, ?)',
          [user.id, now, now]
        )

        // Log login
        const ip = req.ip || req.socket.remoteAddress || ''
        const device = req.headers['user-agent'] || ''
        db.run(
          'INSERT INTO login_logs (id, user_id, ip, device, created_at) VALUES (?, ?, ?, ?, ?)',
          [uuidv4(), user.id, ip, device, now]
        )

        const token = jwt.sign(
          { id: user.id, phone: user.phone },
          config.jwtSecret,
          { expiresIn: '7d' }
        )

        res.json({
          token,
          user: { id: user.id, email: user.email, phone: user.phone, email_verified: user.email_verified },
        })
      } else {
        res.status(400).json({ error: 'Invalid login type' })
      }
    } catch (err) {
      console.error('Login error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  // POST /auth/send-otp
  router.post('/send-otp', async (req: Request, res: Response) => {
    try {
      const { phone } = req.body
      if (!phone) {
        res.status(400).json({ error: 'Phone is required' })
        return
      }

      const code = generateOtpCode()
      const now = new Date()
      const expiresAt = new Date(now.getTime() + 5 * 60 * 1000).toISOString()
      const id = uuidv4()

      db.run(
        'INSERT INTO otp_codes (id, phone, code, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)',
        [id, phone, code, expiresAt, now.toISOString()]
      )

      // Mock SMS — return code in response for dev
      res.json({
        message: 'OTP sent successfully',
        code, // Remove this in production
        expiresIn: 300,
      })
    } catch (err) {
      console.error('Send OTP error:', err)
      res.status(500).json({ error: 'Internal server error' })
    }
  })

  return router
}
