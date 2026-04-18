'use client';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import {
  ArrowLeft, CheckCircle2, Circle, AlertCircle,
  Upload, ExternalLink, FileText, Music, Film, Youtube
} from 'lucide-react';
import { VideoProject, ACTIVE_STATUSES } from '@/types';
import { StatusBadge } from '@/components/StatusBadge';
import { ScriptViewer } from '@/components/ScriptViewer';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { formatRelativeTime, formatDuration } from '@/lib/utils';
import { toast } from 'sonner';

const fetcher = (url: string) => fetch(url).then(r => r.json());

const PIPELINE_STAGES = [
  { key: 'SCRIPTING', label: 'Script Generated', icon: FileText },
  { key: 'FETCHING_ASSETS', label: 'Assets Fetched', icon: Music },
  { key: 'RENDERING', label: 'Video Rendered', icon: Film },
  { key: 'READY_TO_UPLOAD', label: 'Ready to Upload', icon: Youtube },
];

const STATUS_ORDER = ['DRAFT', 'SCRIPTING', 'FETCHING_ASSETS', 'RENDERING', 'READY_TO_UPLOAD', 'COMPLETED', 'FAILED'];

function StageIndicator({ stage, currentStatus }: { stage: typeof PIPELINE_STAGES[0]; currentStatus: string }) {
  const currentIdx = STATUS_ORDER.indexOf(currentStatus);
  const stageIdx = STATUS_ORDER.indexOf(stage.key);
  const Icon = stage.icon;

  const isDone = currentStatus !== 'FAILED' && currentIdx > stageIdx;
  const isActive = currentStatus === stage.key || (currentStatus === 'COMPLETED' && stage.key === 'READY_TO_UPLOAD');
  const isFailed = currentStatus === 'FAILED' && currentIdx <= stageIdx;

  return (
    <div className="flex items-center gap-3">
      <div className={`flex h-8 w-8 items-center justify-center rounded-full border flex-shrink-0 transition-colors ${
        isDone ? 'bg-emerald-950 border-emerald-700 text-emerald-400' :
        isActive ? 'bg-primary/10 border-primary text-primary' :
        isFailed ? 'bg-red-950 border-red-800 text-red-500' :
        'bg-muted border-border text-muted-foreground'
      }`}>
        {isDone ? <CheckCircle2 className="h-4 w-4" /> :
         isActive ? <Spinner className="h-4 w-4" /> :
         isFailed ? <AlertCircle className="h-4 w-4" /> :
         <Icon className="h-4 w-4" />}
      </div>
      <span className={`text-sm ${isDone || isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {stage.label}
      </span>
    </div>
  );
}

export function ProjectDetailClient({ initialProject }: { initialProject: VideoProject }) {
  const { id } = useParams<{ id: string }>();
  const [uploading, setUploading] = useState(false);

  const isActive = ACTIVE_STATUSES.includes(initialProject.status);

  const { data: project = initialProject, mutate } = useSWR<VideoProject>(
    `/api/projects/${id}`,
    fetcher,
    {
      fallbackData: initialProject,
      refreshInterval: isActive ? 5000 : 0,
    }
  );

  async function handleUpload() {
    setUploading(true);
    try {
      const res = await fetch(`/api/upload/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      toast.success('Uploaded to YouTube!', { description: `"${data.title}" is now Private on YouTube.` });
      mutate();
    } catch (err) {
      toast.error('Upload failed', { description: String(err) });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Back + Header */}
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-wrap items-start gap-3 justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground leading-tight">{project.niche}</h1>
            {project.youtubeTitle && (
              <p className="text-sm text-muted-foreground mt-0.5">"{project.youtubeTitle}"</p>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Created', value: formatRelativeTime(project.createdAt) },
          { label: 'Updated', value: formatRelativeTime(project.updatedAt) },
          { label: 'Duration', value: formatDuration(project.createdAt, project.updatedAt, project.status) },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-sm font-medium text-foreground mt-0.5 font-mono">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">Pipeline Progress</p>
        <div className="space-y-4">
          {PIPELINE_STAGES.map((stage, idx) => (
            <div key={stage.key}>
              <StageIndicator stage={stage} currentStatus={project.status} />
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className="ml-4 mt-1 mb-1 w-px h-4 bg-border" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {project.status === 'FAILED' && project.errorMessage && (
        <div className="rounded-xl border border-red-800 bg-red-950/30 p-4">
          <div className="flex items-center gap-2 text-red-400 mb-1.5">
            <AlertCircle className="h-4 w-4" /> <span className="text-sm font-medium">Pipeline Failed</span>
          </div>
          <p className="text-sm text-red-300/80 font-mono break-all">{project.errorMessage}</p>
        </div>
      )}

      {/* Assets summary */}
      {(project.audioPath || project.clipPaths) && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Assets</p>
          <div className="flex flex-wrap gap-2">
            {project.audioPath && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1 text-xs text-muted-foreground">
                <Music className="h-3 w-3" /> Voiceover MP3
              </span>
            )}
            {project.clipPaths && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-3 py-1 text-xs text-muted-foreground">
                <Film className="h-3 w-3" /> {project.clipPaths.length} B-roll clips
              </span>
            )}
            {project.videoPath && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950 border border-emerald-800 px-3 py-1 text-xs text-emerald-400">
                <CheckCircle2 className="h-3 w-3" /> 1080×1920 MP4 rendered
              </span>
            )}
          </div>
        </div>
      )}

      {/* Script */}
      {project.scriptData && <ScriptViewer script={project.scriptData} />}

      {/* Actions */}
      {project.status === 'READY_TO_UPLOAD' && (
        <div className="rounded-xl border border-emerald-800 bg-emerald-950/20 p-5">
          <p className="text-sm font-medium text-foreground mb-1">Ready for YouTube</p>
          <p className="text-sm text-muted-foreground mb-4">
            Claude will generate an SEO-optimised title, description, and tags, then upload as <strong>Private</strong> for your review.
          </p>
          <Button variant="success" onClick={handleUpload} disabled={uploading} className="gap-2">
            {uploading ? <><Spinner className="h-4 w-4" /> Uploading…</> : <><Upload className="h-4 w-4" /> Upload to YouTube</>}
          </Button>
        </div>
      )}

      {project.status === 'COMPLETED' && project.youtubeUrl && (
        <div className="rounded-xl border border-green-800 bg-green-950/20 p-5">
          <p className="text-sm font-medium text-green-400 mb-1">✓ Uploaded Successfully</p>
          <p className="text-sm text-muted-foreground mb-3">The video is <strong>Private</strong> on YouTube. Review and publish when ready.</p>
          <Button variant="outline" asChild className="gap-2">
            <a href={project.youtubeUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" /> Open in YouTube Studio
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}
