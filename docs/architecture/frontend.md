# Frontend Architecture

## Stack

- **React 18** + **TypeScript** (strict)
- **Vite 5** — dev server + bundler
- **React Router v6** — client-side routing
- **Zustand** — state management (auth, theme, toast)
- **Tailwind CSS** — styling
- **react-markdown** + **remark-gfm** — chat message rendering
- **axios** — HTTP client
- **lucide-react** — icons
- **date-fns** — date formatting
- **Vitest** + **@testing-library/react** — unit tests (jsdom)

## Directory layout

```
frontend/
├── index.html
├── vite.config.ts           # manual chunks, dev server, proxy
├── package.json
└── src/
    ├── main.tsx             # React root, mounts <App>
    ├── App.tsx              # Router + lazy page imports
    ├── index.css            # Tailwind + globals
    ├── api/
    │   └── client.ts        # HTTP + SSE client
    ├── components/          # Reusable UI (Toast, MessageBubble, ...)
    ├── hooks/               # useAuth, useTheme, useSwipe, ...
    ├── i18n/                # Translation strings
    ├── pages/               # Route-level components (all lazy)
    │   ├── Login.tsx
    │   ├── Register.tsx
    │   ├── VerifyEmail.tsx
    │   ├── ConfirmDelete.tsx
    │   ├── ResetPassword.tsx
    │   ├── MainLayout.tsx   # Holds Chat/History/Settings tabs
    │   ├── Chat.tsx
    │   ├── History.tsx
    │   └── Settings.tsx
    ├── store/               # Zustand stores
    │   ├── authStore.ts
    │   ├── themeStore.ts
    │   └── toastStore.ts
    └── tests/
```

## Routing

All pages are lazy-loaded in `App.tsx`:

```tsx
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
// ...
```

Wrapped in a single `<Suspense fallback={<PageLoader />}>` near the router root.

`MainLayout` itself is lazy too, and inside it Chat/History/Settings are independently lazy so a user can land on `/chat` without downloading the other two tabs.

## Vite config — manual chunks

`vite.config.ts` splits vendor code so cache busts are surgical:

| Chunk              | Contains                                           |
|--------------------|----------------------------------------------------|
| `vendor-react`     | react, react-dom, react-router-dom                 |
| `vendor-markdown`  | react-markdown, remark-gfm                         |
| `vendor-state`     | zustand                                            |
| `vendor-api`       | axios                                              |
| `vendor-icons`     | lucide-react                                       |
| `vendor-date`      | date-fns                                           |
| `vendor-misc`      | catch-all for other node_modules                   |

Build settings:
- `minify: 'esbuild'` (Vite 5 default — explicit for clarity)
- `target: 'es2020'` — modern JS, smaller output
- `cssCodeSplit: true` — CSS bundled per route
- `manifest: true` — emits `.vite/manifest.json` for caching

## Dev server & proxy

`vite.config.ts` exposes the dev server on `0.0.0.0:7194` and proxies `/api/*` to `http://localhost:3001`, **stripping the `/api` prefix** before forwarding.

`allowedHosts` whitelists the public domains:
- `home-edu.make-it.com.cn`
- `82.157.28.69`
- `10.8.0.34`

SSE responses get extra headers injected (`x-accel-buffering: no`, `cache-control: no-cache`) so chunks reach the browser immediately.

## State management

Zustand stores are tiny (no Redux ceremony):

```ts
// store/authStore.ts
export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  loadFromStorage: () => {
    const token = localStorage.getItem('token')
    if (token) set({ token })
  },
  // ...
}))
```

Persist anything sensitive in `localStorage` carefully — never store plaintext passwords or OTP codes.

## Theming & i18n

- **Theme**: `useTheme('light' | 'dark' | 'system')` toggles a class on `<html>`. Tailwind dark variants (`dark:bg-gray-950`) consume it.
- **i18n**: `useTranslation()` hook reads from a small key/value dict in `src/i18n/`. zh-CN is the default; English is a stretch goal.

## Conventions

- One page per file in `pages/`. Each page is the default export.
- Reusable UI lives in `components/` and is named exports.
- Custom hooks are `useFoo.ts` files exporting `useFoo`.
- API calls go through `api/client.ts` — never `axios` directly from a component.
- No default exports except for page-level components (matches React Router `lazy()` ergonomics).
