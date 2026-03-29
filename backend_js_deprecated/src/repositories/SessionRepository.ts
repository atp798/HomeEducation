import { v4 as uuidv4 } from 'uuid'
import { DatabaseAdapter } from '../db/adapter'

export interface Session {
  id: string
  user_id: string
  title: string
  archived: number
  created_at: string
  updated_at: string
}

export class SessionRepository {
  constructor(private db: DatabaseAdapter) {}

  findByUserId(userId: string, filter?: 'today' | 'week' | 'all'): Session[] {
    // Sort and filter by the timestamp of the last message in each session.
    // This ensures archive/rename actions don't affect ordering, and that
    // "今天"/"最近7天" filters are based on when messages were actually exchanged.
    let dateFilter = ''
    if (filter === 'today') {
      dateFilter = "AND date(lm.last_at) = date('now')"
    } else if (filter === 'week') {
      dateFilter = "AND lm.last_at >= datetime('now', '-7 days')"
    }

    const sql = `
      SELECT s.*
      FROM sessions s
      JOIN (
        SELECT session_id, MAX(created_at) AS last_at
        FROM messages
        GROUP BY session_id
      ) lm ON lm.session_id = s.id
      WHERE s.user_id = ?
      ${dateFilter}
      ORDER BY lm.last_at DESC
    `
    return this.db.query<Session>(sql, [userId])
  }

  findById(id: string): Session | undefined {
    return this.db.get<Session>('SELECT * FROM sessions WHERE id = ?', [id])
  }

  create(userId: string, title?: string): Session {
    const id = uuidv4()
    const now = new Date().toISOString()
    const sessionTitle = title || '新咨询'
    this.db.run(
      'INSERT INTO sessions (id, user_id, title, archived, created_at, updated_at) VALUES (?, ?, ?, 0, ?, ?)',
      [id, userId, sessionTitle, now, now]
    )
    return this.findById(id)!
  }

  update(id: string, data: Partial<Session>): Session {
    const fields: string[] = []
    const values: any[] = []

    if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title) }
    if (data.archived !== undefined) { fields.push('archived = ?'); values.push(data.archived) }

    if (fields.length > 0) {
      const now = new Date().toISOString()
      fields.push('updated_at = ?')
      values.push(now)
      values.push(id)
      this.db.run(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`, values)
    }

    return this.findById(id)!
  }

  delete(id: string): void {
    this.db.run('DELETE FROM sessions WHERE id = ?', [id])
  }
}
