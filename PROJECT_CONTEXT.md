# ELHABAK Construction System V1 — Canonical Project Context

## 1. Project identity
- Product: **ELHABAK Construction System V1**
- Company: **ELHABAK CONSTRUCTION — الحباك للاستشارات الهندسية**
- Repository: `https://github.com/3bud-ZC/ELHABAK-Construction-System-V1.git`
- Local workspace: `C:\Users\Abud\Desktop\GitHub\ELHABAK Construction System V1`
- Hard delivery deadline: **before 1 October 2026**; treat **30 September 2026** as the final delivery day.
- Arabic is the default UI language and must be RTL. English is secondary and must be LTR.
- This is a single-company custom system, not a multi-tenant SaaS product.

## 2. Product goal
Create one professional web platform that centralizes company projects, clients, design approvals, site progress, finance visibility, files, project communication, reports, and worker uploads. It must reduce scattered WhatsApp/Excel/paper workflows and give the owner control over project execution even when off-site.

The product also includes a polished public one-page corporate website at `/` as the company-facing website, with the management system behind authenticated routes.

## 3. Approved V1 roles
1. **ADMIN** — company owner; full control.
2. **ENGINEER** — assigned project management, designs, progress, site updates, files, project chat.
3. **ACCOUNTANT** — payments, receipts, contract items, internal expenses; Admin can review/edit.
4. **WORKER / CONTRACTOR** — intentionally restricted; assigned projects + upload photos/videos + optional note only.
5. **CLIENT** — own projects only; view progress, designs, approvals, allowed files, financial summary, payments/receipts, project chat, reports.

Authorization must be enforced server-side. Hiding UI controls is never sufficient.

## 4. Approved project lifecycle
1. Site Inspection — المعاينة
2. Design — التصميم
3. Preliminary Estimation — المقايسة التقريبية
4. Execution — التنفيذ
5. Initial Handover — التسليم الابتدائي
6. Final Handover — التسليم النهائي

Each project stores current phase, overall progress, dates, status, assigned team, client, location, type, notes, and activity history.

Supported project categories:
- Design
- Construction
- Finishing
- General Contracting
- Furniture
- Mixed

## 5. Approved V1 functional scope
### Public corporate website
- Header / navigation
- Hero
- About ELHABAK
- Services
- Company process / workflow
- Why ELHABAK
- Contact / CTA
- Footer
- Login entry to the system
- Do not fabricate projects, clients, testimonials, certifications, awards, statistics, or achievements.

### Authentication and access
- Real authentication backed by PostgreSQL
- Secure password handling
- Login / logout
- Protected routes
- Role and ownership checks on the server

### Admin dashboard
- Active projects
- Clients
- Current phases and progress
- Recent site updates
- Recent activity
- Attention-needed items where appropriate
- Real database values or truthful empty states only

### Clients and team
- Create/edit/view clients
- One client may have multiple projects
- Create/manage users and project assignments
- Engineers may manage more than one project
- Workers only see assigned upload workflow

### Projects
- Create/edit/view projects
- Project overview
- Lifecycle and progress tracking
- Project team
- Recent updates
- Status and dates

### Design Hub
- Categories: architectural, structural, interior, electrical, plumbing, furniture, renders, other
- Upload common design files including PDF, images, CAD/source files
- Revision history; previous versions are not silently overwritten
- Client can comment, request changes, ask questions, and explicitly approve
- Approved revision remains historically recorded

### Modifications
- Document changes requested after initial approval
- Record description, discussion/status, and cost difference where applicable
- Keep modification history attached to the project

### Site progress and media
- Engineer can create site updates with text, progress, photos and videos
- Worker upload path must be extremely simple and mobile-friendly
- All updates/messages/comments carry exact timestamps and actor identity
- Client sees chronological project updates

### Finance inside the product
Client-visible:
- Total project value
- Main contract items
- Paid amount
- Remaining amount
- Payment history
- Payment method
- Receipt image/file

Internal Admin/Accountant only:
- Detailed internal expenses under main items
- Expense description, value, date, note, attachment, creator

No online payment gateway in V1.

### Files
- Project document center
- Contracts, drawings, designs, estimates, receipts, invoices, reports, photos, videos, other files
- Access levels at minimum: internal-only vs client-visible
- Client can download files explicitly available to them

### Communication
- Exactly one project chat per project
- Text
- Images/files
- Voice notes
- Timestamp and sender identity
- No voice/video calls in V1

### Notifications
- In-app notifications only in V1
- User may control notification preferences where practical

### Reports
- Daily management summary
- Project report
- Progress report for a selected period
- Downloadable branded PDF reports

### Responsive + bilingual
- Professional desktop experience
- Strong mobile experience, especially Client, Engineer, and Worker flows
- Arabic RTL default
- English LTR switch

## 6. Explicitly outside V1
Do not implement unless a later approved Change Request explicitly adds it:
- Native Android/iOS applications
- Online payment gateway
- BIM or interactive 3D viewer
- Advanced offline mode
- Full ERP/accounting system
- Advanced inventory/supplier management
- WhatsApp API, SMS, paid email notification integrations
- AI product features
- Advanced Gantt / enterprise scheduling
- Legal third-party e-signature provider

## 7. Visual identity — source of truth
Use files under `assets/brand/` and their references. Do not redesign or replace the company identity.

