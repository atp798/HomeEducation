import { getDb } from '../database';
import { Session } from '../types';

export interface ISessionRepository {
  findById(id: number): Session | undefined;
  findByUser(userId: number, filter?: SessionFilter): Session[];
  create(userId: number, title?: string): Session;
  update(id: number, data: Partial<Session>): Session | undefined;
  delete(id: number): void;
  countByUser(userId: number): number;
}

export interface SessionFilter {
  status?: 'active' | 'archived';
  dateRange?: 'today' | '7days' | 'all';
  page?: number;
  size?: number;
}

export class SqliteSessionRepository implements ISessionRepository {
  findById(id: number): Session | undefined {
    return getDb().prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
  }

  findByUser(userId: number, filter: SessionFilter = {}): Session[] {
    const conditions: string[] = ['user_id = @userId'];
    const params: Record<string, unknown> = { userId };

    if (filter.status) {
      conditions.push('status = @status');
      params.status = filter.status;
    }

    if (filter.dateRange === 'today') {
      conditions.push("date(created_at) = date('now')");
    } else if (filter.dateRange === '7days') {
      conditions.push("created_at >= datetime('now', '-7 days')");
    }

    const page = filter.page ?? 1;
    const size = filter.size ?? 20;
    const offset = (page - 1) * size;

    const where = conditions.join(' AND ');
    return getDb()
      .prepare(
        `SELECT * FROM sessions WHERE ${where}
         ORDER BY updated_at DESC
         LIMIT ${size} OFFSET ${offset}`
      )
      .all(params) as Session[];
  }

  create(userId: number, title?: string): Session {
    const defaultTitle = title ?? `家庭教育咨询-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const result = getDb()
      .prepare('INSERT INTO sessions (user_id, title) VALUES (?, ?)')
      .run(userId, defaultTitle);
    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: Partial<Session>): Session | undefined {
    const fields = Object.keys(data)
      .filter((k) => k !== 'id')
      .map((k) => `${k} = @${k}`)
      .join(', ');
    if (!fields) return this.findById(id);
    getDb()
      .prepare(`UPDATE sessions SET ${fields}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...data, id });
    return this.findById(id);
  }

  delete(id: number): void {
    getDb().prepare('DELETE FROM sessions WHERE id = ?').run(id);
  }

  countByUser(userId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) as cnt FROM sessions WHERE user_id = ?')
      .get(userId) as { cnt: number };
    return row.cnt;
  }
}

export const sessionRepo: ISessionRepository = new SqliteSessionRepository();
