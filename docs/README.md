# Home Education Consulting — Documentation

> Single source of truth for everything in this repo.
> If something is missing or wrong here, **fix it here first**, then change the code.

## 📁 Structure

```
docs/
├── README.md                  ← you are here
├── architecture/              System design, stack choices, data flow
│   ├── overview.md            High-level system architecture
│   ├── frontend.md            React + Vite frontend deep-dive
│   ├── backend.md             Python + FastAPI backend deep-dive
│   └── data-flow.md           End-to-end request/response paths
├── guides/                    How to do things in this repo
│   ├── getting-started.md     First-time setup & local run
│   ├── development.md         Day-to-day dev workflow
│   ├── deployment.md          Deploy / restart services
│   └── openspec-workflow.md   How to use OpenSpec here
├── adr/                       Architecture Decision Records
│   ├── README.md              ADR index & template
│   └── NNNN-*.md              One file per decision, immutable
├── investigations/            Past bug investigations & post-mortems
│   └── password-reset-flow.md
└── api/                       API reference (auto-curated)
    ├── auth.md
    ├── chat.md
    └── settings.md
```

## 🎯 Audience

| Reader            | Start here                                  |
|-------------------|---------------------------------------------|
| New dev           | `guides/getting-started.md` → `architecture/overview.md` |
| Adding a feature  | `guides/openspec-workflow.md`               |
| Deploying         | `guides/deployment.md`                      |
| Reviewing design  | `adr/` → `architecture/`                    |
| Debugging         | `investigations/` → relevant module         |
| API consumer      | `api/`                                      |

## ✏️ Editing rules

1. **Docs are version-controlled.** Update them in the same PR as the code change.
2. **ADRs are immutable once accepted** — write a new ADR to supersede, never edit.
3. **No "TODO" in committed docs.** If you don't know, ask in the PR.
4. **Code examples must actually run.** Test them before committing.

## 🔗 Related

- `../openspec/` — Active and archived spec changes (proposal → tasks → archive)
- `../AGENTS.md` and `../CLAUDE.md` — Agent-facing instructions (kept identical via `scripts/sync-agent-docs.sh`)
- `../README.md` — Project pitch & quick links
