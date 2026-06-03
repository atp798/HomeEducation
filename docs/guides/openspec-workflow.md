# OpenSpec Workflow

OpenSpec is a spec-driven development framework. For any non-trivial change, we **write the spec first, get review, then implement**.

## When to use OpenSpec

✅ Use it for:
- New features (endpoints, pages, services)
- Changes that touch multiple files
- Schema or API contract changes
- Anything that benefits from a written design before code

❌ Skip it for:
- Typo fixes
- One-line bug fixes
- Doc-only changes
- Dependency bumps

## The four commands

OpenSpec is installed at `OpenSpec/` in this repo and linked globally as `openspec`. After `openspec init`, the following slash commands are available in your AI coding agent:

| Command            | Purpose                                                |
|--------------------|--------------------------------------------------------|
| `/opsx:propose`    | Create a new change: proposal → specs → design → tasks |
| `/opsx:apply`      | Implement the change task by task                      |
| `/opsx:archive`    | Mark the change done; move it to `openspec/changes/archive/` |
| `/opsx:explore`    | Brainstorm a change before committing to a proposal    |

## The lifecycle

```
                  /opsx:propose "add dark mode"
                            │
                            ▼
            ┌──────────────────────────────┐
            │ openspec/changes/add-dark-   │
            │ mode/                         │
            │   proposal.md   (why)         │
            │   tasks.md      (checklist)   │
            │   design.md     (how)         │
            │   specs/                      │
            │     <capability>/             │
            │       spec.md   (what)        │
            └────────────┬─────────────────┘
                         │  review + iterate
                         ▼
                   /opsx:apply
                         │
                         ▼  (tasks get done one by one)
                   /opsx:archive
                         │
                         ▼
            openspec/changes/archive/   (immutable)
```

## Directory layout

```
openspec/
├── config.yaml                       # Project context & rules
├── specs/                            # Current "source of truth" specs
│   └── <capability>/
│       └── spec.md                   # What the system does (delta-format)
└── changes/                          # Proposed / in-progress changes
    ├── <change-id>/
    │   ├── proposal.md
    │   ├── tasks.md
    │   ├── design.md
    │   └── specs/<capability>/spec.md  # delta against current spec
    └── archive/                      # Completed changes
```

## Writing a good proposal

1. **Title** — `<verb> <thing>` (e.g., "Add user profile avatars").
2. **Why** — one paragraph: what problem are we solving, who is affected.
3. **What changes** — list the affected files / modules.
4. **Rollback plan** — how to undo if needed.
5. **Non-goals** — what this change does NOT do.

See `openspec/config.yaml` for the rules we enforce (max 500 words, etc.).

## Writing good specs

Specs use the **delta format** with `## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements` sections. Each requirement is written in Given/When/Then format:

```markdown
## ADDED Requirements

### Requirement: User can reset their password via email
The system SHALL allow a logged-out user to request a password reset by email.

#### Scenario: User requests reset
- **WHEN** the user submits a valid email at `/reset-password`
- **THEN** the system sends an email with a single-use token
- **AND** the token expires after 1 hour
```

## Daily flow

```bash
# Start a new feature
/opsx:propose "rate-limit chat messages per session"

# AI drafts proposal + design + tasks + spec deltas
# You review and edit

# Once you're happy with the design
/opsx:apply

# AI works through tasks.md, marking them off
# You review each commit

# When done
/opsx:archive
```

## Tips

- **Edit `config.yaml`** when project conventions change — it injects into every artifact.
- **Don't skip the spec.** Even if you "know" what to do, the spec is the contract for future contributors.
- **Archive promptly.** Stale `changes/` clutter makes it hard to find what's actually in flight.
- **Reference ADRs** in `docs/adr/` for big design choices; OpenSpec tracks the what/why, ADRs track the trade-off.
