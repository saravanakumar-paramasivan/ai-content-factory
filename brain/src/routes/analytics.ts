import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { prisma } from '../lib/db';
import { getStoredTokens } from '../services/tokenStore';
import { createOAuth2Client } from '../services/youtubeAuth';

export const analyticsRouter = Router();

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ANTHROPIC_INPUT_COST_PER_M = 3.0;  // USD per 1M tokens (Sonnet 4.6)
const ANTHROPIC_OUTPUT_COST_PER_M = 15.0;
// Average per project: script (~800 in, ~500 out) + metadata (~300 in, ~150 out)
const AVG_INPUT_TOKENS = 1100;
const AVG_OUTPUT_TOKENS = 650;

function currentMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

function buildAuth() {
  try { return createOAuth2Client(); } catch { return null; }
}

// GET /analytics
analyticsRouter.get('/', async (_req: Request, res: Response) => {
  const month = currentMonth();

  // ── 1. DB stats ──────────────────────────────────────────────────────────
  const allProjects = await prisma.videoProject.findMany({
    select: { id: true, status: true, clipPaths: true, youtubeVideoId: true, youtubeTitle: true, youtubeUrl: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  // Group by month (YYYY-MM)
  const monthCounts: Record<string, number> = {};
  for (const p of allProjects) {
    const ym = p.createdAt.toISOString().slice(0, 7);
    monthCounts[ym] = (monthCounts[ym] ?? 0) + 1;
  }
  const byMonth = Object.entries(monthCounts)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 6)
    .map(([m, count]) => ({ month: m, label: monthLabel(m), count }));

  const statusCounts = allProjects.reduce<Record<string, number>>((acc, p) => {
    acc[p.status] = (acc[p.status] ?? 0) + 1;
    return acc;
  }, {});

  // Pexels: count total clips downloaded across all projects
  let totalClips = 0;
  for (const p of allProjects) {
    const clips = p.clipPaths as string[] | null;
    if (Array.isArray(clips)) totalClips += clips.length;
  }

  // Anthropic: estimate from completed+failed (scripting was attempted)
  const scriptingAttempts = allProjects.filter(
    p => !['DRAFT'].includes(p.status)
  ).length;
  const totalInputTokens = scriptingAttempts * AVG_INPUT_TOKENS;
  const totalOutputTokens = scriptingAttempts * AVG_OUTPUT_TOKENS;
  const estimatedCostUsd =
    (totalInputTokens / 1_000_000) * ANTHROPIC_INPUT_COST_PER_M +
    (totalOutputTokens / 1_000_000) * ANTHROPIC_OUTPUT_COST_PER_M;

  // ── 2. ElevenLabs live ───────────────────────────────────────────────────
  let elevenlabs: Record<string, unknown> = { available: false };
  if (ELEVENLABS_API_KEY) {
    try {
      const elRes = await fetch('https://api.elevenlabs.io/v1/user', {
        headers: { 'xi-api-key': ELEVENLABS_API_KEY },
      });
      if (elRes.ok) {
        const elData = await elRes.json() as Record<string, unknown>;
        const sub = elData.subscription as Record<string, unknown> | undefined;
        const used = Number(sub?.character_count ?? 0);
        const limit = Number(sub?.character_limit ?? 0);
        const resetUnix = Number(sub?.next_character_count_reset_unix ?? 0);
        const pct = limit > 0 ? Math.round((used / limit) * 100) : 0;
        elevenlabs = {
          available: true,
          tier: String(sub?.tier ?? 'unknown'),
          characters_used: used,
          characters_limit: limit,
          percent_used: pct,
          reset_date: resetUnix ? new Date(resetUnix * 1000).toISOString().slice(0, 10) : null,
          status: pct >= 90 ? 'critical' : pct >= 70 ? 'warning' : 'healthy',
        };
      }
    } catch {
      // non-fatal
    }
  }

  // ── 3. YouTube video stats ───────────────────────────────────────────────
  const uploadedProjects = allProjects.filter(p => p.youtubeVideoId);
  let youtubeVideos: unknown[] = uploadedProjects.map(p => ({
    projectId: p.id,
    youtubeVideoId: p.youtubeVideoId,
    title: p.youtubeTitle,
    url: p.youtubeUrl,
    stats: null,
  }));

  try {
    const tokens = await getStoredTokens();
    const auth = buildAuth();
    if (tokens && auth && uploadedProjects.length > 0) {
      auth.setCredentials({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken ?? undefined,
        expiry_date: tokens.expiryDate ?? undefined,
        token_type: tokens.tokenType ?? undefined,
        scope: tokens.scope ?? undefined,
      });
      if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
        const { credentials } = await auth.refreshAccessToken();
        auth.setCredentials(credentials);
      }

      const youtube = google.youtube({ version: 'v3', auth });
      const ids = uploadedProjects.map(p => p.youtubeVideoId!).join(',');
      const ytRes = await youtube.videos.list({
        part: ['statistics', 'snippet'],
        id: [ids],
      });

      const statsMap: Record<string, unknown> = {};
      for (const item of ytRes.data.items ?? []) {
        statsMap[item.id!] = {
          viewCount: Number(item.statistics?.viewCount ?? 0),
          likeCount: Number(item.statistics?.likeCount ?? 0),
          commentCount: Number(item.statistics?.commentCount ?? 0),
          publishedAt: item.snippet?.publishedAt,
        };
      }
      youtubeVideos = uploadedProjects.map(p => ({
        projectId: p.id,
        youtubeVideoId: p.youtubeVideoId,
        title: p.youtubeTitle,
        url: p.youtubeUrl,
        stats: statsMap[p.youtubeVideoId!] ?? null,
      }));
    }
  } catch {
    // YouTube stats are best-effort
  }

  const ytTotals = youtubeVideos.reduce(
    (acc: { views: number; likes: number; comments: number }, v) => {
      const s = (v as Record<string, unknown>).stats as Record<string, number> | null;
      if (s) {
        acc.views += s.viewCount ?? 0;
        acc.likes += s.likeCount ?? 0;
        acc.comments += s.commentCount ?? 0;
      }
      return acc;
    },
    { views: 0, likes: 0, comments: 0 }
  );

  // ── 4. Response ──────────────────────────────────────────────────────────
  return res.json({
    period: { month, label: monthLabel(month) },
    projects: {
      total: allProjects.length,
      by_status: statusCounts,
      by_month: byMonth,
    },
    apis: {
      anthropic: {
        model: 'claude-sonnet-4-6',
        scripting_attempts: scriptingAttempts,
        estimated_input_tokens: totalInputTokens,
        estimated_output_tokens: totalOutputTokens,
        estimated_cost_usd: Math.round(estimatedCostUsd * 10000) / 10000,
        billing_type: 'pay-as-you-go',
        billing_url: 'https://console.anthropic.com',
        renewal: 'No reset — charges accumulate, pay monthly invoice',
        impact: 'Each video uses ~$0.01 in AI credits. Low cost.',
      },
      elevenlabs: elevenlabs,
      pexels: {
        available: true,
        clips_downloaded: totalClips,
        requests_estimated: Math.ceil(totalClips * 1.5), // search + download
        monthly_limit: 200,        // requests/hour (not per-month on free tier)
        plan_limit_monthly: 20000, // free tier approximate
        renewal: 'Monthly (resets on the 1st)',
        impact: 'B-roll clips. Running low triggers 429 errors in rendering.',
        billing_url: 'https://www.pexels.com/api/',
      },
    },
    youtube: {
      connected: uploadedProjects.length > 0,
      videos_uploaded: uploadedProjects.length,
      videos: youtubeVideos,
      totals: ytTotals,
    },
  });
});
