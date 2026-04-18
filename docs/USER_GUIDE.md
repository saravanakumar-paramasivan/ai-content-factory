# AI Content Factory — Complete User Guide

## Table of Contents
1. [How It Works](#architecture)
2. [Prerequisites](#prerequisites)
3. [First-Time Setup (Local)](#setup)
4. [YouTube Authorization](#youtube-auth)
5. [Dashboard UI](#dashboard)
6. [Analytics & Usage Page](#analytics)
7. [Making Videos via API](#api-usage)
8. [All API Endpoints](#endpoints)
9. [Monitoring & Logs](#monitoring)
10. [Niche Ideas & Best Practices](#niches)
11. [Troubleshooting](#troubleshooting)
12. [Deploy to Railway](#railway)

---

## 1. How It Works {#architecture}

```
You trigger a job (via Dashboard UI or API).
The factory does everything else automatically.

POST /projects  {"niche": "Health-Tech AI"}
        │
        ▼
 ┌─────────────────────────────────────────────────┐
 │  BRAIN  (Node.js :3000)                         │
 │  Creates DB record → enqueues BullMQ job        │
 └──────────────────┬──────────────────────────────┘
                    │ calls engine APIs in sequence
        ┌───────────▼───────────────────────────┐
        │  ENGINE  (Python :8000)               │
        │                                       │
        │  1. SCRIPTING                         │
        │     Claude Sonnet 4.6 → VideoScript   │
        │     (title, voiceover, keywords,      │
        │      overlay captions + timestamps)   │
        │                                       │
        │  2. FETCHING_ASSETS                   │
        │     ElevenLabs → MP3 voiceover        │
        │     Pexels → vertical 4K B-roll clips │
        │                                       │
        │  3. RENDERING                         │
        │     MoviePy stitches clips to audio   │
        │     Pillow burns in subtitles         │
        │     Exports 1080×1920 MP4 @ 30fps     │
        └───────────────────────────────────────┘
                    │
        ┌───────────▼───────────────────────────┐
        │  READY_TO_UPLOAD                      │
        │                                       │
        │  Click Upload (Dashboard) or          │
        │  POST /upload/:projectId              │
        │     Claude generates SEO metadata     │
        │     Uploads MP4 to YouTube (Private)  │
        │     Status → COMPLETED                │
        └───────────────────────────────────────┘
```

**Services:**

| Service | Port | Purpose | Cost model |
|---|---|---|---|
| Brain | 3000 | Auth, DB, queue orchestration | — |
| Engine | 8000 | AI agents, rendering | — |
| Dashboard | 4000 | Web UI | — |
| PostgreSQL | 5432 | Project state | — |
| Redis | 6379 | BullMQ job queue | — |
| Anthropic Claude Sonnet 4.6 | — | Script + YouTube metadata | ~$0.01–0.03 per video |
| ElevenLabs | — | Text-to-speech voiceover | ~500 chars/video |
| Pexels | — | Stock video clips | Free |
| YouTube Data API v3 | — | Video upload | Free (10,000 units/day) |

---

## 2. Prerequisites {#prerequisites}

**Required software:**
```bash
docker --version        # Docker Desktop 4.x+
docker compose version  # v2.x+
node --version          # v20+
python3 --version       # v3.11+
git --version
```

**Required API keys:**

| Key | Where to get it | Free tier |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Pay-per-use, ~$5 credit to start |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Key | 10,000 chars/month free |
| `PEXELS_API_KEY` | pexels.com/api → Request Access | Free |

> **ElevenLabs key permission:** When generating your key, ensure it has the **Text-to-Speech** permission enabled. Keys without this scope return a 401 error.

**YouTube OAuth (one-time):**
- Google Cloud Console → New Project → Enable **YouTube Data API v3**
- Credentials → **OAuth 2.0 Client ID** → Web Application
- Authorized redirect URIs:
  - Local: `http://localhost:3000/oauth2callback`
  - Railway: `https://YOUR-BRAIN-SERVICE.up.railway.app/oauth2callback` (add after deploying)
- Download credentials JSON → rename to `oauth_client_secret.json` → place in `brain/`

---

## 3. First-Time Setup (Local) {#setup}

```bash
# 1. Clone the repo
git clone https://github.com/saravanakumar-paramasivan/ai-content-factory.git
cd ai-content-factory

# 2. Copy and fill in your API keys
cp .env.example .env
# Edit .env — required fields:
#   ANTHROPIC_API_KEY
#   ELEVENLABS_API_KEY
#   PEXELS_API_KEY
#   NEXTAUTH_SECRET   (run: openssl rand -base64 32)
#   DASHBOARD_ADMIN_PASSWORD  (e.g. Admin@2026!Factory)

# 3. Place your YouTube OAuth file
cp /path/to/downloaded-credentials.json brain/oauth_client_secret.json

# 4. Start all services
docker compose up --build

# 5. Run database migrations (first time only)
docker compose exec brain npx prisma migrate deploy
```

**Verify everything is running:**
```bash
curl http://localhost:3000/health   # {"status":"ok","service":"brain"}
curl http://localhost:8000/health   # {"status":"ok","service":"engine"}
```

The dashboard is at **http://localhost:4000**
Login: username `admin`, password = value of `DASHBOARD_ADMIN_PASSWORD` in your `.env`

---

## 4. YouTube Authorization {#youtube-auth}

This is a **one-time** step. Tokens are saved to the database permanently and auto-refresh.

```bash
# Step 1: Open this URL in your browser
open http://localhost:3000/auth/youtube

# Sign in with your YouTube channel account.
# Click "Allow" on all permission scopes.

# Step 2: Confirm it worked
curl http://localhost:3000/auth/status
```

**Expected response:**
```json
{
  "connected": true,
  "expired": false,
  "scope": "https://www.googleapis.com/auth/youtube.upload ...",
  "expiryDate": 1745123456789
}
```

The YouTube connection status also shows in the top-right of the Dashboard navbar (green dot = connected, red = needs reauth).

---

## 5. Dashboard UI {#dashboard}

The dashboard is a Next.js app at **http://localhost:4000** (or your Railway URL).

### Login
- Username: `admin`
- Password: your `DASHBOARD_ADMIN_PASSWORD` value
- Sessions expire after 24 hours

### Main Dashboard (`/dashboard`)

The home screen shows four stat cards at the top:
- **Total Videos** — all projects ever created
- **In Progress** — actively running pipeline jobs
- **Ready to Upload** — rendered videos waiting for YouTube upload
- **Completed** — successfully uploaded to YouTube

Below the stats is the **Projects Table** showing all videos with their current status, niche, and actions.

**Creating a new video:**
1. Click **New Video** (top right)
2. Enter a niche topic (e.g. `Dopamine Detox Science`)
3. Click **Create** — the pipeline starts immediately

The table auto-refreshes every 5 seconds while any job is active, slowing to 30 seconds when idle.

**Pipeline statuses:**

| Status | Meaning |
|---|---|
| `DRAFT` | Job created, not yet picked up by worker |
| `SCRIPTING` | Claude generating the video script |
| `FETCHING_ASSETS` | Downloading voiceover audio + B-roll clips |
| `RENDERING` | MoviePy assembling the final MP4 |
| `READY_TO_UPLOAD` | Video rendered, waiting for YouTube upload |
| `COMPLETED` | Uploaded to YouTube |
| `FAILED` | Pipeline error — check the error message |

### Project Detail Page (`/dashboard/projects/:id`)

Click any row in the table to open the detail page. You'll see:
- **Pipeline timeline** — step-by-step progress stepper
- **Script Viewer** — the generated title, voiceover, and overlay captions
- **Upload button** — triggers YouTube upload (only visible when `READY_TO_UPLOAD`)
- **YouTube link** — opens the video in YouTube Studio once `COMPLETED`

---

## 6. Analytics & Usage Page {#analytics}

Navigate to **Analytics** in the top navbar (`/dashboard/analytics`).

### API Credits Section

Tracks your third-party API consumption across three services:

**Anthropic**
- Shows scripts generated, estimated token counts, and estimated cost in USD
- Pricing model: pay-as-you-go (~$0.01 per video at current Sonnet 4.6 rates)
- No monthly reset — charges accumulate and are billed monthly
- Link to console.anthropic.com for billing management

**ElevenLabs** (live data from their API)
- Shows characters used vs your plan limit
- Progress bar with colour coding: green (healthy) → yellow (>70%) → red (>90%)
- Shows your next reset date
- If you run out mid-month, voiceover generation stops until reset or upgrade

**Pexels**
- Tracks clips downloaded across all projects
- Estimated requests vs 20,000/month free tier limit
- Running out triggers 429 errors during the FETCHING_ASSETS stage

### YouTube Performance Section

- **Total Views, Likes, Comments** — pulled live from YouTube Data API for all uploaded videos
- **Per-video table** — individual stats + estimated revenue per video
- **Estimated Revenue** — calculated using $2.50–$5.00 CPM (industry average for Shorts)
  - Actual revenue depends on your channel's monetization status, audience geography, and AdSense
  - Enable monetization at studio.youtube.com → Monetization

### Platforms Section

| Platform | Status | Notes |
|---|---|---|
| YouTube Shorts | Active | OAuth upload, SEO metadata, private-first |
| Instagram Reels | Coming Soon | Will use Meta Graph API + same MP4 output |
| TikTok | Coming Soon | Will use TikTok Content Posting API |

---

## 7. Making Videos via API {#api-usage}

You can bypass the Dashboard and use the Brain API directly:

### Start a pipeline:
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"niche": "Health-Tech AI"}'
```

**Response:**
```json
{
  "id": "9e7c821c-4088-467c-a937-ce7e97ef603f",
  "niche": "Health-Tech AI",
  "status": "DRAFT",
  "message": "Pipeline started. Poll GET /projects/:id for status updates."
}
```

### Poll for progress:
```bash
curl http://localhost:3000/projects/9e7c821c-4088-467c-a937-ce7e97ef603f
```

Status progression: `DRAFT → SCRIPTING → FETCHING_ASSETS → RENDERING → READY_TO_UPLOAD`

**Typical timing:**

| Stage | Duration |
|---|---|
| SCRIPTING | ~5 seconds |
| FETCHING_ASSETS | ~30–60 seconds |
| RENDERING | ~2–4 minutes |
| **Total** | **~3–5 minutes** |

### Upload to YouTube:
```bash
curl -X POST http://localhost:3000/upload/9e7c821c-4088-467c-a937-ce7e97ef603f
```

**Response:**
```json
{
  "projectId": "9e7c821c-4088-467c-a937-ce7e97ef603f",
  "status": "COMPLETED",
  "youtubeVideoId": "dQw4w9WgXcQ",
  "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "title": "AI Diagnosed My Disease Before My Doctor Did — Here's How",
  "description": "Discover how AI-powered health tech is revolutionizing disease detection...",
  "tags": ["health tech", "AI medicine", "wearable technology"]
}
```

Videos upload as **Private**. Review in YouTube Studio and publish manually.

---

## 8. All API Endpoints {#endpoints}

### Brain (Port 3000)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/projects` | Create project + start pipeline |
| `GET` | `/projects` | List all projects (last 50) |
| `GET` | `/projects/:id` | Get project status + details |
| `POST` | `/upload/:projectId` | Upload to YouTube |
| `GET` | `/auth/youtube` | Start YouTube OAuth flow |
| `GET` | `/auth/status` | Check YouTube connection |
| `GET` | `/analytics` | API usage + YouTube stats |

### Engine (Port 8000)

Called automatically by the Brain worker. Useful for testing individual stages.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check |
| `POST` | `/generate-script` | Generate script only |
| `POST` | `/generate-assets` | Fetch audio + clips only |
| `POST` | `/generate-full` | Script + assets, no DB |
| `POST` | `/render` | Render MP4 from assets |

**Example — test script generation:**
```bash
curl -X POST http://localhost:8000/generate-script \
  -H "Content-Type: application/json" \
  -d '{"niche": "Morning Routine of Billionaires"}'
```

**Example — render from existing assets:**
```bash
curl -X POST http://localhost:8000/render \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "my-test-project",
    "audio_path": "/app/temp/audio/my-test-project.mp3",
    "clip_paths": ["/app/temp/clips/my-test-project/clip1.mp4"],
    "overlay_text": [
      {"timestamp": 0.0, "text": "5AM HABITS OF BILLIONAIRES", "duration": 3.0}
    ],
    "cleanup_temp": false
  }'
```

---

## 9. Monitoring & Logs {#monitoring}

```bash
# All services
docker compose logs -f

# Individual services
docker compose logs -f brain
docker compose logs -f engine
docker compose logs -f dashboard

# Copy a rendered video to your local machine
docker compose cp engine:/app/output/PROJECT_ID.mp4 ./my-video.mp4
```

**Healthy pipeline log:**
```
[Worker] Starting pipeline for project 9e7c821c (niche: "Health-Tech AI")
[Worker] [9e7c821c] Step 1: Generating script...
[Worker] [9e7c821c] Script ready: "AI Diagnosed My Disease Before My Doctor Did"
[Worker] [9e7c821c] Step 2: Fetching assets...
[Worker] [9e7c821c] Assets ready: 8 clips.
[Worker] [9e7c821c] Step 3: Rendering video...
[Worker] [9e7c821c] Render complete: /app/output/9e7c821c.mp4
[Worker] [9e7c821c] Pipeline complete — status: READY_TO_UPLOAD
```

**Reset everything (wipes DB and volumes):**
```bash
docker compose down -v
docker compose up --build
docker compose exec brain npx prisma migrate deploy
```

---

## 10. Niche Ideas & Best Practices {#niches}

### High-performing niche patterns:

```bash
# Finance
'{"niche": "Credit Score Hacks Nobody Talks About"}'
'{"niche": "How to Invest Your First $1000 in 2026"}'
'{"niche": "Passive Income Ideas That Actually Work"}'

# Psychology / Self-improvement
'{"niche": "Dark Psychology Tactics Used Against You Daily"}'
'{"niche": "Dopamine Detox: The Science Behind It"}'
'{"niche": "Why 1% Better Every Day Outperforms Motivation"}'

# Health / Fitness
'{"niche": "Cold Plunge Benefits Backed by Science"}'
'{"niche": "Seed Oils Are Destroying Your Health"}'
'{"niche": "Creatine: The Most Studied Supplement"}'

# Tech / AI
'{"niche": "AI Tools That Replace Your Marketing Team"}'
'{"niche": "How to Use AI to Make $5000 a Month"}'

# Philosophy
'{"niche": "Stoic Lessons That Changed My Life"}'
'{"niche": "Marcus Aurelius Quotes for Hard Times"}'
```

### Batch-create multiple videos:

```bash
#!/bin/bash
niches=(
  "Cold Plunge Benefits and Science"
  "Creatine: The Most Studied Supplement"
  "Why You Should Wake Up at 5AM"
  "Dopamine Detox: The Science Behind It"
  "Stoic Philosophy for Modern Life"
)

for niche in "${niches[@]}"; do
  echo "Creating: $niche"
  curl -s -X POST http://localhost:3000/projects \
    -H "Content-Type: application/json" \
    -d "{\"niche\": \"$niche\"}"
  sleep 2
done
```

### Check all statuses at once:

```bash
curl -s http://localhost:3000/projects | python3 -c "
import sys, json
for p in json.load(sys.stdin):
    print(f\"{p['status']:20} | {p['niche']}\")
"
```

---

## 11. Troubleshooting {#troubleshooting}

| Problem | Likely Cause | Fix |
|---|---|---|
| Login fails on dashboard | `DASHBOARD_ADMIN_PASSWORD` not set | Check `dashboard/.env.local` exists with the correct value |
| `status: FAILED`, `fetch failed` | Engine isn't running | `docker compose up engine` |
| `credit balance too low` | Anthropic out of credits | Top up at console.anthropic.com |
| `ElevenLabs 401` | Key missing TTS permission | Regenerate key at elevenlabs.io with TTS permission |
| `No video file found on this project` | `videoPath` not saved after render | A bug that has been fixed; if stuck, check if the `.mp4` exists in `engine/output/` and update DB manually |
| `No YouTube OAuth tokens` | Never ran `/auth/youtube` | Open `http://localhost:3000/auth/youtube` |
| `409 Project is not ready` | Render still in progress | Poll `/projects/:id` until `READY_TO_UPLOAD` |
| `projects.filter is not a function` | SWR received non-array from API | Fixed in current version; clear browser cache and reload |
| Rendering is slow | CPU-bound MoviePy | Normal locally (~2–5 min). Railway with 2+ vCPUs is faster |
| `All clips failed to load` | Corrupt Pexels download | Create a new project |
| ElevenLabs shows "Unconfigured" in Analytics | Key not loaded in brain process | Ensure `.env` has `ELEVENLABS_API_KEY` and restart brain |

---

## 12. Deploy to Railway {#railway}

Railway is the recommended cloud host. It handles Docker builds, managed Postgres and Redis, automatic HTTPS, and rolling deployments from GitHub.

**Estimated cost: ~$20–40/month** depending on traffic and storage.

---

### Step 1 — Install Railway CLI and log in

```bash
# macOS
brew install railway

# or via npm
npm install -g @railway/cli

# Log in
railway login
```

---

### Step 2 — Push your repo to GitHub (if not done)

```bash
git remote -v   # confirm it points to your GitHub repo
git push
```

---

### Step 3 — Create a Railway project

Go to [railway.app](https://railway.app) → **New Project** → **Empty Project**.
Name it `ai-content-factory`.

---

### Step 4 — Add Postgres and Redis

In the Railway project dashboard:

1. Click **+ New** → **Database** → **Add PostgreSQL** → Deploy
2. Click **+ New** → **Database** → **Add Redis** → Deploy

Railway automatically creates `DATABASE_URL` and `REDIS_URL` variables for these services.

---

### Step 5 — Add the Brain service

1. Click **+ New** → **GitHub Repo** → select `ai-content-factory`
2. Name the service **brain**
3. In service settings → **Source** → set **Root Directory** to `/brain`
4. Railway will detect `brain/railway.json` and use the Dockerfile automatically

**Set environment variables** for the brain service (Settings → Variables):

```
DATABASE_URL           = ${{Postgres.DATABASE_URL}}
REDIS_URL              = ${{Redis.REDIS_URL}}
ENGINE_URL             = https://YOUR-ENGINE-SERVICE.up.railway.app
ANTHROPIC_API_KEY      = sk-ant-api03-...
GOOGLE_OAUTH_CLIENT_SECRET_JSON = <paste full contents of oauth_client_secret.json>
GOOGLE_OAUTH_REDIRECT_URI = https://YOUR-BRAIN-SERVICE.up.railway.app/oauth2callback
PORT                   = 3000
```

> **GOOGLE_OAUTH_CLIENT_SECRET_JSON tip:** Run `cat brain/oauth_client_secret.json | tr -d '\n'` and paste the single-line JSON as the value. Never commit this file to Git.

> **ENGINE_URL:** Fill this in after deploying the Engine service in Step 6.

---

### Step 6 — Add the Engine service

1. Click **+ New** → **GitHub Repo** → same repo
2. Name it **engine**
3. Root Directory: `/engine`

**Environment variables:**

```
DATABASE_URL        = ${{Postgres.DATABASE_URL}}
ANTHROPIC_API_KEY   = sk-ant-api03-...
ELEVENLABS_API_KEY  = sk_...
PEXELS_API_KEY      = your-pexels-key
PORT                = 8000
```

After deploy, copy the engine's public URL and **go back to the brain service** to set `ENGINE_URL`.

---

### Step 7 — Add the Dashboard service

1. Click **+ New** → **GitHub Repo** → same repo
2. Name it **dashboard**
3. Root Directory: `/dashboard`

**Environment variables:**

```
BRAIN_URL                 = https://YOUR-BRAIN-SERVICE.up.railway.app
NEXTAUTH_URL              = https://YOUR-DASHBOARD-SERVICE.up.railway.app
NEXTAUTH_SECRET           = <run: openssl rand -base64 32>
DASHBOARD_ADMIN_PASSWORD  = YourStrongPassword2026!
PORT                      = 4000
```

---

### Step 8 — Run database migrations

After the brain service first deploys, open a Railway shell or run via CLI:

```bash
railway run --service brain npx prisma migrate deploy
```

Or use the Railway dashboard → brain service → **Shell** tab:
```bash
npx prisma migrate deploy
```

---

### Step 9 — Set up YouTube OAuth for production

Your YouTube OAuth was configured for `localhost`. You need to add the Railway URL:

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → your OAuth 2.0 Client
3. Add to **Authorized redirect URIs**:
   ```
   https://YOUR-BRAIN-SERVICE.up.railway.app/oauth2callback
   ```
4. Save, then re-download the credentials JSON
5. Update `GOOGLE_OAUTH_CLIENT_SECRET_JSON` in the Railway brain service variables
6. Open `https://YOUR-BRAIN-SERVICE.up.railway.app/auth/youtube` in your browser
7. Complete the OAuth flow — tokens save to the Railway Postgres database

---

### Step 10 — Verify the deployment

```bash
# Brain health
curl https://YOUR-BRAIN-SERVICE.up.railway.app/health

# Engine health
curl https://YOUR-ENGINE-SERVICE.up.railway.app/health

# Dashboard
open https://YOUR-DASHBOARD-SERVICE.up.railway.app
```

Log in with `admin` / your `DASHBOARD_ADMIN_PASSWORD`. Create a test video and watch it progress through the pipeline.

---

### Railway Environment Variables Reference

**Brain service:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` |
| `ENGINE_URL` | `https://YOUR-ENGINE.up.railway.app` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `GOOGLE_OAUTH_CLIENT_SECRET_JSON` | Full JSON content of oauth_client_secret.json |
| `GOOGLE_OAUTH_REDIRECT_URI` | `https://YOUR-BRAIN.up.railway.app/oauth2callback` |
| `PORT` | `3000` |

**Engine service:**

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` |
| `ELEVENLABS_API_KEY` | `sk_...` |
| `PEXELS_API_KEY` | `your-key` |
| `PORT` | `8000` |

**Dashboard service:**

| Variable | Value |
|---|---|
| `BRAIN_URL` | `https://YOUR-BRAIN.up.railway.app` |
| `NEXTAUTH_URL` | `https://YOUR-DASHBOARD.up.railway.app` |
| `NEXTAUTH_SECRET` | 32-byte random string |
| `DASHBOARD_ADMIN_PASSWORD` | Your strong password |
| `PORT` | `4000` |

---

### Persistent Storage for Rendered Videos

The engine stores rendered MP4 files in `/app/output`. On Railway, add a volume to the engine service:

1. Engine service → **Volumes** → **Add Volume**
2. Mount path: `/app/output`
3. This persists videos across deployments

Without a volume, rendered videos are lost on each redeploy.

---

### Continuous Deployment

Railway auto-deploys when you push to the `main` branch. To disable for a service:
Settings → Deployments → turn off **Auto Deploy**.

To manually trigger a deploy:
```bash
railway up --service brain
railway up --service engine
railway up --service dashboard
```

---

### Cost Breakdown (Railway)

| Service | Resource | Estimated cost |
|---|---|---|
| Brain | 512MB RAM, 0.5 vCPU | ~$5/month |
| Engine | 1GB RAM, 1 vCPU (rendering is CPU-heavy) | ~$10/month |
| Dashboard | 256MB RAM, 0.25 vCPU | ~$3/month |
| PostgreSQL | 1GB storage | ~$5/month |
| Redis | 256MB | ~$3/month |
| **Total** | | **~$26/month** |

---

### Alternative: DigitalOcean Droplet (~$24/month, more control)

```bash
# Create a $24/month Droplet (2 vCPU, 4GB RAM, Ubuntu 24.04)
ssh root@YOUR_DROPLET_IP
curl -fsSL https://get.docker.com | sh
git clone https://github.com/saravanakumar-paramasivan/ai-content-factory.git
cd ai-content-factory
cp .env.example .env && nano .env
# Paste oauth_client_secret.json into brain/
docker compose up -d --build
docker compose exec brain npx prisma migrate deploy
```

Update Google Cloud Console redirect URI to `http://YOUR_DROPLET_IP:3000/oauth2callback`.
