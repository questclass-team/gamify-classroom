# Frontend (React + TypeScript + Vite + Tailwind CSS)

Student, teacher and admin views.
Owners: Artem, Mykyta.

## Run

```sh
npm install
npm run dev        # http://localhost:5173
```

In dev mode the API is mocked in the browser with [MSW](https://mswjs.io) (`src/mocks`).
Demo accounts (password `haslo`): `admin`; teachers `nauczyciel`, `mwisniewski` (each sees
only own groups); students `student`, `pzielinski`, `kwojcik`. `nowy` is an LDAP account that
was not imported (login rejected with 403). Accounts imported from CSV as admin can log in with
the same password; mock data lives in memory and resets on page reload.

To use the real backend, create `.env.local` (see `.env.example`):

```sh
VITE_USE_MOCKS=false
VITE_API_TARGET=http://localhost:8080   # nginx from docker compose
```

Production builds never include the mocks.

## Scripts

| Command                | What it does                  |
| ---------------------- | ----------------------------- |
| `npm run dev`          | dev server with mocks         |
| `npm run build`        | type-check + production build |
| `npm run lint`         | oxlint                        |
| `npm run format`       | Prettier (write)              |
| `npm run format:check` | Prettier (check, for CI)      |
| `npm test`             | Vitest                        |

## Structure

- `src/api/types.ts` – all request/response types (the proposed API contract for core and game).
- `src/api/client.ts` – `fetch` wrapper: JWT header, problem-details errors. On 401 it refreshes the
  access token once (`POST /api/core/auth/refresh`, the HttpOnly cookie is sent by the browser) and
  repeats the request; parallel 401s share one refresh. Only a failed refresh logs the user out.
- `src/api/useApiData.ts` – load-on-mount hook with abort, retry and local updates.
- `src/auth/` – session (access token in `sessionStorage`, refresh token only in the HttpOnly cookie),
  `AuthProvider` (renews the token 30 s before it expires, restores the session in a new tab from the
  cookie, logout also ends the session on the server), role guards.
- `src/mocks/` – MSW handlers and mock data, dev only.
- `src/styles/global.css` – Tailwind v4 `@theme` tokens (palette, fonts, radius, shadow) and the
  few component styles that are clearer as CSS (`.data-table`, breadcrumbs, `<dialog>`). The
  default Tailwind palette is disabled: use only theme colors (`bg-surface`, `text-muted`, …).
- `src/components/ui.tsx` – shared building blocks (`Button`, `TextField`, `Alert`, `Table`,
  `Panel`, titles); pages compose these instead of repeating long class lists. `Table` rows turn
  into labelled cards in narrow containers (`data-label` on cells).
- `src/pages/teacher/gameConfigValidation.ts` – currency/rank rules mirrored from the game
  service (unique, non-negative integer thresholds), covered by tests.
- Blask, the design of the new screens (teacher "Nagrody" tab, later the student views), is an
  opt-in layer: put the `blask` class on a page's root and the older pages keep their look.
  Palette and fonts are the `--color-blask-*` / `--font-blask-*` tokens in `global.css`
  (`text-blask-graphite`, `bg-blask-paper`, …); `src/styles/blask.css` holds the scope (Figtree,
  ink, cobalt focus ring, reduced motion) and the kit classes (`blask-panel`, `blask-btn`,
  `blask-input`, `blask-chip`, `blask-display`, …); `src/components/blask/` the shared parts
  (currency mark and amount, badge marks, rank star and progress line, notice, confirm dialog).
- `src/pages/teacher/awards/` – the "Nagrody" tab: awards to many students at once (one request
  per student, four at a time), inline badge creation, each student's history and badge revoke.
  Its rules (form validation, history order, result texts) are plain modules with tests.
