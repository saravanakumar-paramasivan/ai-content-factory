import { Router, Request, Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { google } from 'googleapis';
import { getStoredTokens } from '../services/tokenStore';
import { createOAuth2Client } from '../services/youtubeAuth';

export const trendingRouter = Router();

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TrendingTopic {
  id: string;
  title: string;
  category: string;
  category_label: string;
  reason: string;
  audience: string;
  viral_score: number;
  keywords: string[];
  source: 'ai' | 'youtube';
  youtube_views?: number;
  youtube_url?: string;
}

export interface CategoryMeta {
  id: string;
  label: string;
  region_hint: string;
  emoji: string;
}

// ── Category registry ─────────────────────────────────────────────────────────

const CATEGORIES: Record<string, { label: string; region_hint: string; emoji: string; yt_category_id: string }> = {
  tamil_food:        { label: 'Tamil Food & Recipes',         region_hint: 'Tamil Nadu, India',   emoji: '🍛', yt_category_id: '26' },
  tamil_kids:        { label: 'Tamil Kids Stories',           region_hint: 'Tamil Nadu, India',   emoji: '👦', yt_category_id: '27' },
  indian_finance:    { label: 'Indian Finance & Money',       region_hint: 'India',               emoji: '💰', yt_category_id: '22' },
  health_wellness:   { label: 'Health & Wellness',            region_hint: 'Global',              emoji: '🧘', yt_category_id: '26' },
  tech_ai:           { label: 'Tech & AI',                    region_hint: 'Global',              emoji: '🤖', yt_category_id: '28' },
  motivation:        { label: 'Motivation & Self-Help',       region_hint: 'Global',              emoji: '🔥', yt_category_id: '22' },
  cooking_hacks:     { label: 'Cooking & Kitchen Hacks',      region_hint: 'Global',              emoji: '🍳', yt_category_id: '26' },
  kids_education:    { label: 'Kids Education',               region_hint: 'Global',              emoji: '📚', yt_category_id: '27' },
  travel_culture:    { label: 'Travel & Culture',             region_hint: 'India',               emoji: '✈️',  yt_category_id: '19' },
  beauty_skincare:   { label: 'Beauty & Skincare',            region_hint: 'Global',              emoji: '💅', yt_category_id: '22' },
  fitness_workout:   { label: 'Fitness & Workout',            region_hint: 'Global',              emoji: '💪', yt_category_id: '17' },
  business_startup:  { label: 'Business & Entrepreneurship',  region_hint: 'India',               emoji: '🚀', yt_category_id: '22' },
};

// ── In-memory cache ────────────────────────────────────────────────────────────

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ── AI topic generation ────────────────────────────────────────────────────────

async function generateAITopics(categoryId: string, cat: { label: string; region_hint: string }): Promise<TrendingTopic[]> {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const prompt = `You are a viral YouTube Shorts content strategist for 2026. Generate exactly 12 trending topic ideas for YouTube Shorts.

Category: "${cat.label}"
Target audience region: "${cat.region_hint}"

Requirements for each topic:
- Specific enough to write a 60-second script
- Trending or high search-volume in 2026
- Works as a 1080×1920 vertical short-form video
- Title must be curiosity-driving and under 80 characters

Return a JSON array of exactly 12 objects:
[
  {
    "title": "Exact niche string — specific, engaging, under 80 chars",
    "reason": "Why it is trending right now — 1 sentence with a concrete data point or trend",
    "audience": "Specific demographic who will watch this",
    "viral_score": 8.5,
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
]

viral_score is 1–10: high search volume + high engagement potential + manageable competition = higher score.
Return ONLY the JSON array. No markdown fences, no explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (response.content[0] as { text: string }).text
    .trim()
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/\s*```\s*$/im, '');

  const items = JSON.parse(raw) as Array<{
    title: string;
    reason: string;
    audience: string;
    viral_score: number;
    keywords: string[];
  }>;

  return items.map((item, i) => ({
    id: `ai-${categoryId}-${i}`,
    title: item.title,
    category: categoryId,
    category_label: cat.label,
    reason: item.reason,
    audience: item.audience,
    viral_score: Math.round(Math.min(10, Math.max(1, Number(item.viral_score))) * 10) / 10,
    keywords: Array.isArray(item.keywords) ? item.keywords.slice(0, 5) : [],
    source: 'ai' as const,
  }));
}

