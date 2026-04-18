'use client';
import { useCallback } from 'react';
import useSWR from 'swr';
import { Film, Zap, Upload, CheckCircle, XCircle } from 'lucide-react';
import { VideoProject, ACTIVE_STATUSES } from '@/types';
import { StatCard } from '@/components/StatCard';
import { ProjectsTable } from '@/components/ProjectsTable';
import { CreateVideoDialog } from '@/components/CreateVideoDialog';

const fetcher = (url: string) => fetch(url).then(r => r.json());

interface DashboardClientProps {
  initialProjects: VideoProject[];
}

export function DashboardClient({ initialProjects }: DashboardClientProps) {
  const { data: projects = initialProjects, mutate } = useSWR<VideoProject[]>(
    '/api/projects',
    fetcher,
    {
      fallbackData: initialProjects,
      refreshInterval: (data) => {
        const hasActive = (data ?? initialProjects).some(p => ACTIVE_STATUSES.includes(p.status));
        return hasActive ? 5000 : 30000;
      },
      revalidateOnFocus: true,
    }
  );

  const handleRefresh = useCallback(() => mutate(), [mutate]);

  const stats = {
    total: projects.length,
    inProgress: projects.filter(p => ACTIVE_STATUSES.includes(p.status)).length,
    ready: projects.filter(p => p.status === 'READY_TO_UPLOAD').length,
    completed: projects.filter(p => p.status === 'COMPLETED').length,
    failed: projects.filter(p => p.status === 'FAILED').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Content Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} total videos · {stats.inProgress > 0 ? `${stats.inProgress} running` : 'all idle'}
          </p>
        </div>
        <CreateVideoDialog onCreated={handleRefresh} />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard title="Total" value={stats.total} subtitle="All projects" icon={Film} iconColor="text-muted-foreground" />
        <StatCard title="In Progress" value={stats.inProgress} subtitle="Running now" icon={Zap} iconColor="text-amber-400" />
        <StatCard title="Ready" value={stats.ready} subtitle="Awaiting upload" icon={Upload} iconColor="text-emerald-400" />
        <StatCard title="Completed" value={stats.completed} subtitle="Live on YouTube" icon={CheckCircle} iconColor="text-green-400" />
        <StatCard title="Failed" value={stats.failed} subtitle="Need attention" icon={XCircle} iconColor="text-red-400" />
      </div>

      {/* YouTube auth notice */}
      {stats.ready > 0 && (
        <div className="rounded-lg border border-emerald-800 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2">
          <Upload className="h-4 w-4 flex-shrink-0" />
          {stats.ready} video{stats.ready > 1 ? 's are' : ' is'} ready to upload. Click the row to upload to YouTube.
        </div>
      )}

      {/* Projects Table */}
      <ProjectsTable projects={projects} onRefresh={handleRefresh} />
    </div>
  );
}
