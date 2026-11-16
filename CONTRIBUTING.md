# Contributing to QuestClass

Short rules for the whole team. If something is unclear, ask in the team chat before you start.

## 1. Workflow

1. **Pick a work item in Jira** that is assigned to you (e.g. `SCRUM-7`). No work without a Jira item.
2. **Create a branch** from the latest `main` and move the item to **In Progress**.
3. **Commit** small, logical changes.
4. **Open a pull request** and move the item to **Testing**.
5. After approval and green CI, **squash-merge** the PR, delete the branch and move the item to **Completed**.

```sh
git checkout main
git pull
git checkout -b feature/SCRUM-7-ldap-login
```

## 2. Branches

Format: `<type>/<JIRA-KEY>-<short-description>` — lowercase, words separated by `-`.

| Type | Use for | Example |
|---|---|---|
| `feature/` | new functionality | `feature/SCRUM-11-story-currency` |
| `fix/` | bug fix | `fix/SCRUM-21-ranking-sort` |
| `docs/` | documentation only | `docs/SCRUM-30-readme` |
| `chore/` | config, CI, Docker, dependencies | `chore/SCRUM-25-ci-pipeline` |

The Jira key in the name links the branch to the work item automatically.

## 3. Commits

Format: `<JIRA-KEY> <type>(<scope>): <what changed>` — English, imperative mood, max ~72 characters.

```
SCRUM-7 feat(core): add LDAP authentication
SCRUM-12 fix(game): prevent negative currency balance
SCRUM-25 chore(infra): add PostgreSQL healthcheck
```

| Type | Meaning |
|---|---|
| `feat` | new feature |
| `fix` | bug fix |
| `refactor` | code change without new behavior |
| `test` | tests only |
| `docs` | documentation only |
| `chore` | build, CI, Docker, dependencies |

Scopes: `core`, `game`, `frontend`, `infra`, `docs`.

## 4. Pull requests

- **One Jira item = one PR.** Keep it small: under ~400 changed lines is ideal.
- **Title:** `SCRUM-7 LDAP login`.
- **Description:** what changed, how to test it, screenshots for UI changes.
- **Before requesting review:** CI is green, the branch is up to date with `main`, you tested it yourself.
- **Merging:** 1 approval required, all review comments resolved, **squash merge only**.
- Direct pushes to `main` are blocked.

## 5. Code review

| Area | Reviewer |
|---|---|
| `services/core` | Kiryl ↔ Kajetan |
| `services/game` | Piotr ↔ Artem ↔ Mykyta |
| `frontend` | Artem ↔ Mykyta |
| `infra`, `.github`, `docker-compose.yml` | Kajetan ↔ Mykyta |

Review within **24 hours**. Be specific: point to the line, explain why, suggest a fix. Approve only code you understand.

## 6. Code style and tests

| Service | Formatting / linting | Tests |
|---|---|---|
| Core (C#) | `dotnet format` | `dotnet test` |
| Game (Python) | `ruff check` + `ruff format` | `pytest` |
| Frontend (TS) | `npm run lint` + Prettier | `npm test` |

- New logic comes with tests.
- CI runs all of the above on every PR. A red CI blocks the merge.

## 7. API changes

If you change an endpoint, update its OpenAPI description and `docs/api.md` **in the same PR**, and tell the frontend in the PR description.

## 8. Security

- **Never commit** `.env`, passwords, keys, tokens or real student data.
- Use only dummy values in `.env.example`.
- Committed a secret by mistake? Tell the team immediately — the secret must be changed, deleting the commit is not enough.

## 9. AI tools

- AI assistants may be used as helpers. **You are the author**: you read, understand and test every line before committing.
- AI tools must never commit or push on their own.
- No `Co-authored-by` AI trailers or "Generated with ..." lines in commits and PRs.
- AI configuration files (`.claude/`, `.cursor/`, `AGENTS.md`, etc.) are git-ignored and stay local.

## 10. Definition of Done

A work item is **Completed** when:

- [ ] the code is merged into `main`,
- [ ] CI is green,
- [ ] tests for the new logic exist and pass,
- [ ] the acceptance criteria from Jira are met,
- [ ] documentation is updated if behavior or API changed.