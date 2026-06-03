# Getting Started

First-time setup for the Home Education Consulting project.

## Prerequisites

| Tool      | Version          | Check         |
|-----------|------------------|---------------|
| Node.js   | ≥ 20.19          | `node -v`     |
| npm       | ≥ 10             | `npm -v`      |
| Python    | ≥ 3.10           | `python3 -V`  |
| pip       | any recent       | `pip -V`      |
| git       | any recent       | `git --version` |

The dev machine should already have all of these.

## 1. Clone the repo

```bash
git clone git@github.com:atp798/HomeEducation.git
cd HomeEducation
```

## 2. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create a local `.env` (never commit):

```bash
cp .env.example .env  # if you have one; otherwise create it
# Edit .env to set JWT_SECRET, AI_BASE_URL, AI_API_KEY, AI_MODEL
```

Start the server:

```bash
python3 main.py
# or: uvicorn main:app --host 0.0.0.0 --port 3001 --reload
```

Expected output:

```
Server starting on port 3001
AI model: doubao-seed-2-0-mini-260215
RAG: loading 35 knowledge-base files…
RAG: tokenising 1234 chunks…
RAG: index ready — 1234 chunks, 8765 vocab terms
INFO:     Uvicorn running on http://0.0.0.0:3001
```

Health check: `curl http://localhost:3001/health` → `{"status":"ok","model":"..."}`

## 3. Frontend

```bash
cd ../frontend
npm install
npm run dev
```

Vite will start on `0.0.0.0:7194`. Open one of:

- `http://localhost:7194`
- `http://home-edu.make-it.com.cn:7194` (if DNS resolves here)
- `http://82.157.28.69:7194` (public IP)

## 4. Smoke test

1. Open the app in a browser.
2. Click **Register** → create a test user.
3. (Optional) Click the verification link if SMTP is mocked.
4. **Log in**.
5. Land on `/chat` → type a question about home education → confirm the AI responds with streaming text.
6. Switch to **History** tab → see the new session appear.
7. Switch to **Settings** → toggle theme → confirm dark/light switches.

If any of these fail, check:
- `backend/data/app.log` if you set `LOG_FILE`
- The browser DevTools Network tab for failed requests
- The `troubleshooting` section below

## Troubleshooting

### Port already in use

```bash
lsof -i:3001 -i:7194
# or
ss -ltnp | grep -E ':3001|:7194'
```

Kill the offending PIDs.

### CORS errors in the browser

The backend allows `*` origins. If you still see CORS errors, make sure the backend is up:
```bash
curl http://localhost:3001/health
```

### RAG index takes forever to build

If `RAG: tokenising …` is the slow step, check that jieba is installed:
```bash
pip show jieba
```

The first time jieba runs, it may download a small dict to `~/.cache/jieba.cache`. Subsequent runs are fast.

### Streaming chat hangs

- Make sure the Vite proxy config is intact (it injects `x-accel-buffering: no` for SSE).
- Open DevTools → Network → click the `/chat/messages/stream` request → verify chunks arrive.
- Check backend logs for `httpx` errors.

### Database lock

SQLite is single-writer. If you see "database is locked":
```bash
# Check no other process is holding the DB
lsof backend/data/app.db
```
Avoid running two backend instances on the same DB file.

## Next steps

- Read `architecture/overview.md` for the system map.
- Read `guides/development.md` for day-to-day workflow.
- Read `guides/openspec-workflow.md` before making a non-trivial change.
