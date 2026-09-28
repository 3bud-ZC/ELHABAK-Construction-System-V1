# ELHABAK Construction System V1

## Overview

ELHABAK Construction System V1 is a custom project management platform for ELHABAK
Construction (الحباك للاستشارات الهندسية). It centralizes company projects, clients, design
approvals, site progress, finance visibility, document control, project chat, and worker
uploads behind role-based authenticated routes, alongside a bilingual public corporate
website at `/`. It replaces scattered WhatsApp/Excel/paper workflows with one system the
owner can control even off-site.

## Current Status

**V1 100% complete.** Milestone 10 (Production Hardening, Final Acceptance, Handover &
Delivery) is complete. The product is **READY FOR CLIENT HANDOVER** and runs in
production on a dedicated VPS (`https://elhabak.com`). See [STATUS.md](STATUS.md) for the full run log and
[PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the canonical product specification.

## Core Modules

- Authentication & RBAC
- Projects (lifecycle, phases, progress)
- Design Hub (revisions, client approval)
- Site Operations (field updates, media, timeline)
- Finance (estimates, BOQ, expenses, payments)
- Documents (versioned document control)
- Chat & Voice Notes
- Notifications
- Public corporate site

## Roles

`ADMIN` · `ENGINEER` · `ACCOUNTANT` · `WORKER` · `CLIENT`

Authorization is enforced server-side for every role, not just hidden in the UI.

## Tech Stack

- **Frontend:** Next.js 16 (App Router, Turbopack) + React 19 + TypeScript
- **Backend:** NestJS 11 + TypeScript, Socket.IO for realtime
- **Database:** PostgreSQL 16 via Prisma ORM
- **Package manager:** pnpm workspaces
- **Deployment:** VPS release flow (PM2 + Nginx) via `scripts/deploy/`

## Monorepo Structure

```
apps/
  web/        Next.js frontend (public site + authenticated app shell)
  api/        NestJS API (auth, RBAC, projects, designs, finance, documents, chat)
packages/
  config/     Shared environment/config schema validation
  contracts/  Shared TypeScript types between web and api
  database/   Prisma schema, migrations, seed, and generated client
  ui/         Shared React design-system components
  validation/ Shared zod schemas (including exact-integer money/quantity math)
```

## Local Development

### Prerequisites

- Node.js 22 (production runs 22.x; 24.x also works locally)
- pnpm 11.7.0 (`corepack enable` or `npm i -g pnpm@11.7.0`; pinned by `packageManager`)
- PostgreSQL 16 (a local instance is enough for development and tests)

### Install

```bash
pnpm install --frozen-lockfile
```

### Environment configuration

Copy `.env.example` to `.env` at the repository root and fill in real values, and
`apps/web/.env.example` to `apps/web/.env.local` for the web app's public URLs.
**Never commit real secrets** — `.env*` is gitignored except the `.env.example` files.

### Database

```bash
pnpm db:validate                                        # validate the Prisma schema
pnpm db:generate                                        # generate Prisma client
pnpm db:migrate:deploy                                  # apply committed migrations (never `db push`)
pnpm db:seed                                            # idempotent demo/MVP seed (local only)
```

### Development servers

```bash
pnpm dev            # runs web (port 3000) and api (port 4000) in parallel
```

## Build

```bash
pnpm build           # builds all workspace packages, web, and api
pnpm typecheck        # strict TypeScript check across the monorepo
pnpm lint             # eslint across the monorepo
```

## Tests

The API suite writes real rows, so it refuses to run unless `DATABASE_URL` (and
`DIRECT_DATABASE_URL`, if set) points at a **loopback** PostgreSQL database named
`elhabak_test` or `elhabak_test_*`. Create that database, apply migrations to it, and pass
the URL in the environment (it overrides `.env`):

```bash
export DATABASE_URL=postgresql://<user>:<password>@127.0.0.1:5432/elhabak_test
export DIRECT_DATABASE_URL=$DATABASE_URL
pnpm db:migrate:deploy
pnpm test                          # API (vitest) + web (node --test)
pnpm --filter @elhabak/web test    # web tests only (no database needed)
```

## Deployment

Production runs on a VPS: PostgreSQL 16 on loopback, the API and web as PM2 processes
(`elhabak-api`, `elhabak-web`) behind Nginx, with file storage on the server under
`/var/www/elhabak/shared/storage`. Releases are immutable directories under
`/var/www/elhabak/releases/`, and `/var/www/elhabak/current` points at the active one.

Deploy only through the canonical scripts (key-based SSH):

- `scripts/deploy/package-release.sh` — packages a committed, clean `HEAD` with provenance metadata
- `scripts/deploy/release-preflight.sh` — environment and build-output guards
- `scripts/deploy/deploy-release.sh` — install, build, preflight, atomic `current` switch, PM2 restart
- `scripts/deploy/rollback.sh` — switch back to the previous release

Schema changes ship as committed Prisma migrations applied with `migrate deploy` after a
verified backup. `/api/health` reports the deployed commit, which must equal `origin/main`
and the release metadata. `Dockerfile.api`/`Dockerfile.web` remain for container builds.

## File Storage

Uploaded files (design revisions, site media, documents, finance receipts, voice notes)
are stored on disk under a project-scoped, authorization-checked path — never served as
static/public files. Every download goes through a protected endpoint that re-checks the
requester's role and project membership before streaming the file.

## Security

- Server-side RBAC on every protected route (role + project-ownership/assignment checks)
- HTTP-only, secure session cookies — no client-readable auth tokens
- IDOR protections: direct-ID access to another user's/project's records returns `404`,
  not `403`, to avoid confirming a resource exists
- Upload validation by real magic-byte file-signature checks, not just declared MIME type
- Internal financial data (expenses, contractor payments) is never exposed to the `CLIENT`
  role at the API layer

## Internationalization

Arabic is the default language and renders RTL. English is available as an LTR toggle.
Both directions are verified at desktop, tablet, and mobile breakpoints.

## Project Status / Roadmap

- **V1:** 100% complete — Milestone 10 done, READY FOR CLIENT HANDOVER
- **V5 Product Experience:** 100% complete — all visual/product-experience phases delivered
- **Production:** Live at `https://elhabak.com` (VPS: PM2 + Nginx + PostgreSQL 16)

## License

Internal proprietary project for ELHABAK Construction. Not licensed for redistribution.
