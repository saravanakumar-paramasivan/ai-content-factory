# AI Content Factory — Complete User Guide

## Table of Contents
1. [How It Works](#architecture)
2. [Prerequisites](#prerequisites)
3. [First-Time Setup](#setup)
4. [YouTube Authorization](#youtube-auth)
5. [Making Your First Video](#first-video)
6. [All API Endpoints with Examples](#endpoints)
7. [Monitoring & Logs](#monitoring)
8. [Niche Ideas & Best Practices](#niches)
9. [Troubleshooting](#troubleshooting)
10. [Cloud Hosting Guide](#cloud)

---

## 1. How It Works {#architecture}

```
You send one API call with a niche topic.
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
        │     Claude Sonnet → VideoScript       │
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
        │  POST /upload/:projectId              │
        │     Claude generates SEO metadata     │
        │     Uploads MP4 to YouTube (Private)  │
        │     Status → COMPLETED                │
        └───────────────────────────────────────┘
```

**Services used:**

| Service | Purpose | Cost model |
|---|---|---|
| Anthropic Claude Sonnet | Script + YouTube metadata | ~$0.01–0.03 per video |
| ElevenLabs | Text-to-speech voiceover | ~500 chars/video = free tier covers ~24 videos/month |
| Pexels | Stock video clips | Free |
| YouTube Data API | Upload | Free (10,000 units/day) |

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

**YouTube OAuth (one-time setup):**
- Google Cloud Console → New Project → Enable YouTube Data API v3
- Credentials → OAuth 2.0 Client ID → Web Application
- Authorized redirect URI: `http://localhost:3000/oauth2callback`
- Download as `oauth_client_secret.json`, place in `brain/`

---

## 3. First-Time Setup {#setup}

```bash
# 1. Clone the repo
git clone https://github.com/saravanakumar-paramasivan/ai-content-factory.git
cd ai-content-factory

# 2. Copy and fill in your API keys
cp .env.example .env
# Edit .env and add your real keys

# 3. Place your YouTube OAuth file
# Copy oauth_client_secret.json into brain/

# 4. Start all services
docker compose up --build

# 5. Run the database migration (first time only)
docker compose exec brain npx prisma migrate deploy
```

**Verify everything is running:**
```bash
curl http://localhost:3000/health
# {"status":"ok","service":"brain"}

curl http://localhost:8000/health
# {"status":"ok","service":"engine"}
```

---

## 4. YouTube Authorization {#youtube-auth}

This is a one-time step. The token is saved to the database permanently.

```bash
# Step 1: Open this URL in your browser
open http://localhost:3000/auth/youtube
# Sign in with the YouTube account you want to upload to.
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

Tokens auto-refresh — you only need to do this once.

---

## 5. Making Your First Video {#first-video}

### Start the pipeline:

```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"niche": "Health-Tech AI"}'
```

**Response (instant):**
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

Status progression:
```
DRAFT → SCRIPTING → FETCHING_ASSETS → RENDERING → READY_TO_UPLOAD
```

Typical timing:

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

The video is uploaded as **Private**. Go to YouTube Studio, review it, then publish manually.

---

## 6. All API Endpoints {#endpoints}

### Brain (Port 3000)

#### `POST /projects` — Create a new video project

```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"niche": "Personal Finance for Gen Z"}'
```

#### `GET /projects/:id` — Check pipeline status

```bash
curl http://localhost:3000/projects/9e7c821c-4088-467c-a937-ce7e97ef603f
```

#### `GET /projects` — List all projects (last 50)

```bash
curl http://localhost:3000/projects
```

#### `POST /upload/:projectId` — Upload to YouTube

```bash
curl -X POST http://localhost:3000/upload/9e7c821c-4088-467c-a937-ce7e97ef603f
```

#### `GET /auth/status` — Check YouTube connection

```bash
curl http://localhost:3000/auth/status
```

---

### Engine (Port 8000)

These are called automatically by the Brain worker. Useful for testing individual stages.

#### `POST /generate-script` — Generate a script only

```bash
curl -X POST http://localhost:8000/generate-script \
  -H "Content-Type: application/json" \
  -d '{"niche": "Morning Routine of Billionaires"}'
```

#### `POST /generate-assets` — Fetch audio + clips

```bash
curl -X POST http://localhost:8000/generate-assets \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "my-test-project",
    "voiceover_text": "While you hit snooze, they are already two hours into their day...",
    "stock_keywords": ["alarm clock 5am morning", "cold shower cinematic", "meditation sunrise"]
  }'
```

#### `POST /generate-full` — Script + assets in one call (no DB)

```bash
curl -X POST http://localhost:8000/generate-full \
  -H "Content-Type: application/json" \
  -d '{"niche": "Sleep Optimization Science"}'
```

#### `POST /render` — Render MP4 from existing assets

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

## 7. Monitoring & Logs {#monitoring}

```bash
# All services
docker compose logs -f

# Individual services
docker compose logs -f brain
docker compose logs -f engine

# Copy a rendered video to your local machine
docker compose cp engine:/app/output/PROJECT_ID.mp4 ./my-video.mp4
```

**Healthy pipeline log output:**
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

### Reset everything:
```bash
docker compose down -v
docker compose up --build
docker compose exec brain npx prisma migrate deploy
```

---

## 8. Niche Ideas & Best Practices {#niches}

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

### Check all project statuses at once:

```bash
curl -s http://localhost:3000/projects | python3 -c "
import sys, json
for p in json.load(sys.stdin):
    print(f\"{p['status']:20} | {p['niche']}\")
"
```

---

## 9. Troubleshooting {#troubleshooting}

| Problem | Likely Cause | Fix |
|---|---|---|
| `status: FAILED`, `fetch failed` | Engine isn't running | `docker compose up engine` |
| `credit balance too low` | Anthropic out of credits | Top up at console.anthropic.com |
| `ElevenLabs 401` | API key missing TTS permission | Regenerate key at elevenlabs.io |
| `No YouTube OAuth tokens` | Never ran `/auth/youtube` | Open `http://localhost:3000/auth/youtube` |
| `409 Project is not ready` | Render still in progress | Poll `/projects/:id` until `READY_TO_UPLOAD` |
| Rendering is slow | CPU-bound MoviePy | Normal locally (~2–5 min). Use cloud for speed. |
| `All clips failed to load` | Corrupt download | Create a new project |

---

## 10. Cloud Hosting {#cloud}

### Recommended: Railway (~$35/month, easiest)

```bash
brew install railway
railway login
railway init
railway up
# Add Postgres + Redis plugins in the Railway dashboard
# Set ANTHROPIC_API_KEY, ELEVENLABS_API_KEY, PEXELS_API_KEY in dashboard
```

### Alternative: DigitalOcean Droplet (~$24/month, most control)

```bash
# Create a $24/month Droplet (2 vCPU, 4GB RAM, Ubuntu 24.04)
ssh root@YOUR_DROPLET_IP
curl -fsSL https://get.docker.com | sh
git clone https://github.com/saravanakumar-paramasivan/ai-content-factory.git
cd ai-content-factory
cp .env.example .env && nano .env
docker compose up -d --build
docker compose exec brain npx prisma migrate deploy
```

> **Note for cloud OAuth:** Update the redirect URI in Google Cloud Console from `http://localhost:3000/oauth2callback` to `http://YOUR_SERVER_IP:3000/oauth2callback`.

### Comparison

| | Railway | DigitalOcean | AWS |
|---|---|---|---|
| **Setup time** | 30 min | 1 hour | 2–4 hours |
| **Cost/month** | ~$35 | ~$24 | ~$50–80 |
| **Ease of use** | ★★★★★ | ★★★★☆ | ★★☆☆☆ |
| **Best for** | Getting started | Full control on budget | Production scale |
