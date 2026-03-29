import { getDb } from '../database';
import { User, LoginRecord } from '../types';

// IUserRepository interface — implement a MySQL version to swap storage
export interface IUserRepository {
  findByEmail(email: string): User | undefined;
  findByPhone(phone: string): User | undefined;
  findById(id: number): User | undefined;
  create(data: Partial<User>): User;
  update(id: number, data: Partial<User>): User | undefined;
  addLoginRecord(userId: number, device: string, ip: string): void;
  getLoginRecords(userId: number, days?: number): LoginRecord[];
}

export class SqliteUserRepository implements IUserRepository {
  findByEmail(email: string): User | undefined {
    return getDb().prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
  }

  findByPhone(phone: string): User | undefined {
    return getDb().prepare('SELECT * FROM users WHERE phone = ?').get(phone) as User | undefined;
  }

  findById(id: number): User | undefined {
    return getDb().prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
  }

  create(data: Partial<User>): User {
    const stmt = getDb().prepare(`
      INSERT INTO users (email, phone, password_hash)
      VALUES (@email, @phone, @password_hash)
    `);
    const result = stmt.run({
      email: data.email ?? null,
      phone: data.phone ?? null,
      password_hash: data.password_hash ?? null,
    });
    return this.findById(result.lastInsertRowid as number)!;
  }

  update(id: number, data: Partial<User>): User | undefined {
    const fields = Object.keys(data)
      .filter((k) => k !== 'id')
      .map((k) => `${k} = @${k}`)
      .join(', ');
    if (!fields) return this.findById(id);
    getDb()
      .prepare(`UPDATE users SET ${fields}, updated_at = datetime('now') WHERE id = @id`)
      .run({ ...data, id });
    return this.findById(id);
  }

  addLoginRecord(userId: number, device: string, ip: string): void {
    getDb()
      .prepare('INSERT INTO login_records (user_id, device, ip) VALUES (?, ?, ?)')
      .run(userId, device, ip);
  }

  getLoginRecords(userId: number, days = 30): LoginRecord[] {
    return getDb()
      .prepare(
        `SELECT * FROM login_records WHERE user_id = ?
         AND created_at >= datetime('now', '-${days} days')
         ORDER BY created_at DESC`
      )
      .all(userId) as LoginRecord[];
  }
}

export const userRepo: IUserRepository = new SqliteUserRepository();
