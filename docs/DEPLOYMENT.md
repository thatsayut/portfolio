# Deployment Guide

Deploy the Reward Platform for **free** using:

| Component | Platform | Free Tier |
|-----------|----------|-----------|
| Frontend | [Vercel](https://vercel.com) | Unlimited deploys |
| Backend | [Render](https://render.com) | 750 hrs/month |
| PostgreSQL | [Neon](https://neon.tech) | 0.5 GB storage |
| Redis | [Upstash](https://upstash.com) | 10K commands/day |

---

## Step 1 — Create Database (Neon)

1. Go to [neon.tech](https://neon.tech) → Sign up → **New Project**
2. Region: **Singapore** (closest to TH)
3. Copy the **Connection String** — looks like:
   ```
   postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Save this — you'll use it as `DATABASE_URL`

---

## Step 2 — Create Redis (Upstash)

1. Go to [upstash.com](https://upstash.com) → Sign up → **Create Database**
2. Region: **AP-Southeast-1 (Singapore)**
3. Copy the **Redis URL** — looks like:
   ```
   rediss://default:xxx@apn1-xxx.upstash.io:6379
   ```
4. Save this — you'll use it as `REDIS_URL`

---

## Step 3 — Deploy Backend (Render)

### Option A: Blueprint (Automatic)

1. Go to [render.com](https://render.com) → Sign up → **New Blueprint Instance**
2. Connect your GitHub repo
3. Render reads `render.yaml` and creates the service
4. Set these environment variables manually:
   - `DATABASE_URL` → Neon connection string from Step 1
   - `REDIS_URL` → Upstash Redis URL from Step 2
   - `CLIENT_URL` → Your Vercel frontend URL (set after Step 4)

### Option B: Manual Setup

1. **New Web Service** → Connect GitHub repo
2. Settings:
   - **Name**: `reward-platform-api`
   - **Region**: Singapore
   - **Runtime**: Docker
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Docker Context**: `./backend`
   - **Plan**: Free
3. Environment Variables:

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `4000` |
   | `DATABASE_URL` | `postgresql://...` (from Neon) |
   | `REDIS_URL` | `rediss://...` (from Upstash) |
   | `JWT_SECRET` | (generate a random 64-char string) |
   | `JWT_REFRESH_SECRET` | (generate a different 64-char string) |
   | `JWT_EXPIRES_IN` | `15m` |
   | `JWT_REFRESH_EXPIRES_IN` | `7d` |
   | `CLIENT_URL` | `https://your-app.vercel.app` |

4. Click **Create Web Service**
5. First deploy will auto-run `prisma migrate deploy` + start the server
6. Copy the Render URL (e.g., `https://reward-platform-api.onrender.com`)

### Seed the Production Database

After first deploy, open the Render **Shell** tab and run:
```bash
npx prisma db seed
```

---

## Step 4 — Deploy Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → Sign up → **Add New Project**
2. Import your GitHub repo
3. Settings:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
4. Environment Variables:

   | Key | Value |
   |-----|-------|
   | `NEXT_PUBLIC_API_URL` | `https://reward-platform-api.onrender.com` (from Step 3) |

5. Click **Deploy**
6. Copy the Vercel URL → Go back to Render and set `CLIENT_URL` to this URL

---

## Step 5 — GitHub Actions CI/CD (Optional)

The CI workflow runs tests on every push. To enable **auto-deploy after tests pass**:

### Render Deploy Hook

1. Render Dashboard → Your service → **Settings** → **Deploy Hook**
2. Copy the hook URL
3. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**:
   - `RENDER_DEPLOY_HOOK_URL` = the hook URL

### Vercel Deploy via GitHub Actions

1. Vercel Dashboard → **Settings** → **Tokens** → Create token
2. Run `npx vercel link` in `frontend/` to get org and project IDs
3. Add GitHub secrets:
   - `VERCEL_TOKEN` = your Vercel token
   - `VERCEL_ORG_ID` = from `.vercel/project.json`
   - `VERCEL_PROJECT_ID` = from `.vercel/project.json`

> **Note**: Vercel auto-deploys by default when you connect GitHub. The GitHub Action is an alternative if you want deploys **only after CI passes**. To use it, disable auto-deploy in Vercel: Settings → Git → Deploy Hooks → toggle off.

---

## Step 6 — Verify

1. Open your Vercel URL → Landing page should load
2. Click **Login** → Use seed credentials:
   - Admin: `admin@rewardplatform.com` / `Admin@123456`
   - User: `alice@example.com` / `User@123456`
3. Test check-in, lucky draw, wallet

---

## Architecture (Production)

```
┌─────────────┐       ┌──────────────────┐       ┌──────────┐
│   Vercel     │──────→│     Render       │──────→│   Neon   │
│  (Next.js)   │ HTTPS │   (NestJS API)   │  SSL  │ (Postgres)│
│  Frontend    │       │   Docker + Free  │       │  Free     │
└─────────────┘       └──────────────────┘       └──────────┘
                              │
                              │ TLS
                              ▼
                        ┌──────────┐
                        │ Upstash  │
                        │ (Redis)  │
                        │  Free    │
                        └──────────┘
```

---

## Troubleshooting

### Backend won't start on Render
- Check **Logs** tab in Render dashboard
- Ensure `DATABASE_URL` has `?sslmode=require` for Neon
- Ensure `REDIS_URL` starts with `rediss://` (double s) for Upstash TLS

### CORS errors
- Set `CLIENT_URL` on Render to your exact Vercel URL (including `https://`)
- No trailing slash

### Free tier cold starts
- Render free tier sleeps after 15 min of inactivity
- First request after sleep takes ~30 seconds
- This is normal — add a loading state on the frontend

### Database migrations fail
- Check Render logs for the exact error
- You can run migrations manually via Render Shell:
  ```bash
  npx prisma migrate deploy
  ```

---

## Generate Secrets

Quick way to generate JWT secrets:
```bash
# On Mac/Linux
openssl rand -base64 48

# On any system with Node.js
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
```
