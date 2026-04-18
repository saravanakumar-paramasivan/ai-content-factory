import { VideoProject, YouTubeStatus, UploadResult, AnalyticsData } from '@/types';

const BRAIN_URL = process.env.BRAIN_URL || 'http://localhost:3000';

async function brainFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BRAIN_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.text().catch(() => 'Unknown error');
    throw new Error(`Brain API ${path} → ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export const brain = {
  getProjects: () => brainFetch<VideoProject[]>('/projects'),

  getProject: (id: string) => brainFetch<VideoProject>(`/projects/${id}`),

  createProject: (niche: string) =>
    brainFetch<VideoProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({ niche }),
    }),

  uploadProject: (id: string) =>
    brainFetch<UploadResult>(`/upload/${id}`, { method: 'POST' }),

  getYouTubeStatus: () => brainFetch<YouTubeStatus>('/auth/status'),

  getAnalytics: () => brainFetch<AnalyticsData>('/analytics'),
};
