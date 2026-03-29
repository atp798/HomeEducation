import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'

// Load .env synchronously before importing config
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx < 0) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && !process.env[key]) process.env[key] = val
  }
}
loadEnv()

import { config } from './config'
import { SQLiteAdapter } from './db/sqlite'
import { runMigrations } from './db/migrations'
import { createAuthRouter } from './routes/auth'
import { createChatRouter } from './routes/chat'
import { createSettingsRouter } from './routes/settings'

async function main() {
  const db = new SQLiteAdapter(config.dbPath)
  runMigrations(db)

  const app = express()

  app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }))

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  // Routes
  app.use('/auth', createAuthRouter(db))
  app.use('/chat', createChatRouter(db))
  app.use('/settings', createSettingsRouter(db))

  // 404 handler
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('Unhandled error:', err)
    res.status(500).json({ error: 'Internal server error' })
  })

  const port = Number(config.port)
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`)
    console.log(`AI model: ${config.ai.model}`)
    console.log(`DB: ${config.dbPath}`)
  })

  process.on('SIGTERM', () => {
    db.close()
    process.exit(0)
  })
}

main().catch(err => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
