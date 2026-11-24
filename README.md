<div align="center">
  <img src="docs/assets/login.png" alt="QuestClass: start screen with the faculty login" width="100%">

  <h3 align="center">QuestClass</h3>
  <p align="center"><i>Gamification platform for university classes · WMiI UAM</i></p>

  <p>
    <kbd>ASP.NET CORE</kbd> ✛ <kbd>DJANGO REST</kbd> ✛ <kbd>REACT FRONTEND</kbd> ✛ <kbd>POSTGRESQL</kbd>
  </p>
</div>

**Project description:** QuestClass replaces the spreadsheets that teachers use to run gamified classes. A teacher configures a story, currencies, ranks, badges and a bonus shop for each class group and awards students in a few clicks. Students log in with their faculty account, track their progress, see anonymous rankings by nickname and know exactly what every reward means for their final grade.

> [!NOTE]
> This is a team project for the *Software Engineering* course at Adam Mickiewicz University, Poznań. Goal for the current semester: **MVP**. The structure below shows the current layout; parts of milestone 2 (bonus shop, grading rules, export) are not built yet.

### Built With

- ![C#](https://img.shields.io/badge/C%23-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
- ![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-512BD4?style=for-the-badge&logo=dotnet&logoColor=white)
- ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
- ![Django](https://img.shields.io/badge/Django_REST-092E20?style=for-the-badge&logo=django&logoColor=white)
- ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
- ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
- ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
- ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
- ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
- ![Nginx](https://img.shields.io/badge/Nginx-009639?style=for-the-badge&logo=nginx&logoColor=white)
- ![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)
- ![Jira](https://img.shields.io/badge/Jira-0052CC?style=for-the-badge&logo=jira&logoColor=white)

**Technology stack:**
- **Core service** (identity & groups): C#, .NET 10, ASP.NET Core, Entity Framework Core, LDAP authentication (faculty LABS domain), JWT.
- **Game service** (gamification logic): Python, Django, Django REST Framework, Django ORM, uv.
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4 in the **Blask** design (light and dark theme): a landing page with the login, then separate views for students, teachers and administrators. In development it runs on MSW mocks, no backend needed.
- **Database:** PostgreSQL, separate schema per service.
- **Infrastructure:** Docker Compose, nginx reverse proxy, OpenLDAP test directory, GitHub Actions CI/CD.
- **Communication:** HTTP/REST (JSON), contracts described with OpenAPI.
- **Project management:** Jira (Scrum, weekly sprints), GitHub pull requests with code review.

<div align="center">
  <h1>QUESTCLASS STRUCTURE</h1>
</div>

<hr>

<details open>
  <summary><kbd>🏰 ROOT</kbd> <b><code>/gamify-classroom</code></b> ── <i>QuestClass Architecture</i></summary>

  <blockquote>
    <details open>
      <summary>🟦 <kbd>📁 services/core</kbd> ── <i>Identity & Groups (ASP.NET Core) 🔐</i></summary>
      <blockquote>
        🔑 <code>Features/Auth/</code> ── LDAP login, JWT and refresh tokens, roles<br>
        📥 <code>Features/Users/</code> ── CSV account import, student profile (nickname, avatar)<br>
        👥 <code>Features/Groups/</code> ── class groups, membership, a student's groups, group roster by nickname<br>
        🔎 <code>Features/Students/</code> ── student search for teachers<br>
        🧪 <code>tests/</code> ── xUnit tests<br>
        🐳 <code>Dockerfile</code> ── service container
      </blockquote>
    </details>
    <details open>
      <summary>🟩 <kbd>📁 services/game</kbd> ── <i>Gamification Engine (Django REST) 🎲</i></summary>
      <blockquote>
        ⚙️ <code>config/</code> ── Django settings, JWT validation<br>
        🔗 <code>common/</code> ── routes, permissions, Core client (membership and roster)<br>
        💎 <code>gamification/</code> ── currency and ranks, awarding points and badges, history, student state, rankings by nickname<br>
        🧪 <code>tests/</code> ── pytest<br>
        🔥 <b><kbd>manage.py</kbd></b> ── <i>Django entry point</i>
      </blockquote>
    </details>
    <details open>
      <summary>🟨 <kbd>📁 frontend</kbd> ── <i>Web UI (React + Vite) 🖥️</i></summary>
      <blockquote>
        🌌 <code>src/pages/landing/</code> ── start page with the login (sky, beam, night chapters)<br>
        🎓 <code>src/pages/student/</code> ── my groups, my state (balance, rank, history, badges), ranking<br>
        🧑‍🏫 <code>src/pages/teacher/</code> ── groups, students, awards, points and ranks<br>
        🛡️ <code>src/pages/admin/</code> ── account import<br>
        ✨ <code>src/styles/blask/</code>, <code>src/components/blask/</code> ── Blask design layer: tokens, themes, kit components<br>
        🧭 <code>src/layout/</code> ── app shell for every role<br>
        🎭 <code>src/mocks/</code> ── MSW mocks of every API endpoint
      </blockquote>
    </details>
    <details>
      <summary>🟪 <kbd>📁 infra</kbd> ── <i>Environment 🐳</i></summary>
      <blockquote>
        🌐 <code>nginx/</code> ── reverse proxy (<code>/api/core</code>, <code>/api/game</code>, <code>/</code>)<br>
        👤 <code>ldap/</code> ── test LDAP directory and test accounts<br>
        🗄️ <code>postgres/</code> ── database init, schemas <code>core</code> and <code>game</code>
      </blockquote>
    </details>
    <details>
      <summary>📚 <kbd>📁 docs</kbd> ── <i>Documentation 📖</i></summary>
      <blockquote>
        🧭 <code>vision/</code> ── project vision and requirements<br>
        📡 <code>api.md</code> ── Core and Game API reference<br>
        🗺️ <code>diagram/</code> ── C4 context and container diagrams<br>
        🖼️ <code>assets/</code> ── README images
      </blockquote>
    </details>
    <details open>
      <summary>📜 <kbd>DIRECTIVES</kbd></summary>
      <blockquote>
        🐳 <code>docker-compose.yml</code> ── whole stack in one command<br>
        🔐 <code>.env.example</code> ── configuration template (never commit <code>.env</code>)<br>
        🤖 <code>.github/workflows/</code> ── CI: build, tests, linters<br>
        📑 <code>CONTRIBUTING.md</code> ── team workflow and conventions<br>
        📖 <code>README.md</code> ── main documentation
      </blockquote>
    </details>
  </blockquote>
</details>
<hr>

# 🚀 Quick start

You only need **Git** and **Docker** (Docker Desktop on macOS/Windows) to run the whole stack.
It needs **Docker Engine 25+** with **Compose v2.20+** (Docker Desktop 4.27 or newer); check with `docker version` and `docker compose version`.

> [!NOTE]
> **Windows:** clone the repository inside WSL 2 or set `git config --global core.autocrlf input` before cloning. Shell scripts with Windows line endings (`CRLF`) break inside Linux containers.
> **Ports:** the stack uses port `8080` (nginx), `5432` (PostgreSQL) and `389` (LDAP). If something on your machine already uses one of them, change `NGINX_PORT`, `POSTGRES_PORT` or `LDAP_PORT` in `.env`.

## 1. Clone and configure

```sh
git clone https://github.com/questclass-team/gamify-classroom.git
cd gamify-classroom
cp .env.example .env
```

> [!CAUTION]
> Never commit `.env`, passwords, keys or real student data. Use only the dummy values from `.env.example` for development.

Core and Game share the `JWT_SECRET` environment variable. It is used by Core
to issue HS256 access tokens and by Game to validate them.

## 2. Run the stack

```sh
docker compose up --build
```

The first build takes a few minutes. When all containers are healthy, open:

| Service | URL |
|---|---|
| 🖥️ Frontend | http://localhost:8080 |
| 🟦 Core API docs | http://localhost:8080/api/core/swagger |
| 🟩 Game API docs | http://localhost:8080/api/game/docs |

Core and Game database migrations are applied automatically on every start by the one-shot `core-migrate` and
`game-migrate` containers.

> [!NOTE]
> Open the stack on `http://localhost`. The login session cookie is `Secure`, and browsers accept it over plain
> HTTP only on `localhost`: from another device (`http://<your-ip>:8080`) you would be logged out after 15 minutes.

## 3. Log in

The test LDAP server ships with ready accounts, the same ones the frontend mocks use. Every password is `haslo`.

| Role | Login |
|---|---|
| 🛡️ Admin | `admin` |
| 🧑‍🏫 Teacher | `nauczyciel`, `mwisniewski` |
| 🎓 Student | `student`, `pzielinski`, `kwojcik` and others from [`infra/ldap/sample-import.csv`](infra/ldap/sample-import.csv) |
| 🚫 Not imported | `nowy` (valid in LDAP, but login is rejected with 403) |

LDAP only checks the password; roles come from the CSV import. Import [`infra/ldap/sample-import.csv`](infra/ldap/sample-import.csv) as admin to get the roles above.

These accounts exist only in the local test directory. In production, users log in with their faculty **LABS** account.

## 4. Everyday commands

| Task | Command |
|---|---|
| Stop the stack | `docker compose down` |
| Reset the database and LDAP | `docker compose down -v` |
| View logs of one service | `docker compose logs -f game` |
| Check game migrations | `./services/game/scripts/manage.sh migrate --check` |
| Run core tests | `dotnet test services/core/QuestClass.Core.slnx` |
| Run game checks | `./services/game/scripts/manage.sh check` |
| Run game tests | `cd services/game && uv run pytest` |
| Run frontend tests | `cd frontend && npm test` (the frontend is built into the nginx image) |

## 5. Update to the latest version

```sh
git checkout main
git pull
docker compose up --build
```

Run the migration command from step 4 if the game service models changed.

---

## 🛠️ Local development without Docker

Run a single service on your machine for faster feedback. Keep the rest of the stack in Docker:

```sh
docker compose up postgres ldap
```

<details>
<summary><b>🟦 Core service</b> — .NET 10 SDK</summary>

```sh
cd services/core
dotnet restore
dotnet run --project src
```

Database, LDAP and migrations: see [`services/core/README.md`](services/core/README.md#run-locally).
</details>

<details>
<summary><b>🟩 Game service</b> — Python 3.12 + uv</summary>

```sh
cd services/game
uv sync
uv run python manage.py migrate
uv run python manage.py runserver
```
</details>

<details>
<summary><b>🟨 Frontend</b> — Node.js LTS</summary>

```sh
cd frontend
npm ci
npm run dev
```

It opens on http://localhost:5173 with MSW mocks, so no backend is needed; the demo accounts above work with the password `haslo`. To use the real stack instead, run it with `VITE_USE_MOCKS=false VITE_API_TARGET=http://localhost:8080 npm run dev`.
</details>

> [!TIP]
> Something does not start? Check `docker compose ps` and `docker compose logs <service>` first. If it is still broken, open an issue or ask in the team chat.

---

# 🗺️ Roadmap

- [x] **Milestone 1 — System core** *(mid-semester)*
  - [x] LDAP login, roles and refresh tokens · `SCRUM-7`, `SCRUM-20`
  - [x] CSV account import · `SCRUM-7`, `SCRUM-20`
  - [x] Class groups and their students · `SCRUM-23`, `SCRUM-24`, `SCRUM-26`
  - [x] Group currency and ranks with thresholds · `SCRUM-28`, `SCRUM-29`, `SCRUM-30`
  - [x] Awarding points, with history · `SCRUM-32`, `SCRUM-34`
  - [x] Badges: create, award, revoke · `SCRUM-33`, `SCRUM-34`
- [ ] **Milestone 2 — MVP** *(end of semester)*
  - [x] Student profile: nickname · `SCRUM-36`
  - [ ] Student avatar from a ready-made set · `SCRUM-36` (API ready, picker in the UI next)
  - [x] Student state in a group and rankings by nickname · `SCRUM-37`, `SCRUM-38`
  - [x] Blask design across the whole app · `SCRUM-39`
  - [ ] Bonus shop · `SCRUM-12`
  - [ ] Link between rewards and grading rules · `SCRUM-13`
  - [ ] CSV export of results · `SCRUM-14`
  - [ ] Demo for the client and basic documentation

---

# 🤝 Workflow

| Rule | Example |
|---|---|
| Every change starts from a Jira work item | `SCRUM-7` |
| Branch name contains the work item key | `feature/SCRUM-7-ldap-login` |
| Commit message contains the key | `SCRUM-7 feat(core): add LDAP authentication` |
| Changes reach `main` only via pull request | 1 approval required, CI must pass |

The Jira key in branch, commit or PR names links the code to the work item automatically. Full rules: [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

# 👥 Team

| Member | Role |
|---|---|
| **Mykyta Kyslytsia** ([@NdtFoxy](https://github.com/NdtFoxy)) | Frontend (student views), backend (rankings, export), code review, task organization |
| **Kiryl Kavaliou** ([@Kierish](https://github.com/Kierish)) | Backend — core service (.NET), client contact |
| **Piotr Codogni** ([@PiotrCodogni](https://github.com/PiotrCodogni)) | Backend — game service (Django): gamification config, grading rules |
| **Artem Isianov** ([@A-tik-dev](https://github.com/A-tik-dev)) | Frontend (teacher & admin views), backend (rewards, shop) |
| **Kajetan Muczyński** ([@KajetanMuczynski](https://github.com/KajetanMuczynski)) | DevOps & testing |

**Client:** Wojciech Wawrzyniak (WMiI UAM) · **Topic author:** Marcin Szczepański (WMiI UAM)

---

# 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
