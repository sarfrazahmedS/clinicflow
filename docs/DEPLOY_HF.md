# Deploying ClinicFlow to Hugging Face Spaces (full-stack)

This deploys the **real** ClinicFlow container (React SPA + Express API + Puppeteer
PDF) to a free **Hugging Face Space** (Docker SDK), backed by a free managed
PostgreSQL database. It reuses the existing [`Dockerfile`](../Dockerfile) as-is.

> This is the full-stack deployment. A zero-setup, client-only **mock demo** also
> runs on GitHub Pages — see the "Live Demo" link in the main README.

---

## What you need (5 min)

1. A free **Hugging Face** account — <https://huggingface.co/join>
2. A free **PostgreSQL** database. **Neon** is recommended (free, no credit card):
   <https://neon.tech>

Nothing here needs a credit card.

---

## Step 1 — Create a Postgres database (Neon)

1. Sign in to <https://neon.tech> → **New Project**.
2. After it's created, open **Connection Details** and copy the connection string.
   It looks like:
   ```
   postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
   Keep it handy — it becomes the `DATABASE_URL` secret below.

## Step 2 — Create the Space

1. <https://huggingface.co/new-space>
2. **Owner**: your account · **Space name**: `clinicflow`
3. **SDK**: choose **Docker** → **Blank**
4. **Hardware**: `CPU basic` (free) · **Visibility**: Public
5. Click **Create Space**.

## Step 3 — Push the app into the Space

The Space is its own git repo. From a terminal:

```bash
# clone the empty Space (replace <user>)
git clone https://huggingface.co/spaces/<user>/clinicflow hf-clinicflow
cd hf-clinicflow

# copy the app in from your ClinicFlow checkout (Dockerfile, client/, server/, docs/, LICENSE)
#   — copy everything EXCEPT .git, node_modules and any local .env files.

# the Space's README.md must start with the Hugging Face front-matter below
```

Create/overwrite **`README.md`** in the Space so it **starts** with this block
(everything above the first blank line after `---`):

```yaml
---
title: ClinicFlow
emoji: 🏥
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 4000
pinned: false
---
```

(You can keep the rest of the project README underneath it.)

Then commit + push:

```bash
git add .
git commit -m "Deploy ClinicFlow to Hugging Face Spaces"
git push
```

> Tip: HF may ask for a **write access token** as the git password
> (huggingface.co → Settings → Access Tokens → New token, role *write*). Paste it
> when git prompts — you enter it yourself; never share it.

## Step 4 — Set the secrets

In the Space: **Settings → Variables and secrets → New secret**. Add three
**secrets** (not public variables):

| Name | Value |
| --- | --- |
| `DATABASE_URL` | your Neon connection string from Step 1 |
| `JWT_ACCESS_SECRET` | a long random string — `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | another long random string — `openssl rand -hex 32` |

Optionally add a public **variable** `CLIENT_ORIGIN` set to your Space URL
(`https://<user>-clinicflow.hf.space`).

## Step 5 — Build & first run

The Space builds the Docker image automatically (a few minutes the first time).
On start, `start:prod` runs `prisma migrate deploy`, seeds the demo data, then
serves the app. Watch the **Logs** tab; when it's ready, open the Space URL:

```
https://<user>-clinicflow.hf.space
```

Sign in with any seeded account (all use password `Passw0rd!`):

| Role | Email |
| --- | --- |
| Clinic Admin | `admin@sunrise.dev` |
| Doctor | `dr.smith@sunrise.dev` |
| Reception | `reception@sunrise.dev` |
| Patient | `patient@sunrise.dev` |
| Super Admin | `superadmin@clinicflow.dev` |

---

## Notes & troubleshooting

- **Only demo data.** The seed inserts fictional clinics/patients — no real data.
  Never point `DATABASE_URL` at a database with real records.
- **Port.** The container serves the SPA + API on port `4000`; `app_port: 4000`
  tells HF to route there. No code change needed.
- **PDF / Puppeteer.** The image installs system Chromium
  (`PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium`) and the PDF engine already
  launches it with `--no-sandbox --disable-setuid-sandbox`, so it works in the
  container out of the box. Generated PDFs are written to `STORAGE_DIR`
  (default `storage/`), which is **ephemeral** on the Space — fine for a demo
  (files are regenerated on demand and reset on restart).
- **Neon sleep.** Free Neon databases pause when idle; the first request after a
  pause takes a few extra seconds while it wakes.
- **Re-seeding.** The seed only runs when the DB is empty. To reset the demo,
  drop/recreate the Neon database (or its tables) and restart the Space.
- **Secrets are yours.** Set every secret in the Space UI. Never commit real
  secrets or a real `DATABASE_URL` to git.
