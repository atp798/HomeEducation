export interface QueryResult {
  lastInsertRowid: number
  changes: number
}

export interface DatabaseAdapter {
  query<T = any>(sql: string, params?: any[]): T[]
  run(sql: string, params?: any[]): QueryResult
  get<T = any>(sql: string, params?: any[]): T | undefined
  close(): void
}
