'use client';
import { useState, useCallback } from 'react';
import useSWR from 'swr';
import {
  TrendingUp, RefreshCw, Sparkles, Youtube, Globe,
  Users, Tag, Zap, ChevronRight, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { TrendingData, TrendingTopic, TrendingCategory } from '@/types';
import { CreateVideoDialog } from '@/components/CreateVideoDialog';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

// ── Constants ────────────────────────────────────────────────────────────────

const REGIONS = [
  { code: 'IN', label: '🇮🇳 India' },
  { code: 'US', label: '🇺🇸 USA' },
  { code: 'GB', label: '🇬🇧 UK' },
  { code: 'AU', label: '🇦🇺 Australia' },
  { code: 'CA', label: '🇨🇦 Canada' },
];

// ── Fetcher ──────────────────────────────────────────────────────────────────

function buildKey(category: string, region: string, refresh: boolean) {
  return `/api/trending?category=${category}&region=${region}${refresh ? '&refresh=true' : ''}`;
}

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

// ── Sub-components ───────────────────────────────────────────────────────────

function ViralScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;
  const color = score >= 8 ? 'bg-emerald-500' : score >= 6 ? 'bg-yellow-500' : 'bg-muted-foreground';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className={cn('text-xs font-semibold tabular-nums',
        score >= 8 ? 'text-emerald-400' : score >= 6 ? 'text-yellow-400' : 'text-muted-foreground'
      )}>
        {score.toFixed(1)}
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="h-5 w-16 rounded bg-muted" />
      </div>
      <div className="h-4 w-full rounded bg-muted" />
      <div className="h-4 w-3/4 rounded bg-muted" />
      <div className="h-3 w-full rounded bg-muted" />
      <div className="h-3 w-2/3 rounded bg-muted" />
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full bg-muted" />
        <div className="h-5 w-20 rounded-full bg-muted" />
      </div>
      <div className="h-8 w-full rounded bg-muted" />
    </div>
  );
}

function TopicCard({
  topic,
  onGenerate,
}: {
  topic: TrendingTopic;
  onGenerate: (niche: string) => void;
}) {
  const isYT = topic.source === 'youtube';

  return (
    <div className={cn(
      'rounded-xl border bg-card p-5 flex flex-col gap-3 hover:border-primary/40 transition-colors group',
      isYT ? 'border-red-500/20' : 'border-border',
    )}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isYT ? (
            <span className="flex items-center gap-1 text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
              <Youtube className="h-3 w-3" /> Trending
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">
              <Sparkles className="h-3 w-3" /> AI Pick
            </span>
          )}
          <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
            {topic.category_label}
          </span>
        </div>
        {isYT && topic.youtube_url && (
          <a href={topic.youtube_url} target="_blank" rel="noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
        {topic.title}
      </h3>

      {/* Viral score */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <Zap className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Viral Score</span>
        </div>
        <ViralScoreBar score={topic.viral_score} />
      </div>

      {/* Why trending */}
      <div className="flex gap-1.5 text-xs text-muted-foreground">
        <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" />
        <span className="line-clamp-2">{topic.reason}</span>
      </div>

      {/* Audience */}
      <div className="flex gap-1.5 text-xs text-muted-foreground">
        <Users className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span className="line-clamp-1">{topic.audience}</span>
      </div>

      {/* Views (YouTube only) */}
      {isYT && topic.youtube_views != null && (
        <div className="text-xs text-muted-foreground">
          👁 {topic.youtube_views.toLocaleString()} views
        </div>
      )}

      {/* Keywords */}
      {topic.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1 items-center">
          <Tag className="h-3 w-3 text-muted-foreground shrink-0" />
          {topic.keywords.map(k => (
            <span key={k} className="text-xs bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded">
              {k}
            </span>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => onGenerate(topic.title)}
        className="mt-auto w-full flex items-center justify-center gap-2 rounded-lg bg-primary/10 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 text-primary text-sm font-medium py-2 transition-all"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Use This Topic
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

interface TrendingClientProps {
  initialData: TrendingData;
}

export function TrendingClient({ initialData }: TrendingClientProps) {
  const router = useRouter();
  const [category, setCategory] = useState(initialData.category);
  const [region, setRegion] = useState(initialData.region);
  const [forceRefresh, setForceRefresh] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedNiche, setSelectedNiche] = useState('');

  const swrKey = buildKey(category, region, forceRefresh);
  const { data, isLoading, isValidating } = useSWR<TrendingData>(swrKey, fetcher, {
    fallbackData: category === initialData.category && region === initialData.region ? initialData : undefined,
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  });

  const categories: TrendingCategory[] = data?.categories ?? initialData.categories;
  const topics = data?.topics ?? [];
  const aiTopics = topics.filter(t => t.source === 'ai');
  const ytTopics = topics.filter(t => t.source === 'youtube');

  const handleRefresh = useCallback(() => {
    setForceRefresh(v => !v);
    toast.info('Refreshing topics…', { description: 'This may take ~5 seconds.' });
  }, []);

  function handleGenerate(niche: string) {
    setSelectedNiche(niche);
    setDialogOpen(true);
  }

  function handleCreated() {
    setDialogOpen(false);
    toast.success('Video pipeline started!', {
      description: 'Track progress on the dashboard.',
      action: { label: 'View Dashboard', onClick: () => router.push('/dashboard') },
    });
  }

  const spinning = isLoading || isValidating;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-primary" />
            Trending Topics
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI-curated + live YouTube trends. Pick a topic and generate a video instantly.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Region selector */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
          </div>
          <select
            value={region}
            onChange={e => { setRegion(e.target.value); setForceRefresh(false); }}
            className="text-xs rounded-lg border border-border bg-card text-foreground px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {REGIONS.map(r => (
              <option key={r.code} value={r.code}>{r.label}</option>
            ))}
          </select>

          <button
            onClick={handleRefresh}
            disabled={spinning}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} />
            Refresh
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setCategory(cat.id); setForceRefresh(false); }}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
              category === cat.id
                ? 'bg-primary text-primary-foreground border-primary shadow-sm shadow-primary/20'
                : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground',
            )}
          >
            <span>{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Cache notice */}
      {data?.cached && !spinning && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          Cached results from {new Date(data.generated_at).toLocaleTimeString()} · click Refresh for fresh AI picks
        </div>
      )}

      {/* AI Topics */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI-Suggested Topics</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {isLoading ? '…' : aiTopics.length}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
            : aiTopics.map(t => (
                <TopicCard key={t.id} topic={t} onGenerate={handleGenerate} />
              ))
          }
        </div>
      </div>

      {/* YouTube Trending */}
      {(isLoading || ytTopics.length > 0) && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Youtube className="h-4 w-4 text-red-400" />
            <h2 className="text-sm font-semibold text-foreground">Trending on YouTube Now</h2>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {isLoading ? '…' : ytTopics.length}
            </span>
            <span className="text-xs text-muted-foreground">{region}</span>
          </div>
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : ytTopics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {ytTopics.map(t => (
                <TopicCard key={t.id} topic={t} onGenerate={handleGenerate} />
              ))}
            </div>
          ) : null}
          {!isLoading && ytTopics.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              YouTube trending unavailable — complete YouTube OAuth at{' '}
              <code className="text-primary">localhost:3000/auth/youtube</code> to enable live data.
            </p>
          )}
        </div>
      )}

      {/* Controlled dialog — shared across all cards */}
      <CreateVideoDialog
        onCreated={handleCreated}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialNiche={selectedNiche}
        hideButton
      />
    </div>
  );
}
