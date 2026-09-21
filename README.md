# ClinicFlow

[![Live Demo](https://img.shields.io/badge/▶_Live_Demo-Try_it_now-2563eb?style=for-the-badge)](https://sarfrazahmeds.github.io/clinicflow/)

![CI](https://github.com/sarfrazahmedS/clinicflow/actions/workflows/ci.yml/badge.svg)

A **multi-tenant clinic management SaaS** — a production-style demo where many independent
clinics run on one platform, each seeing only its own data. Staff register patients, book
appointments, record visits and prescriptions, and generate branded PDF documents; every
sensitive action is written to an immutable audit log.

Built as a clean, typed **React + Node.js** application with real role-based access control,
tenant isolation enforced at the service layer, JWT auth, and automated tests for the
security-critical paths.

> **Portfolio / demo project.** ClinicFlow is a personal showcase built to demonstrate
> full-stack architecture, multi-tenancy and security patterns. It is **not** a certified
> medical product and makes **no HIPAA/regulatory compliance claim**. Do not use it with real
> patient data.

## 🕹️ Live Demo

**▶️ Try it live — [sarfrazahmeds.github.io/clinicflow](https://sarfrazahmeds.github.io/clinicflow/)**

The demo runs the **real React client** against an **in-memory mock backend** — no server or
database to set up, and **no real patient data**. Sign in as any of the five roles (all use
password `Passw0rd!`) to explore multi-tenant data isolation, the appointment status lifecycle,
medical records, prescriptions and PDF export:

| Role | Email |
| --- | --- |
| Clinic Admin | `admin@sunrise.dev` |
| Doctor | `dr.smith@sunrise.dev` |
| Reception | `reception@sunrise.dev` |
| Patient | `patient@sunrise.dev` |
| Super Admin | `superadmin@clinicflow.dev` |

> The demo's mock backend lives in [`client/src/api/demo.ts`](client/src/api/demo.ts) and is
> opt-in (`VITE_DEMO`). The real implementation is the **Express + Prisma + PostgreSQL** API in
> [`server/`](server/) — run it with Docker (see [Getting started](#getting-started)) or deploy
> the container to any Docker host: Render (`render.yaml`) or a free
> **[Hugging Face Space](docs/DEPLOY_HF.md)**.

---

## Screenshots

| Dashboard | Patients |
|:---:|:---:|
| ![Dashboard](docs/screenshots/02-dashboard.png) | ![Patients](docs/screenshots/03-patients.png) |
| **Appointments** | **Medical records** |
| ![Appointments](docs/screenshots/04-appointments.png) | ![Records](docs/screenshots/05-records.png) |
| **Prescriptions** | **Login (role-based demo)** |
| ![Prescriptions](docs/screenshots/06-prescriptions.png) | ![Login](docs/screenshots/01-login.png) |

Server-generated, per-clinic **branded prescription PDF** (Puppeteer HTML → PDF):

<img src="docs/screenshots/prescription-pdf.png" alt="Branded prescription PDF" width="480" />

---

## Highlights

- **True multi-tenancy** — every clinical row is scoped to a `clinicId` that is derived from
  the authenticated user, never from the client. Cross-tenant access is blocked and tested.
- **Five roles, real RBAC** — `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `STAFF`, `PATIENT`,
  enforced by middleware on every route.
- **Clinical core** — patients, appointments (with a validated status lifecycle), medical
  records, and prescriptions with line items.
- **Branded PDF documents** — server-rendered prescription / report PDFs from an HTML template
  engine, per-clinic branding, stored and re-downloadable.
- **Audit logging** — who did what, to which record, when.
- **Secure by default** — hashed passwords, short-lived JWT access + rotating refresh tokens,
  Zod validation, Helmet, CORS, and rate-limiting.
- **Tested & CI-checked** — Vitest + Supertest cover auth, RBAC and tenant-isolation; GitHub
  Actions type-checks, builds and runs the suite on every push.

## Tech stack

| Layer     | Tech |
|-----------|------|
| Frontend  | React, TypeScript, Vite, React Router, TanStack Query, Tailwind CSS |
| Backend   | Node.js, TypeScript, Express, Zod, Helmet, express-rate-limit |
| Data      | PostgreSQL, Prisma ORM |
| Auth      | JWT (access + rotating refresh), bcrypt |
| Documents | Puppeteer (HTML template → PDF) |
| Testing   | Vitest, Supertest |
| Dev / CI  | Docker Compose (Postgres), GitHub Actions |

## Roles & permissions

| Capability                         | SUPER_ADMIN | CLINIC_ADMIN | DOCTOR | STAFF | PATIENT |
|------------------------------------|:-----------:|:------------:|:------:|:-----:|:-------:|
| Manage clinics (create / suspend)  | ✅ | — | — | — | — |
| Manage clinic users                | ✅ | ✅ (own clinic) | — | — | — |
| Register / edit patients           | ✅ | ✅ | ✅ | ✅ | — |
| Book / reschedule appointments     | ✅ | ✅ | ✅ | ✅ | request only |
| Write medical records              | — | — | ✅ | — | — |
| Issue prescriptions                | — | — | ✅ | — | — |
| Generate PDF documents             | ✅ | ✅ | ✅ | ✅ | own only |
| View own records                   | — | — | — | — | ✅ |
| View audit log                     | ✅ | ✅ (own clinic) | — | — | — |

## Architecture

```
React (Vite) ── HTTPS/JSON ──▶ Express API
  routes → controllers → services → Prisma → PostgreSQL
                    │
       middleware:  authenticate (JWT) → resolve tenant → authorize (RBAC)
                  → validate (Zod) → rate-limit → error handler → audit log
```

Business logic lives in **services**, not route handlers. Every service receives the caller's
`clinicId` and `role` and filters all queries by tenant — the database is never queried without
a tenant scope (except by `SUPER_ADMIN`).

## Data model (ERD)

```mermaid
erDiagram
    Clinic ||--o{ User : has
    Clinic ||--o{ Patient : has
    Clinic ||--o{ Appointment : has
    Clinic ||--o{ MedicalRecord : has
    Clinic ||--o{ Prescription : has
    Clinic ||--o{ Document : has
    Clinic ||--o{ AuditLog : records
    User ||--o{ RefreshToken : owns
    User |o--o| Patient : "portal account"
    User ||--o{ Appointment : "doctor / creator"
    Patient ||--o{ Appointment : books
    Patient ||--o{ MedicalRecord : has
    Patient ||--o{ Prescription : receives
    Appointment |o--|| MedicalRecord : produces
    MedicalRecord ||--o{ Prescription : includes
    Prescription ||--o{ PrescriptionItem : contains
    Patient ||--o{ Document : owns
```

## API modules

| Module         | Routes (prefix) | Notes |
|----------------|-----------------|-------|
| Auth           | `/api/auth`     | register, login, refresh, logout, me |
| Clinics        | `/api/clinics`  | SUPER_ADMIN platform management |
| Users          | `/api/users`    | clinic staff/doctor management |
| Patients       | `/api/patients` | registration, search, profile |
| Appointments   | `/api/appointments` | booking + status transitions |
| Records        | `/api/records`  | encounters / medical records |
| Prescriptions  | `/api/prescriptions` | prescriptions + items |
| Documents      | `/api/documents` | generate + download PDFs |
| Audit          | `/api/audit`    | read-only audit trail |

Full request/response contracts live in [`docs/API.md`](docs/API.md) (added during Phase 9).

## Getting started

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Backend
cd server
cp .env.example .env          # set JWT secrets: openssl rand -hex 32
npm install
npx prisma migrate dev
npm run db:seed               # demo clinics, users, patients
npm run dev                   # http://localhost:4000

# 3. Frontend (added in Phase 10)
cd ../client
npm install
npm run dev                   # http://localhost:5173
```

### Demo credentials

Populated by the seed script — see [`docs/DEMO.md`](docs/DEMO.md). Every demo account uses the password `Passw0rd!`.

## Testing

```bash
cd server
npm test        # unit + API + RBAC + tenant-isolation
```

Security-critical scenarios (cross-tenant read/write, privilege escalation, invalid state
transitions) are tested first and must stay green.

## Security notes

See [`docs/SECURITY.md`](docs/SECURITY.md) for the full checklist. In short: no secrets in the
repo, parameterised queries via Prisma, hashed passwords, tokenised sessions, validated input,
least-privilege RBAC, and errors that never leak internals.

## Roadmap / limitations

- Notifications and billing are out of scope for v1.
- PDF generation uses headless Chromium (Puppeteer) — heavier but pixel-accurate.
- Not a regulated medical device; demo data only.

## Build phases

- [x] **P1** Project setup
- [x] **P2** Database architecture (Prisma schema)
- [x] **P3** Migrations
- [x] **P4** Seed / demo data
- [x] **P5** Backend foundation (app, config, middleware, error handling)
- [x] **P6** Authentication (JWT access + refresh)
- [x] **P7** RBAC
- [x] **P8** Multi-tenancy enforcement
- [x] **P9** Backend modules / APIs — auth, patients, appointments, records, prescriptions, documents
- [x] **P10** Frontend foundation (Vite + React + TS + Tailwind, auth, protected routes, API client with auto token-refresh)
- [x] **P11** Frontend modules — dashboard, patients, appointments, records, prescriptions
- [x] **P12** PDF / documents (Puppeteer branded prescription PDF + PNG preview)
- [x] **P13** Testing (Vitest + Supertest — 17 tests: auth, RBAC, tenant isolation, business rules; green in CI)
- [x] **P14** Security review ([`docs/SECURITY.md`](docs/SECURITY.md) — checklist + tested scenarios)
- [x] **P15** Performance review (DB indexes on tenant/lookup columns, server-side pagination)
- [x] **P16** UI/UX polish (favicon, role-aware dashboard, consistent Tailwind design)
- [x] **P17** README / GitHub prep (screenshots, ERD, API/SECURITY/DEMO docs, CI badge)
- [x] **P18** Final end-to-end QA (17 automated tests + all-role manual walkthrough)

## License

[MIT](LICENSE)
