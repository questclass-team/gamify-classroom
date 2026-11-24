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
- Design: Blask, light and dark, the only design of the app. `src/styles/blask.css` indexes the
  layer in `src/styles/blask/`: `tokens.css` (the `--color-blask-*` / `--font-blask-*` palette and
  fonts, the dark remap under `<html data-theme='dark'>`, the `dark:` variant; Tailwind's default
  palette is off), `base.css` (document, focus, selection), `kit.css` (type, panels, buttons,
  fields, chips, notices, toast, dialog, menu, tabs, breadcrumbs, tables, empty states),
  `shell.css` (header, theme switch), `parts.css` (rank stars and line, history line) and one file
  per area (`landing.css`, `student.css`, `teacher.css`); every class is prefixed `blask-`.
- Themes: `src/lib/theme.ts` stores the choice in `localStorage` (`qc:theme`, else the system
  setting) and keeps `data-theme` and `theme-color` in sync; `index.html` applies it before the
  first paint.
- Kit: `src/components/blask/` – `Button`/`LinkButton`, `TextField`/`TextArea`/`SelectField`/
  `Checkbox`, `Panel`, `PageHeader`, `Breadcrumbs`/`RouteTabs`, `Table`, `Dialog`/
  `BlaskConfirmDialog`, `EmptyState`/`LoadingState`, `BlaskNotice`, `ThemeSwitch`, `GroupCover`
  and the game marks (`Wordmark`, `Amount`, `BadgeMark`, `RankStar`, `RankProgress`, icons).
- Shell: `src/layout/AppShell.tsx` – the one shell of every signed-in page: wordmark, the role's
  links (admin Import kont, teacher and student Moje grupy), theme switch, account menu (students:
  nickname with the nickname dialog), Wyloguj, skip link and `<main>`; pages render only their
  content. `useShell()` shows a toast, `<ShellAside>` / `<ShellSubnav>` put page controls in the
  header. `src/layout/RootLayout.tsx` mounts smooth scrolling (Lenis + GSAP, `src/lib/`, a lazy
  chunk) per page.
- Landing: `src/pages/LoginPage.tsx` (`/login`, a lazy route) – the night-sky landing with the
  login card in its hero and the closing; its sections, WebGL skies (`src/lib/ShaderCanvas.tsx`)
  and copy live in `src/pages/landing/`.
- `src/pages/teacher/gameConfigValidation.ts` – currency/rank rules mirrored from the game
  service (unique, non-negative integer thresholds), covered by tests.
- `src/pages/teacher/awards/` – the "Nagrody" tab: awards to many students at once (one request
  per student, four at a time), inline badge creation, each student's history and badge revoke.
  Its rules (form validation, history order, result texts) are plain modules with tests.
- `src/pages/student/` – the student area: `/student` (one card per
  group, states fetched three at a time) and `/student/groups/:groupId` with the tabs Mój stan and
  Ranking (`?by=points|badges`). Nickname rules, ranking texts and progress wording are plain
  modules with tests. In the mocks `student` starts without a nickname; `pzielinski` is
  "Cichy Lis" (try it to see "Ten nick jest już zajęty").
