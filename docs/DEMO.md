# Demo accounts

The seed script (`npm run db:seed`) creates two clinics so multi-tenancy is visible, plus a
platform super-admin. **Every account uses the same password:**

```
Passw0rd!
```

## Platform

| Role | Email |
|------|-------|
| SUPER_ADMIN | `superadmin@clinicflow.dev` |

## Sunrise Medical Center

| Role | Email |
|------|-------|
| CLINIC_ADMIN | `admin@sunrise.dev` |
| DOCTOR (General Medicine) | `dr.smith@sunrise.dev` |
| DOCTOR (Cardiology) | `dr.khan@sunrise.dev` |
| STAFF (reception) | `reception@sunrise.dev` |
| PATIENT (portal) | `patient@sunrise.dev` |

## Downtown Family Clinic

| Role | Email |
|------|-------|
| CLINIC_ADMIN | `admin@downtown.dev` |
| DOCTOR (General Medicine) | `dr.smith@downtown.dev` |
| DOCTOR (Cardiology) | `dr.khan@downtown.dev` |
| STAFF (reception) | `reception@downtown.dev` |
| PATIENT (portal) | `patient@downtown.dev` |

> Try logging in as a Sunrise doctor and then a Downtown doctor — neither can see the other
> clinic's patients or appointments. That boundary is enforced server-side and covered by tests.
