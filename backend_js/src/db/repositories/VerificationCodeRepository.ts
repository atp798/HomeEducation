import { getDb } from '../database';
import { VerificationCode } from '../types';

export interface IVerificationCodeRepository {
  create(target: string, code: string, type: VerificationCode['type'], ttlMinutes?: number): void;
  find(target: string, type: VerificationCode['type']): VerificationCode | undefined;
  incrementAttempts(id: number): number;
  markUsed(id: number): void;
}

export class SqliteVerificationCodeRepository implements IVerificationCodeRepository {
  create(target: string, code: string, type: VerificationCode['type'], ttlMinutes = 5): void {
    // Invalidate previous codes for this target+type
    getDb()
      .prepare("UPDATE verification_codes SET used = 1 WHERE target = ? AND type = ? AND used = 0")
      .run(target, type);

    getDb()
      .prepare(
        `INSERT INTO verification_codes (target, code, type, expires_at)
         VALUES (?, ?, ?, datetime('now', '+${ttlMinutes} minutes'))`
      )
      .run(target, code, type);
  }

  find(target: string, type: VerificationCode['type']): VerificationCode | undefined {
    return getDb()
      .prepare(
        `SELECT * FROM verification_codes
         WHERE target = ? AND type = ? AND used = 0
         AND expires_at > datetime('now')
         ORDER BY created_at DESC LIMIT 1`
      )
      .get(target, type) as VerificationCode | undefined;
  }

  incrementAttempts(id: number): number {
    getDb().prepare('UPDATE verification_codes SET attempts = attempts + 1 WHERE id = ?').run(id);
    const row = getDb()
      .prepare('SELECT attempts FROM verification_codes WHERE id = ?')
      .get(id) as { attempts: number };
    return row.attempts;
  }

  markUsed(id: number): void {
    getDb().prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(id);
  }
}

export const vcodeRepo: IVerificationCodeRepository = new SqliteVerificationCodeRepository();
