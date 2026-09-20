# Security notes

ClinicFlow is a **portfolio/demo** application. It is **not** certified and makes **no
HIPAA/regulatory compliance claim** — do not use it with real patient data. That said, it is
built with production-style security controls, listed below.

## Checklist

| Area | Control |
|------|---------|
| **Passwords** | Hashed with bcrypt; never stored or logged in plaintext. |
| **Sessions** | Short-lived JWT access token (15 min) + rotating refresh token stored **hashed**; the refresh token is delivered as an `httpOnly`, `sameSite`, `secure` (in prod) cookie. Using a refresh token revokes it and issues a new one. |
| **Authorization (RBAC)** | Every protected route runs `requireRole(...)`; roles are least-privilege (e.g. only `DOCTOR` writes records/prescriptions). |
| **Multi-tenancy** | Each query is scoped by `clinicId` taken from the **authenticated token**, never from the request body/query. A `PATIENT` is further scoped to their own records. Cross-tenant access returns `404` and is covered by tests. |
| **Input validation** | Zod schemas validate body/query on every mutating route; unknown/invalid input is rejected with `400`. |
| **SQL injection** | All DB access goes through Prisma with parameterised queries — no string-built SQL. |
| **HTTP hardening** | Helmet security headers; CORS restricted to the configured client origin with credentials. |
| **Rate limiting** | Global API limiter + a stricter limiter on auth endpoints (brute-force protection). |
| **Error handling** | A central handler returns safe messages; stack traces and internals are never sent to clients. |
| **Secrets** | Read from environment only; `.env` is git-ignored; no secrets committed. CI uses throwaway secrets. |
| **Audit trail** | Sensitive actions (auth, patient/appointment/record/prescription writes, document generation) are written to an append-only `AuditLog`. |

## Tested security scenarios

Run `npm test` in `server/`:

- Unauthenticated access is rejected (`401`).
- A role without permission is rejected (`403`) — e.g. a `PATIENT` cannot register patients, `STAFF` cannot issue prescriptions.
- Cross-tenant reads/writes are blocked (`404`) — one clinic cannot see or use another's data.
- Invalid state transitions are blocked (`400`) — e.g. an appointment cannot jump `SCHEDULED → COMPLETED`.
- Double-booking a doctor is blocked (`409`).

## Out of scope / future hardening

- Field-level encryption of clinical data (envelope encryption).
- Multi-factor authentication.
- Account lockout and password-strength policies beyond a minimum length.
- Full penetration testing.