Brand direction:
- Professional
- Architectural
- Clean
- Modern
- Premium but practical for daily dashboard use

Observed primary colors from supplied raster logo/reference assets:
- Primary Navy: approximately `#16234B` / `#17234B`
- Accent Orange: approximately `#E87625`
- White: `#FFFFFF`
- Light neutral UI backgrounds: use subtle off-white/light-gray values derived around the brand, not heavy navy everywhere.

UI guidance:
- Navy: navigation, strong headers, major brand surfaces
- Orange: restrained accent for primary emphasis, important actions and highlights
- Main work areas: light backgrounds, white cards, navy typography
- Reuse the architectural/geometric pattern and orange stair/step motif only as subtle inspiration in login, public hero, empty states, report covers, or section decoration.
- Never turn printed stationery layouts directly into dashboard layouts.

Company contact details from supplied identity files:
- Email: `elhabakconstruction.eg@gmail.com`
- Phone: `(+20) 011 111 309 18`
- Address: `Uptown Mall, New Sohag City, Sohag, Egypt`

## 8. Brand asset index
Primary agent-ready assets in `assets/brand/`:
- `logo-primary-vertical.png`
- `logo-primary-horizontal.png`
- `logo-source.ai` — original source supplied by client

Visual references in `assets/brand/reference/`:
- `letterhead.pdf`
- `notepad.pdf`
- `envelope.pdf`
- `social-template-1.pdf`
- `social-template-2.pdf`
- `lanyards.pdf`

Approved project/client documents in `docs/`:
- `ELHABAK_Project_Structure_V1.pdf`
- `ELHABAK_Financial_Structure_V1.pdf`

## 9. Technical baseline
Preferred stack unless implementation evidence strongly requires a simpler compatible alternative:
- Frontend: Next.js + TypeScript
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Production: one VPS
- Reverse proxy: Nginx
- Process management: choose PM2 or Docker based on the simplest reliable production setup for the actual codebase
- SSL: Let's Encrypt

Production storage decision is fixed for V1:
- The VPS hosts application, API, PostgreSQL, images, videos, documents, CAD/source files, voice notes, generated reports, and local backups.
- Do not introduce S3, Cloudflare R2, Firebase Storage, Supabase Storage, or another external object storage provider.
- Design local storage paths so migration to larger storage later is possible.
- Add upload size/type validation and storage-usage awareness.

## 10. Data and security rules
- Real PostgreSQL persistence; no mock backend.
- No fake authentication.
- No hard-coded production dashboard metrics.
- Client can only access their own projects, even by direct URL/ID guessing.
- Engineer can only access permitted/assigned project capabilities.
- Worker cannot see client financials, contracts, admin settings, or unrelated projects.
- Internal expenses must never be exposed to clients.
- Validate uploads by authorization, type and size.
- Log material business actions and timestamps.
- Keep design approval/revision history immutable enough for audit purposes.
- Secrets never go in Git or STATUS.md.

## 11. Agent operating rules
This repository may be worked on by Codex, Antigravity, Claude Code, or another coding agent.

Every execution run must:
1. Inspect the repository.
2. Read this `PROJECT_CONTEXT.md`.
3. Read `STATUS.md`.
4. Execute only the requested milestone/scope directly.
5. Run/build/test/verify the changed behavior.
6. Fix failures caused by the run.
7. Update the same single `STATUS.md` after completion.

Do not create roadmap, planning, progress, walkthrough, or duplicate status files.
Do not return an implementation plan instead of executing.
Do not repeat work already verified in STATUS.md.
Do not touch unrelated production files/features.
Do not claim completion without verification.

## 12. Progress model
Use 10% execution increments. This keeps prompts focused and minimizes repeated context.

- **0–10%** — Foundation + branding + architecture + public website shell
- **10–20%** — Authentication + RBAC + users/clients foundation
- **20–30%** — Projects + lifecycle + worker/client vertical slice → **MVP 1**
- **30–40%** — Design Hub + revisions + client approval
- **40–50%** — Progress + site updates + media management
- **50–60%** — Finance + contract items + payments + receipts
- **60–70%** — File Center + access control + modification requests
- **70–80%** — Project chat + voice notes + notifications
- **80–90%** — Reports + PDF + bilingual completion + full QA
- **90–100%** — Production hardening + deployment + client acceptance + handover

### MVP 1 acceptance flow at 30%
Must work with real persisted data:
`Admin login → create client → create project → assign engineer/worker → worker login → see assigned project → upload photo/video update → admin sees update → client login → sees only own project, progress and the new site update.`

Client acceptance of this working MVP is tied to the first agreed project payment.

## 13. Commercial facts agents may need to preserve
- Development price agreed with client: **20,000 EGP**.
- External services are handled separately according to the approved financial document.
- First payment: **30% after client accepts MVP 1**.
- Payment plan: four payments in total, per approved financial document.
- Free technical support/warranty: **3 months after final delivery**.
- New features outside V1 require a separate Change Request, price impact, time impact, client approval, then implementation.

## 14. Definition of done for final V1
Final V1 is not complete until all approved capabilities work with real data, role isolation is verified, uploads/downloads work, Arabic/English direction is correct, mobile/desktop are tested, reports generate correctly, production build passes, deployment is healthy, backups exist, and client acceptance/handover is completed.