// ── YouTube trending fetch ─────────────────────────────────────────────────────

async function fetchYouTubeTrending(ytCategoryId: string, region: string, categoryId: string, categoryLabel: string): Promise<TrendingTopic[]> {
  try {
    const tokens = await getStoredTokens();
    if (!tokens) return [];

    const auth = createOAuth2Client();
    auth.setCredentials({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken ?? undefined,
      expiry_date: tokens.expiryDate ?? undefined,
    });
    if (tokens.expiryDate && tokens.expiryDate < Date.now()) {
      const { credentials } = await auth.refreshAccessToken();
      auth.setCredentials(credentials);
    }

    const youtube = google.youtube({ version: 'v3', auth });
    const result = await youtube.videos.list({
      part: ['snippet', 'statistics'],
      chart: 'mostPopular',
      regionCode: region,
      videoCategoryId: ytCategoryId,
      maxResults: 8,
    });

    return (result.data.items ?? []).map((item, i) => {
      const views = Number(item.statistics?.viewCount ?? 0);
      const likes = Number(item.statistics?.likeCount ?? 0);
      // Engagement ratio → approx viral score offset on top of base 6
      const engagementBoost = views > 0 ? Math.min(3, (likes / views) * 100) : 0;
      return {
        id: `yt-${region}-${i}-${item.id}`,
        title: item.snippet?.title ?? '',
        category: categoryId,
        category_label: categoryLabel,
        reason: `Trending on YouTube ${region} with ${views.toLocaleString()} views`,
        audience: 'YouTube trending viewers',
        viral_score: Math.round((6 + engagementBoost) * 10) / 10,
        keywords: (item.snippet?.tags ?? []).slice(0, 5),
        source: 'youtube' as const,
        youtube_views: views,
        youtube_url: `https://www.youtube.com/watch?v=${item.id}`,
      };
    });
  } catch {
    return [];
  }
}

// ── Route: GET /trending ───────────────────────────────────────────────────────

trendingRouter.get('/', async (req: Request, res: Response) => {
  const categoryId = (req.query.category as string) || 'tamil_food';
  const region    = (req.query.region as string)   || 'IN';
  const refresh   = req.query.refresh === 'true';

  const cacheKey = `${categoryId}:${region}`;

  if (!refresh) {
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }
  }

  const cat = CATEGORIES[categoryId] ?? { label: categoryId, region_hint: region, emoji: '📹', yt_category_id: '22' };

  const [aiResult, ytResult] = await Promise.allSettled([
    generateAITopics(categoryId, cat),
    fetchYouTubeTrending(cat.yt_category_id, region, categoryId, cat.label),
  ]);

  const topics: TrendingTopic[] = [
    ...(aiResult.status === 'fulfilled' ? aiResult.value : []),
    ...(ytResult.status === 'fulfilled' ? ytResult.value : []),
  ];

  const payload = {
    category: categoryId,
    category_label: cat.label,
    region,
    topics,
    categories: Object.entries(CATEGORIES).map(([id, info]) => ({
      id,
      label: info.label,
      region_hint: info.region_hint,
      emoji: info.emoji,
    })) satisfies CategoryMeta[],
    generated_at: new Date().toISOString(),
    cached: false,
  };

  cache.set(cacheKey, { data: { ...payload, cached: true }, expiresAt: Date.now() + CACHE_TTL });
  return res.json(payload);
});
