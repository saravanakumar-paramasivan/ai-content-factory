'use client';
import useSWR from 'swr';
import {
  Brain, Mic, Image, Youtube, Instagram, Music2,
  TrendingUp, Eye, ThumbsUp, MessageSquare, AlertTriangle,
  CheckCircle, Clock, DollarSign, RefreshCw, ExternalLink,
} from 'lucide-react';
import { AnalyticsData } from '@/types';
import { cn } from '@/lib/utils';

const fetcher = (url: string) =>
  fetch(url).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  });

function usageBadge(pct: number) {
  if (pct >= 90) return { label: 'Critical', cls: 'bg-destructive/15 text-destructive border-destructive/30' };
  if (pct >= 70) return { label: 'Warning', cls: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' };
  return { label: 'Healthy', cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' };
}

function ProgressBar({ pct, status }: { pct: number; status: string }) {
  const color = status === 'critical' ? 'bg-destructive' : status === 'warning' ? 'bg-yellow-500' : 'bg-emerald-500';
  return (
    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function ApiCard({
  icon, title, badge, badgeCls, children, footerLeft, footerRight,
}: {
  icon: React.ReactNode;
  title: string;
  badge: string;
  badgeCls: string;
  children: React.ReactNode;
  footerLeft?: string;
  footerRight?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
          <span className="font-medium text-sm text-foreground">{title}</span>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', badgeCls)}>{badge}</span>
      </div>
      {children}
      {(footerLeft || footerRight) && (
        <div className="flex items-center justify-between pt-1 border-t border-border text-xs text-muted-foreground">
          <span>{footerLeft}</span>
          {footerRight}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-lg font-semibold text-foreground">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function ComingSoonCard({ icon, name, platforms }: { icon: React.ReactNode; name: string; platforms?: string }) {
  return (
    <div className="rounded-xl border border-border border-dashed bg-card/40 p-5 flex flex-col items-center justify-center gap-3 min-h-[160px]">
      <div className="rounded-xl bg-muted/50 p-3 text-muted-foreground">{icon}</div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{name}</p>
        {platforms && <p className="text-xs text-muted-foreground/60 mt-0.5">{platforms}</p>}
      </div>
      <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">Coming Soon</span>
    </div>
  );
}

export function AnalyticsClient({ initial }: { initial: AnalyticsData }) {
  const { data, isLoading } = useSWR<AnalyticsData>('/api/analytics', fetcher, {
    fallbackData: initial,
    refreshInterval: 120_000,
    revalidateOnFocus: false,
  });

  const d = data ?? initial;
  const { apis, youtube, projects, period } = d;

  // Anthropic card
  const anthropicBadge = usageBadge(
    apis.anthropic.estimated_cost_usd > 5 ? 80 : apis.anthropic.estimated_cost_usd > 1 ? 40 : 10
  );

  // ElevenLabs card
  const elBadge = apis.elevenlabs.available
    ? usageBadge(apis.elevenlabs.percent_used ?? 0)
    : { label: 'Unconfigured', cls: 'bg-muted text-muted-foreground border-border' };

  // Pexels card
  const pexelsPct = Math.round((apis.pexels.requests_estimated / apis.pexels.plan_limit_monthly) * 100);
  const pexelsBadge = usageBadge(pexelsPct);

  // YouTube totals
  const totalViews = youtube.totals.views;
  const estimatedRevenue = totalViews > 0
    ? `$${((totalViews / 1000) * 2.5).toFixed(2)}–$${((totalViews / 1000) * 5).toFixed(2)}`
    : '—';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Analytics & Usage</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{period.label} · {projects.total} total projects</p>
        </div>
        {isLoading && <RefreshCw className="h-4 w-4 text-muted-foreground animate-spin" />}
      </div>

      {/* Project Activity Sparkline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <SectionHeader title="Monthly Project Activity" subtitle="Projects created per month" />
        <div className="flex items-end gap-2 h-20">
          {projects.by_month.slice().reverse().map((m) => {
            const max = Math.max(...projects.by_month.map(x => x.count), 1);
            const h = Math.max(8, Math.round((m.count / max) * 72));
            const isCurrent = m.month === period.month;
            return (
              <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
                <span className="text-[10px] text-muted-foreground">{m.count}</span>
                <div
                  className={cn('w-full rounded-t', isCurrent ? 'bg-primary' : 'bg-primary/30')}
                  style={{ height: h }}
                  title={`${m.label}: ${m.count} projects`}
                />
                <span className="text-[10px] text-muted-foreground rotate-0 truncate max-w-[40px] text-center">
                  {m.month.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-4 flex-wrap">
          {Object.entries(projects.by_status).map(([status, count]) => (
            <div key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{count}</span>
              <span>{status.replace(/_/g, ' ')}</span>
            </div>
          ))}
        </div>
      </div>

      {/* API Credits */}
      <div>
        <SectionHeader
          title="API Credits & Usage"
          subtitle="Monitor your third-party API consumption. Hitting limits pauses your pipeline."
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Anthropic */}
          <ApiCard
            icon={<Brain className="h-4 w-4" />}
            title="Anthropic"
            badge={anthropicBadge.label}
            badgeCls={anthropicBadge.cls}
            footerLeft={apis.anthropic.renewal}
            footerRight={
              <a href={apis.anthropic.billing_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors">
                Manage <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            <div className="flex gap-6">
              <StatPill label="Scripts generated" value={apis.anthropic.scripting_attempts} />
              <StatPill label="Est. cost" value={`$${apis.anthropic.estimated_cost_usd.toFixed(4)}`} />
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p>~{apis.anthropic.estimated_input_tokens.toLocaleString()} input tokens</p>
              <p>~{apis.anthropic.estimated_output_tokens.toLocaleString()} output tokens</p>
            </div>
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">Impact:</strong> {apis.anthropic.impact}
            </div>
          </ApiCard>

          {/* ElevenLabs */}
          <ApiCard
            icon={<Mic className="h-4 w-4" />}
            title="ElevenLabs"
            badge={elBadge.label}
            badgeCls={elBadge.cls}
            footerLeft={apis.elevenlabs.available ? `Resets ${apis.elevenlabs.reset_date ?? '—'}` : 'Add ELEVENLABS_API_KEY'}
            footerRight={
              <a href="https://elevenlabs.io/subscription" target="_blank" rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors">
                Upgrade <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            {apis.elevenlabs.available ? (
              <>
                <div className="flex gap-6">
                  <StatPill label="Characters used" value={(apis.elevenlabs.characters_used ?? 0).toLocaleString()} />
                  <StatPill label="Limit" value={(apis.elevenlabs.characters_limit ?? 0).toLocaleString()} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{apis.elevenlabs.percent_used ?? 0}% used</span>
                    <span className="capitalize">{apis.elevenlabs.tier} plan</span>
                  </div>
                  <ProgressBar pct={apis.elevenlabs.percent_used ?? 0} status={apis.elevenlabs.status ?? 'healthy'} />
                </div>
                <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
                  <strong className="text-foreground">Impact:</strong> Running out stops voiceover generation.
                  Upgrade plan to continue producing videos.
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-4">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                ElevenLabs API key not configured.
              </div>
            )}
          </ApiCard>

          {/* Pexels */}
          <ApiCard
            icon={<Image className="h-4 w-4" />}
            title="Pexels"
            badge={pexelsBadge.label}
            badgeCls={pexelsBadge.cls}
            footerLeft={apis.pexels.renewal}
            footerRight={
              <a href={apis.pexels.billing_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-1 hover:text-foreground transition-colors">
                API Portal <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            <div className="flex gap-6">
              <StatPill label="Clips downloaded" value={apis.pexels.clips_downloaded} />
              <StatPill label="Est. requests" value={apis.pexels.requests_estimated} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{pexelsPct}% of monthly limit</span>
                <span>{apis.pexels.plan_limit_monthly.toLocaleString()} req/month</span>
              </div>
              <ProgressBar pct={pexelsPct} status={pexelsBadge.label.toLowerCase() as 'healthy' | 'warning' | 'critical'} />
            </div>
            <div className="rounded-lg bg-muted/40 border border-border px-3 py-2 text-xs text-muted-foreground">
              <strong className="text-foreground">Impact:</strong> {apis.pexels.impact}
            </div>
          </ApiCard>
        </div>
      </div>

      {/* YouTube Performance */}
      <div>
        <SectionHeader
          title="YouTube Content Performance"
          subtitle="Stats pulled live from the YouTube Data API for your uploaded videos."
        />

        {/* Totals row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { icon: <Eye className="h-4 w-4" />, label: 'Total Views', value: totalViews.toLocaleString() },
            { icon: <ThumbsUp className="h-4 w-4" />, label: 'Total Likes', value: youtube.totals.likes.toLocaleString() },
            { icon: <MessageSquare className="h-4 w-4" />, label: 'Comments', value: youtube.totals.comments.toLocaleString() },
            { icon: <DollarSign className="h-4 w-4" />, label: 'Est. Revenue', value: estimatedRevenue },
          ].map(item => (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
              <div className="rounded-lg bg-red-500/10 p-2 text-red-400">{item.icon}</div>
              <div>
                <p className="text-lg font-semibold text-foreground">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Revenue note */}
        {totalViews > 0 && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 px-4 py-3 text-xs text-yellow-400 mb-4 flex gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Revenue estimate uses a $2.50–$5.00 CPM range. Actual earnings depend on your channel's
              monetization status, audience geography, and AdSense account.
              Enable monetization in{' '}
              <a href="https://studio.youtube.com" target="_blank" rel="noreferrer" className="underline">
                YouTube Studio
              </a>.
            </span>
          </div>
        )}

        {/* Video list */}
        {youtube.videos.length === 0 ? (
          <div className="rounded-xl border border-border bg-card/50 p-8 text-center text-muted-foreground text-sm">
            No videos uploaded to YouTube yet. Complete a project and click Upload.
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-left font-medium">Video</th>
                  <th className="px-4 py-3 text-right font-medium">Views</th>
                  <th className="px-4 py-3 text-right font-medium">Likes</th>
                  <th className="px-4 py-3 text-right font-medium">Comments</th>
                  <th className="px-4 py-3 text-right font-medium">Est. Revenue</th>
                  <th className="px-4 py-3 text-right font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {youtube.videos.map((v) => {
                  const rev = v.stats
                    ? `$${((v.stats.viewCount / 1000) * 2.5).toFixed(2)}–$${((v.stats.viewCount / 1000) * 5).toFixed(2)}`
                    : '—';
                  return (
                    <tr key={v.youtubeVideoId} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground line-clamp-1 max-w-[240px]">
                          {v.title ?? v.youtubeVideoId}
                        </p>
                        {v.stats?.publishedAt && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(v.stats.publishedAt).toLocaleDateString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{v.stats?.viewCount.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{v.stats?.likeCount.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{v.stats?.commentCount.toLocaleString() ?? '—'}</td>
                      <td className="px-4 py-3 text-right text-emerald-400 font-medium">{rev}</td>
                      <td className="px-4 py-3 text-right">
                        {v.url && (
                          <a href={v.url} target="_blank" rel="noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Platforms */}
      <div>
        <SectionHeader
          title="Publishing Platforms"
          subtitle="YouTube is live. Instagram Reels and TikTok support are on the roadmap."
        />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* YouTube — active */}
          <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-red-500/10 p-2 text-red-400">
                  <Youtube className="h-4 w-4" />
                </div>
                <span className="font-medium text-sm text-foreground">YouTube Shorts</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <CheckCircle className="h-3.5 w-3.5" /> Active
              </span>
            </div>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>✓ Automated upload via OAuth2</p>
              <p>✓ LLM-generated SEO metadata</p>
              <p>✓ Private upload for manual review</p>
              <p>✓ Live view &amp; revenue tracking</p>
            </div>
            <div className="mt-auto pt-2 border-t border-border flex gap-2">
              <a href="https://studio.youtube.com" target="_blank" rel="noreferrer"
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                Studio <ExternalLink className="h-3 w-3" />
              </a>
              <span className="text-border">·</span>
              <span className="text-xs text-muted-foreground">{youtube.videos_uploaded} videos uploaded</span>
            </div>
          </div>

          {/* Instagram */}
          <ComingSoonCard
            icon={<Instagram className="h-5 w-5" />}
            name="Instagram Reels"
            platforms="Meta Graph API · Reels format"
          />

          {/* TikTok */}
          <ComingSoonCard
            icon={<Music2 className="h-5 w-5" />}
            name="TikTok"
            platforms="TikTok Content Posting API"
          />
        </div>

        <div className="mt-4 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          <strong className="text-foreground">Roadmap:</strong> Instagram and TikTok will reuse the same 1080×1920 MP4
          output. Integration requires Meta Graph API and TikTok Content Posting API credentials.
          Both support direct video upload with caption and hashtag metadata.
        </div>
      </div>
    </div>
  );
}
