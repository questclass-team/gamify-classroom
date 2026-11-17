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

- `src/api/types.ts` – all request/response types (the proposed API contract).
- `src/api/client.ts` – `fetch` wrapper: JWT header, problem-details errors, 401 → logout.
- `src/auth/` – session (JWT in `sessionStorage`), `AuthProvider`, role guards.
- `src/mocks/` – MSW handlers and mock data, dev only.
- `src/styles/global.css` – Tailwind v4 `@theme` tokens (palette, fonts, radius, shadow). The
  default Tailwind palette is disabled: use only theme colors (`bg-surface`, `text-muted`, …).
- `src/components/ui.tsx` – shared building blocks (`Button`, `TextField`, `Alert`, `Table`,
  `Panel`, titles); pages compose these instead of repeating long class lists.
