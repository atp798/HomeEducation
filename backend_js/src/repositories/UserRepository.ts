import { v4 as uuidv4 } from 'uuid'
import { DatabaseAdapter } from '../db/adapter'

export interface User {
  id: string
  email: string | null
  phone: string | null
  password_hash: string | null
  email_verified: number
  created_at: string
  updated_at: string
}

export class UserRepository {
  constructor(private db: DatabaseAdapter) {}

  findById(id: string): User | undefined {
    return this.db.get<User>('SELECT * FROM users WHERE id = ?', [id])
  }

  findByEmail(email: string): User | undefined {
    return this.db.get<User>('SELECT * FROM users WHERE email = ?', [email])
  }

  findByPhone(phone: string): User | undefined {
    return this.db.get<User>('SELECT * FROM users WHERE phone = ?', [phone])
  }

  create(data: { email?: string; phone?: string; password_hash?: string }): User {
    const id = uuidv4()
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO users (id, email, phone, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      [id, data.email || null, data.phone || null, data.password_hash || null, now, now]
    )
    return this.findById(id)!
  }

  update(id: string, data: Partial<User>): User {
    const fields: string[] = []
    const values: any[] = []

    if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email) }
    if (data.phone !== undefined) { fields.push('phone = ?'); values.push(data.phone) }
    if (data.password_hash !== undefined) { fields.push('password_hash = ?'); values.push(data.password_hash) }

    if (fields.length > 0) {
      const now = new Date().toISOString()
      fields.push('updated_at = ?')
      values.push(now)
      values.push(id)
      this.db.run(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values)
    }

    return this.findById(id)!
  }

  findOrCreateByPhone(phone: string): User {
    const existing = this.findByPhone(phone)
    if (existing) return existing
    return this.create({ phone })
  }
}
