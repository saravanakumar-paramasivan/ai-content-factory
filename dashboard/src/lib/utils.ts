import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ProjectStatus } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${diffDay}d ago`;
}

export function formatDuration(createdAt: string, updatedAt: string, status: ProjectStatus): string {
  const start = new Date(createdAt).getTime();
  const end = ['COMPLETED', 'FAILED', 'READY_TO_UPLOAD'].includes(status)
    ? new Date(updatedAt).getTime()
    : Date.now();
  const diffMs = end - start;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
  return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m`;
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Queued',
  SCRIPTING: 'Scripting',
  FETCHING_ASSETS: 'Fetching Assets',
  RENDERING: 'Rendering',
  READY_TO_UPLOAD: 'Ready',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const STATUS_COLORS: Record<ProjectStatus, string> = {
  DRAFT: 'bg-zinc-800 text-zinc-400 border-zinc-700',
  SCRIPTING: 'bg-blue-950 text-blue-400 border-blue-800',
  FETCHING_ASSETS: 'bg-cyan-950 text-cyan-400 border-cyan-800',
  RENDERING: 'bg-amber-950 text-amber-400 border-amber-800',
  READY_TO_UPLOAD: 'bg-emerald-950 text-emerald-400 border-emerald-800',
  COMPLETED: 'bg-green-950 text-green-400 border-green-800',
  FAILED: 'bg-red-950 text-red-400 border-red-800',
};
