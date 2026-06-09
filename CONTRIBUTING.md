# Contributing to Shamagama

Thanks for your interest in contributing. This document covers the workflow, conventions, and quality bars for getting changes into `main`.

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](./CODE_OF_CONDUCT.md). Please read it before opening an issue or pull request.

## Project Overview

Shamagama is a full-stack TypeScript application:

- **Backend** — Express + Mongoose, ES modules, MongoDB Atlas. See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md).
- **Frontend** — React 18 + Vite + Tailwind, hooks-based. See [docs/ARCHITECTURE.md#6-frontend--pages--components](./docs/ARCHITECTURE.md).
- **Pipelines** — AI auto-answer, FAQ audit, search, Zoom ingestion. See [docs/PIPELINES.md](./docs/PIPELINES.md).

Start with the [Vision section in the README](./README.md#vision) — every contribution should ladder up to the core goal: automate the FAQ lifecycle end-to-end, zero people in the loop.

## Local Setup

```bash
# Clone and install
git clone https://github.com/vicharanashala/cs15
cd cs15
cd backend && npm install
cd ../frontend && npm install
cd ..

# Run the full stack (env setup, ngrok, backend + frontend)
./run.sh
```

`run.sh` prompts for `MONGODB_URI` and `JWT_SECRET` on first run, then saves them to `backend/.env.local`. The script will not overwrite existing values.

If you prefer to run the services manually:

```bash
# Terminal 1 — backend on :6767
cd backend && npm run dev

# Terminal 2 — frontend on :5173
cd frontend && npm run dev
```

### Required env vars

| Variable | Required | Notes |
|---|---|---|
| `MONGODB_URI` | yes | MongoDB Atlas connection string |
| `JWT_SECRET` | yes | At least 32 bytes (`openssl rand -hex 32`) |
| `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `XAI_API_KEY` / `MINIMAX_API_KEY` | one of | At least one AI provider key — pipelines auto-detect |
| `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | for Zoom | From Zoom Marketplace |
| `ZOOM_WEBHOOK_SECRET_TOKEN` | for prod | Webhook HMAC verification — fail-closed without it |
| `CLOUDINARY_*` | for uploads | Cloud name + API key + secret |

See [docs/ARCHITECTURE.md#10-env-variables-reference](./docs/ARCHITECTURE.md#10-env-variables-reference) for the full list.

## Workflow

1. **Find or open an issue** describing the change. Label it (`bug`, `enhancement`, `pipeline`, `frontend`, `docs`, etc.).
2. **Branch from `main`** using a descriptive name:
   - `fix/handle-empty-transcript`
   - `feat/zoom-retry-dlq`
   - `docs/architecture-overview`
   - `refactor/split-thread-detail`
3. **Make the change.** Keep PRs focused — one logical change per PR.
4. **Run quality checks locally** (see below).
5. **Open a PR** targeting `main`. Reference the issue with `Closes #N` or `Refs #N`.
6. **Wait for review.** Address feedback. Approval + green CI = merge.

## Pull Request Quality Bar

Every PR should:

- **Implement only what the issue describes.** No unrelated refactors, no "while I'm here" cleanups. If you spot something broken but unrelated, note it in the PR description — do not fix it in the same change.
- **Add or update tests** for backend logic. New controllers / routes / utils should have unit tests where feasible.
- **Update docs** if the change touches architecture, public APIs, env vars, or pipeline behaviour. The relevant `docs/*.md` file should reflect the new state in the same PR.
- **Run `tsc --noEmit`** in `backend/` and `frontend/`. Both must be clean.
- **Be mergeable cleanly.** If your branch drifts, rebase onto `main` before review.

## Code Style

### Backend (TypeScript / Express)

- **ESM with `.js` extensions on all relative imports:**
  ```ts
  import { chat } from '../utils/aiProvider.js';   // good
  import { chat } from '../utils/aiProvider';      // bad
  ```
- **No dynamic `require()`.** All imports at the top of the file. ESM does not support `require()` in functions.
- **No bare `catch (e) { console.error(e); }`.** Use `logger.warn` / `logger.error` for background failures, or `friendlyError(err, 'fallback message')` for user-facing actions.
- **Validate request bodies with Zod** via the `validateBody(schema)` middleware on every mutating route.
- **Use the shared AI provider system.** Never hardcode `chat('openai', ...)` in pipeline controllers. See [docs/AI_PROVIDERS.md](./docs/AI_PROVIDERS.md).
- **Use shared pipeline utilities** for auto-answer and FAQ audit: `searchKnowledgeWithFallback`, `triageByScore`, `buildAuditMetaUpdate`, `logPipelineEvent`, `isSensitiveContent` from `utils/pipelineCommon.js`.
- **Run scheduler / retry logic through `PipelineResult`.** Every pipeline outcome should write a result record with `pipeline`, `targetModel`, `targetId`, `score`, `verdict`, `flagged`, `checkedAt`.

### Frontend (React / TypeScript)

- **Functional components + hooks.** No class components.
- **Guard auth-gated fetches on `isAuthenticated`, not `user !== null`.** The `useAuth` hook flips `isAuthenticated` only after `/auth/me` confirms the token; gating on `user` causes race-condition 401s.
- **Derived state before functions that use it.** TypeScript TDZ: `const canEdit = isAuthor && !isExpert` requires `isExpert` to be declared earlier in the same scope.
- **Avoid multi-patch refactors on deeply nested JSX.** The token-shifting breaks closing-tag structure. For structural multi-replacement work, use `write_file` to rewrite the whole component.
- **Run `npx tsc --noEmit`** before committing. Zero errors.

## Quality Checks Before Commit

```bash
# Type check (must be clean)
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit

# Tests
cd backend && npm test
cd ../frontend && npm test
```

## Working on Pipelines

The two automated pipelines (auto-answer, FAQ audit) and the Zoom ingestion pipeline are the highest-leverage parts of the codebase. Before touching them, read:

- [docs/PIPELINES.md](./docs/PIPELINES.md) — flows, env vars, thresholds
- [docs/AI_PROVIDERS.md](./docs/AI_PROVIDERS.md) — per-pipeline provider resolution
- `backend/utils/pipelineCommon.ts` — shared utilities
- `backend/models/PipelineResult.ts` — unified result log

Pitfalls:

- **Route prefix when adding admin pipeline routes.** Files under `backend/routes/admin*.ts` mount at `/api/admin`. The router path MUST include the full segment. `router.get('/auto-answer/queue', ...)` creates `/api/admin/auto-answer/queue` — correct. `router.get('/queue', ...)` creates `/api/admin/queue` — wrong, silently 404s.
- **Process-post scope nesting in `autoAnswerController`.** `processPost` is an inner function inside `runScheduledAutoAnswer`. Helpers it uses (like `logResult`) MUST be declared at the same scope level — not on the outer scope. Multi-patch operations on this file corrupt the indentation; use `write_file` if you're doing structural work.
- **Per-pipeline AI provider config.** Always use `getPipelineProviderConfig(pipeline)` + `chatWithConfig(cfg, messages)`. Never `chat('openai', ...)`.

## Working on Search

The hybrid search pipeline (vector + keyword + RRF) lives in `backend/controllers/searchController.ts` and `backend/utils/search.ts`. Known constraints:

- `POST /api/search` is **public** (no `protect`). The frontend SearchBar sends no JWT.
- The LRU cache is in-memory and per-instance — does not survive restarts and is useless on serverless multi-instance deploys. Upstash Redis is the multi-instance cache when configured.
- `applySearchThreshold` accepts a `thresholds` parameter but currently ignores it; filtering is hardcoded to `textScore > 0 || vectorScore >= 0.80`. Don't rely on per-call thresholds.

## Documentation

If your change touches:

- A new route, controller, model, or service — update `docs/ARCHITECTURE.md`
- A pipeline (auto-answer, FAQ audit, search, Zoom) — update `docs/PIPELINES.md`
- AI provider configuration — update `docs/AI_PROVIDERS.md`
- A new env var — update `docs/ARCHITECTURE.md#10-env-variables-reference`
- A new public-facing feature or behaviour — update `README.md`

Docs and code in the same PR is the norm. Out-of-date docs are a bug.

## Commit Messages

- Imperative mood, present tense: "Add", "Fix", "Refactor", not "Added" or "Fixes".
- First line: ≤ 72 characters, no period.
- Body: explain WHY, not WHAT. Reference issues.
- Examples:
  - `fix: prevent orphaned data on user soft-deletion`
  - `feat: add retry + dead-letter queue for Zoom ingestion`
  - `docs: expand admin dashboard analytics section in README`

## Reporting Issues

When opening an issue, include:

- **Environment** — Node version, OS, `npm --version`, branch / commit SHA.
- **Steps to reproduce** — exact commands, inputs, expected vs actual output.
- **Relevant logs** — backend logs from `logs/session_*.txt`, browser console, network tab.
- **Screenshots** — for UI bugs, the rendered state and what you expected.

For security issues, do NOT open a public issue. Email the maintainers directly (see GitHub repo settings for contact info).

## Questions?

Open a discussion on GitHub, or check the [docs/](./docs/) directory for architecture and pipeline references.
