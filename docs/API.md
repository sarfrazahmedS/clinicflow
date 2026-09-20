# API reference

Base URL: `/api`. All responses are JSON. Authenticated requests send
`Authorization: Bearer <accessToken>`; the refresh token is an httpOnly cookie.

Roles: `SUPER_ADMIN`, `CLINIC_ADMIN`, `DOCTOR`, `STAFF`, `PATIENT`.
Every clinical route is automatically scoped to the caller's clinic.

## Auth — `/api/auth`

| Method | Path | Auth | Body / notes |
|--------|------|------|--------------|
| POST | `/register` | public | `{ clinicName, name, email, password }` → creates a clinic + its `CLINIC_ADMIN` |
| POST | `/login` | public | `{ email, password }` → `{ accessToken, user }` (+ refresh cookie) |
| POST | `/refresh` | cookie | rotates the refresh token → new `{ accessToken }` |
| POST | `/logout` | cookie | revokes the refresh token |
| GET | `/me` | any | current user |

## Patients — `/api/patients`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/` | all staff | `?search=&page=&pageSize=` |
| POST | `/` | ADMIN, DOCTOR, STAFF | `{ firstName, lastName, gender?, dob?, phone?, … }` |
| GET | `/:id` | all staff | 404 if in another clinic |
| PATCH | `/:id` | ADMIN, DOCTOR, STAFF | partial update |
| DELETE | `/:id` | CLINIC_ADMIN, SUPER_ADMIN | soft-deactivate |

## Appointments — `/api/appointments`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/` | all staff | `?from=&to=&doctorId=&status=&page=&pageSize=` |
| POST | `/` | ADMIN, DOCTOR, STAFF | `{ patientId, doctorId, scheduledAt, durationMin?, reason? }`; rejects double-booking (`409`) |
| GET | `/:id` | all staff | |
| PATCH | `/:id/status` | ADMIN, DOCTOR, STAFF | `{ status }`; validated lifecycle (invalid jump → `400`) |
| PATCH | `/:id/reschedule` | ADMIN, DOCTOR, STAFF | `{ scheduledAt, durationMin? }` |

Status lifecycle: `SCHEDULED → CONFIRMED → CHECKED_IN → COMPLETED`, with `CANCELLED` /
`NO_SHOW` as terminal states.

## Medical records — `/api/records`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/` | all staff + PATIENT (own) | `?patientId=` |
| POST | `/` | DOCTOR | `{ patientId, diagnosis?, vitals?, notes?, … }` |
| GET | `/:id` | all staff + PATIENT (own) | includes prescriptions |

## Prescriptions — `/api/prescriptions`

| Method | Path | Roles | Notes |
|--------|------|-------|-------|
| GET | `/` | all staff + PATIENT (own) | `?patientId=` |
| POST | `/` | DOCTOR | `{ patientId, notes?, items: [{ drugName, dosage?, frequency?, durationDays?, instructions? }] }` |
| GET | `/:id` | all staff + PATIENT (own) | |
| GET | `/:id/pdf` | all staff + PATIENT (own) | branded PDF; `?format=png` for a preview image |

## Errors

Consistent shape: `{ "error": string, "code"?: string, "details"?: any }`.
Common codes: `400` validation, `401` unauthenticated, `403` forbidden, `404` not found,
`409` conflict, `429` rate-limited, `500` internal.
