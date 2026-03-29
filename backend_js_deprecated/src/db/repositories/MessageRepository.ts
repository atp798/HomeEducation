import { getDb } from '../database';
import { Message } from '../types';

export interface IMessageRepository {
  findBySession(sessionId: number, page?: number, size?: number): Message[];
  create(sessionId: number, role: 'user' | 'assistant', content: string): Message;
  countBySession(sessionId: number): number;
}

export class SqliteMessageRepository implements IMessageRepository {
  findBySession(sessionId: number, page = 1, size = 20): Message[] {
    const offset = (page - 1) * size;
    return getDb()
      .prepare(
        `SELECT * FROM messages WHERE session_id = ?
         ORDER BY created_at ASC
         LIMIT ? OFFSET ?`
      )
      .all(sessionId, size, offset) as Message[];
  }

  create(sessionId: number, role: 'user' | 'assistant', content: string): Message {
    const result = getDb()
      .prepare('INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)')
      .run(sessionId, role, content);
    return getDb()
      .prepare('SELECT * FROM messages WHERE id = ?')
      .get(result.lastInsertRowid) as Message;
  }

  countBySession(sessionId: number): number {
    const row = getDb()
      .prepare('SELECT COUNT(*) as cnt FROM messages WHERE session_id = ?')
      .get(sessionId) as { cnt: number };
    return row.cnt;
  }
}

export const messageRepo: IMessageRepository = new SqliteMessageRepository();
