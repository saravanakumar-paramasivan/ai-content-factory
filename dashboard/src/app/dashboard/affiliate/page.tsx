'use client';
import useSWR from 'swr';
import {
  DollarSign, ExternalLink, CheckCircle, AlertCircle,
  XCircle, Code2, TrendingUp, Zap, Info,
} from 'lucide-react';
import { AffiliateLinkInfo, AffiliateStatus } from '@/types';
import { cn } from '@/lib/utils';

const fetcher = (url: string) => fetch(url).then(r => { if (!r.ok) throw new Error(''); return r.json(); });

const CATEGORY_COLORS: Record<string, string> = {
  Finance:   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Health:    'bg-blue-500/10   text-blue-400   border-blue-500/20',
  Cooking:   'bg-orange-500/10 text-orange-400 border-orange-500/20',
  Tech:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Education: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  Kids:      'bg-pink-500/10   text-pink-400   border-pink-500/20',
};

function StatusIcon({ active, configured }: { active: boolean; configured: boolean }) {
  if (active && configured) return <CheckCircle className="h-4 w-4 text-emerald-400" />;
  if (active && !configured) return <AlertCircle className="h-4 w-4 text-yellow-400" />;
  return <XCircle className="h-4 w-4 text-muted-foreground" />;
}

function StatusLabel({ active, configured }: { active: boolean; configured: boolean }) {
  if (active && configured) return <span className="text-xs text-emerald-400 font-medium">Live ✓</span>;
  if (active && !configured) return <span className="text-xs text-yellow-400 font-medium">Needs URL</span>;
  return <span className="text-xs text-muted-foreground">Inactive</span>;
}

function AffiliateCard({ link }: { link: AffiliateLinkInfo }) {
  const catCls = CATEGORY_COLORS[link.category] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <div className={cn(
      'rounded-xl border bg-card p-5 flex flex-col gap-3',
      link.active && link.configured ? 'border-emerald-500/20' : 'border-border',
    )}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', catCls)}>
            {link.category}
          </span>
          <span className="text-xs text-muted-foreground">{link.platform}</span>
        </div>
        <StatusIcon active={link.active} configured={link.configured} />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-foreground">{link.name}</h3>
          <StatusLabel active={link.active} configured={link.configured} />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{link.cta}</p>
      </div>

      <div className="flex items-center gap-1.5 text-xs">
        <DollarSign className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <span className="text-emerald-400 font-medium">{link.commission}</span>
      </div>

      <div className="rounded-lg bg-muted/40 border border-border p-2.5 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Triggers: </span>
        {link.triggers.slice(0, 6).join(', ')}
        {link.triggers.length > 6 && ` +${link.triggers.length - 6} more`}
      </div>

      <a
        href={link.signupUrl}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-primary/30 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium py-2 transition-colors"
      >
        Join {link.name} Affiliate Program
        <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

export default function AffiliatePage() {
  const { data, isLoading } = useSWR<AffiliateStatus>('/api/affiliate', fetcher, {
    revalidateOnFocus: false,
  });

  const links = data?.links ?? [];
  const liveCount   = links.filter(l => l.active && l.configured).length;
  const pendingCount = links.filter(l => l.active && !l.configured).length;
  const inactiveCount = links.filter(l => !l.active).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-emerald-400" />
          Affiliate Marketing
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Affiliate links are auto-injected into every YouTube description based on the video niche.
          No manual work per video.
        </p>
      </div>

      {/* How it works */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          <Zap className="h-4 w-4" /> How auto-injection works
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-muted-foreground">
          {[
            { step: '1', text: 'You generate a video with niche "Indian Finance Tips"' },
            { step: '2', text: 'Brain detects keywords: finance, invest, sip, wealth' },
            { step: '3', text: 'Zerodha + Groww links auto-added to YouTube description' },
          ].map(s => (
            <div key={s.step} className="flex gap-2">
              <span className="h-5 w-5 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center shrink-0 text-xs">
                {s.step}
              </span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground border-t border-primary/20 pt-3 flex gap-1.5">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-primary" />
          Description example: <code className="text-primary">📈 Open a FREE Zerodha account → https://zerodha.com/open-account?c=YOUR_CODE</code>
        </div>
      </div>

      {/* Setup instructions */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Code2 className="h-4 w-4 text-primary" /> Setup: Add Your Referral URLs
        </div>
        <p className="text-xs text-muted-foreground">
          Edit <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">brain/src/config/affiliateLinks.ts</code> — replace <code className="text-yellow-400 bg-yellow-500/10 px-1 py-0.5 rounded">YOUR_CODE</code> with your real referral link, then set <code className="text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">active: true</code>.
        </p>
        <pre className="text-xs bg-muted/40 rounded-lg p-3 border border-border overflow-x-auto text-muted-foreground">
{`  {
    id: 'zerodha',
    url: 'https://zerodha.com/open-account?c=ZP12345',  // ← your code
    active: true,   // ← set true after adding real URL
  }`}
        </pre>
        <p className="text-xs text-muted-foreground">
          After editing, rebuild and restart the brain: <code className="text-primary bg-primary/10 px-1 py-0.5 rounded">npm run build && node dist/index.js</code>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Live (earning)',    value: liveCount,    color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Needs your URL',   value: pendingCount, color: 'text-yellow-400',  bg: 'bg-yellow-500/10 border-yellow-500/20'  },
          { label: 'Not activated',    value: inactiveCount, color: 'text-muted-foreground', bg: 'bg-muted/40 border-border'         },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl border p-4', s.bg)}>
            <p className={cn('text-2xl font-bold', s.color)}>
              {isLoading ? '…' : s.value}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue potential */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          Revenue Potential by Category
        </div>
        <div className="space-y-3">
          {[
            { category: 'Finance',   programs: 'Zerodha, Groww, Upstox',  per_video: '₹500–5,000',  note: 'Per signup. Best ROI.' },
            { category: 'Health',    programs: 'iHerb, HealthKart',        per_video: '₹50–500',     note: 'Per purchase. High volume.' },
            { category: 'Cooking',   programs: 'Amazon Associates',        per_video: '₹20–200',     note: 'Per kitchen product sold.' },
            { category: 'Tech',      programs: 'Hostinger, Coursera',      per_video: '₹200–3,000',  note: 'High commission % on courses.' },
            { category: 'Kids',      programs: 'Amazon Kids',              per_video: '₹30–300',     note: 'Parents buy quickly.' },
          ].map(row => (
            <div key={row.category} className="flex items-center gap-3 text-xs">
              <span className={cn('px-2 py-0.5 rounded-full border font-medium w-20 text-center shrink-0',
                CATEGORY_COLORS[row.category] ?? 'bg-muted border-border text-muted-foreground')}>
                {row.category}
              </span>
              <span className="text-muted-foreground flex-1">{row.programs}</span>
              <span className="text-emerald-400 font-semibold w-28 text-right">{row.per_video}</span>
              <span className="text-muted-foreground hidden sm:block w-40 text-right">{row.note}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
          Example: 1 Finance Short gets 50,000 views → 50 Zerodha signups at ₹300 each = <strong className="text-emerald-400">₹15,000 from one video</strong>.
          On top of YouTube ad revenue.
        </p>
      </div>

      {/* Link cards */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-4">
          All Configured Programs ({isLoading ? '…' : data?.total ?? 0})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 h-52 animate-pulse" />
              ))
            : links.map(link => <AffiliateCard key={link.id} link={link} />)
          }
        </div>
      </div>
    </div>
  );
}
