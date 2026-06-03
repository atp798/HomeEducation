# Development Workflow

Day-to-day guide for working in this repo.

## The two processes

| Process | Where                  | Restart on save? |
|---------|------------------------|------------------|
| Backend | `cd backend && python3 main.py` (uvicorn --reload) | yes |
| Frontend| `cd frontend && npm run dev` (Vite HMR) | yes — HMR |

Both run in the foreground in a terminal. If you put them in the background, use `nohup ... &` or `tmux`.

## The OpenSpec loop (use it for non-trivial changes)

Anything that touches multiple files, adds a feature, or changes the API goes through OpenSpec. See `openspec-workflow.md` for details. Quick version:

```
/opsx:propose "what you want to build"
  → /opsx:apply
    → /opsx:archive
```

Skip this for typo fixes, doc tweaks, and one-line bug fixes.

## Branches

- `main` — protected, only merged via PR
- `feat/<short-name>` — new features
- `fix/<short-name>` — bug fixes
- `chore/<short-name>` — tooling, deps, non-functional

Branch off `main`. PR back to `main`. Delete the branch after merge.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: lazy-load Settings tab in MainLayout
fix: SSE chunks not flushing for >1KB messages
docs: clarify RAG retrieval thresholds
refactor: extract useToast hook out of ToastProvider
chore: bump vite to 5.4
```

English only. Imperative mood. ≤ 72 chars in the subject. Body explains **why**, not what.

## Running tests

```bash
# Frontend unit tests (vitest)
cd frontend && npm test
npm run test:ui    # interactive
npm run test:coverage

# Backend (when tests exist)
cd backend && pytest
```

## Linting

```bash
# Frontend — currently no enforced linter; ESLint config is a future TODO
cd frontend && npx tsc --noEmit      # type check only

# Backend
cd backend && python -m py_compile $(find . -name "*.py" -not -path "./.venv/*")
```

## Adding a new page

1. Create `frontend/src/pages/Foo.tsx` with a default export.
2. Add `const Foo = lazy(() => import('./pages/Foo'))` in `App.tsx`.
3. Add a `<Route>` inside the `<Suspense>`.
4. (Optional) Add a `nav` key to the i18n dict.
5. Add tests in `frontend/src/tests/`.

## Adding a new backend route

1. Decide which router file owns it (or create a new one in `backend/routes/`).
2. Use `current_user` (or `current_user_optional`) as a dependency if auth is required.
3. Pydantic models for request/response bodies — never `Dict[str, Any]`.
4. Data access through `repositories/`, not raw SQL in the route.
5. Mount the router in `main.py` if it's a new file.
6. Add a doc under `docs/api/`.

## Adding a vendor chunk

1. Edit the `manualChunks` function in `frontend/vite.config.ts`.
2. Run `npm run build` and check the chunk names in `dist/assets/`.
3. Confirm there are no circular chunk warnings.

## Debugging tips

- **Backend**: `LOG_LEVEL=DEBUG python3 main.py` enables verbose logs (RAG retrieval previews, SQL echoes).
- **Frontend**: React DevTools + Vite inspector. Add `console.log` freely in dev — strip before commit.
- **Network**: DevTools → Network → filter by `Fetch/XHR` or `EventStream`. Right-click an SSE request → "Copy as cURL" to replay from terminal.
- **Database**: `sqlite3 backend/data/app.db "SELECT * FROM users LIMIT 5;"`

## When you break something

1. `git status` — what did you change?
2. `git diff` — is the change what you intended?
3. `git stash` + restart services — does the issue reproduce on `main`?
4. If yes → open an issue. If no → bisect: `git bisect start; git bisect bad; git bisect good <commit>`.

## Code review checklist

- [ ] Tests pass
- [ ] Type check passes (`tsc --noEmit`)
- [ ] No new linter warnings
- [ ] Docs updated in the same PR (if user-facing or architectural)
- [ ] ADRs updated if a new design decision was made
- [ ] No secrets in code (check `.env.example` only)
- [ ] Bundle size impact checked (run `npm run build` and look at the dist)
