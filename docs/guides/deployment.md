# Deployment & Operations

## Current setup (dev machine, no production yet)

Both processes are long-lived background processes on the dev box:

| Process | Port | Where                                                                              | Managed by |
|---------|------|------------------------------------------------------------------------------------|------------|
| Backend | 3001 | `cd backend && nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 &`     | manual     |
| Frontend| 7194 | `cd frontend && nohup npm run dev &`                                              | manual     |

No nginx, no systemd, no PM2. The dev box is also the public host. The Vite dev server handles the public HTTPS-like flow at `home-edu.make-it.com.cn:7194`.

## Restart everything

```bash
# Backend
pkill -f "uvicorn main:app" 2>/dev/null
sleep 1
cd /home/tiger/dev/claude/HomeEducation/backend
nohup python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 > /home/tiger/logs/home-edu-backend.log 2>&1 &

# Frontend
pkill -f "vite --port 7194" 2>/dev/null
sleep 1
cd /home/tiger/dev/claude/HomeEducation/frontend
nohup npm run dev > /home/tiger/logs/home-edu-frontend.log 2>&1 &
```

Check both came up:
```bash
curl http://localhost:3001/health      # {"status":"ok",...}
curl -sI http://localhost:7194 | head -1   # HTTP/1.1 200
```

## Logs

- Backend console: stdout. If `LOG_FILE` is set in `.env`, also writes a rotating file (10 MB × 5).
- Frontend: stdout. Vite surfaces HMR errors in the response body of the module that failed to compile.

Tail live:
```bash
tail -f /home/tiger/logs/home-edu-backend.log
tail -f /home/tiger/logs/home-edu-frontend.log
```

## Database

SQLite file at `backend/data/app.db`. Back it up before risky changes:

```bash
cp backend/data/app.db backend/data/app.db.bak-$(date +%Y%m%d)
```

`app.db-shm` and `app.db-wal` are SQLite's shared-memory and write-ahead log files. They appear when WAL mode is on. **Never** delete them while the backend is running.

To inspect:
```bash
sqlite3 backend/data/app.db
sqlite> .schema
sqlite> SELECT id, email, created_at FROM users LIMIT 5;
```

## When to redeploy

- Backend: any change to `backend/**/*.py` → restart uvicorn.
- Frontend: Vite has HMR, so most edits apply live. Restart the dev server if you change `vite.config.ts` or `package.json`.
- After a `git pull` or branch switch → restart both, just in case.

## Future production plan (TODO)

Not done yet. When we move to production:

1. **Backend** → real WSGI/ASGI host: gunicorn + uvicorn workers behind a reverse proxy.
2. **Frontend** → `npm run build` → static `dist/` served by nginx.
3. **TLS** → Let's Encrypt via certbot.
4. **Process management** → systemd unit files or a small `docker-compose.yml`.
5. **Migrations** → proper migration tool (currently `init_db()` is idempotent but lacks version tracking).
6. **Backups** → nightly `cron` for `app.db`.

Track these in an ADR when we get there.
