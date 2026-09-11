# ELHABAK Construction System V1

## Overview

ELHABAK Construction System V1 is a custom project management platform for ELHABAK
Construction (الحباك للاستشارات الهندسية). It centralizes company projects, clients, design
approvals, site progress, finance visibility, document control, project chat, and worker
uploads behind role-based authenticated routes, alongside a bilingual public corporate
website at `/`. It replaces scattered WhatsApp/Excel/paper workflows with one system the
owner can control even off-site.

## Current Status

**80% complete.** Milestone 08 (Project Communication & Realtime Collaboration) is
complete. The Client Review deployment is live in production. See [STATUS.md](STATUS.md)
for the full run log and [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) for the canonical
product specification.

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
- **Database:** PostgreSQL (Neon) via Prisma ORM
- **Package manager:** pnpm workspaces
- **Deployment:** Docker images on Railway (`elhabak-web`, `elhabak-api`)

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

- Node.js 22
- pnpm 11 (`corepack enable` or `npm i -g pnpm@11.7.0`)
- A PostgreSQL database (Neon or local)

### Install

```bash
pnpm install
```

### Environment configuration

Copy `.env.example` to `.env` at the repository root and fill in real values.
**Never commit real secrets** — `.env*` is gitignored except `.env.example`.

### Database

```bash
pnpm db:generate                                        # generate Prisma client
pnpm --filter @elhabak/database db:migrate:apply         # apply committed migrations
pnpm db:seed                                             # idempotent demo/MVP seed
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

```bash
pnpm test             # runs the NestJS API automated test suite (vitest)
```

## Deployment

Production runs on Railway as two services, each built from its own Dockerfile at the
repository root:

- **`elhabak-web`** — `Dockerfile.web`, Next.js production server
- **`elhabak-api`** — `Dockerfile.api`, NestJS API with a persistent volume for file storage

Database: **Neon PostgreSQL**. File storage (uploads, media, voice notes, generated
reports) lives on a Railway persistent volume mounted into the API service — no external
object storage provider is used in V1.

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

- **Current:** 80% complete, Milestone 08 done, MVP 1 ready for client review
- **Next:** Milestone 09 (not started)
- **Final:** Milestone 10

## License

Internal proprietary project for ELHABAK Construction. Not licensed for redistribution.
