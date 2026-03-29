import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { DatabaseAdapter, QueryResult } from './adapter'

// SQLite implementation using better-sqlite3.
// To swap to MySQL, create a MySQLAdapter implementing DatabaseAdapter.
export class SQLiteAdapter implements DatabaseAdapter {
  private db: Database.Database

  constructor(dbPath: string) {
    const resolvedPath = path.resolve(dbPath)
    const dir = path.dirname(resolvedPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.db = new Database(resolvedPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
  }

  query<T = any>(sql: string, params: any[] = []): T[] {
    const stmt = this.db.prepare(sql)
    return stmt.all(...params) as T[]
  }

  run(sql: string, params: any[] = []): QueryResult {
    const stmt = this.db.prepare(sql)
    const result = stmt.run(...params)
    return {
      lastInsertRowid: Number(result.lastInsertRowid),
      changes: result.changes,
    }
  }

  get<T = any>(sql: string, params: any[] = []): T | undefined {
    const stmt = this.db.prepare(sql)
    return stmt.get(...params) as T | undefined
  }

  close(): void {
    this.db.close()
  }
}
