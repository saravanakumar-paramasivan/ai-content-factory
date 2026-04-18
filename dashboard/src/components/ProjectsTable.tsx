'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Search, Upload, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { VideoProject, ACTIVE_STATUSES } from '@/types';
import { StatusBadge } from './StatusBadge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { formatRelativeTime, formatDuration } from '@/lib/utils';

const PAGE_SIZE = 10;

interface ProjectsTableProps {
  projects: VideoProject[];
  onRefresh: () => void;
}

export function ProjectsTable({ projects, onRefresh }: ProjectsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(0);

  const filtered = projects.filter(p => {
    const matchesSearch = p.niche.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const hasActive = projects.some(p => ACTIVE_STATUSES.includes(p.status));

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'SCRIPTING', label: 'Scripting' },
    { value: 'FETCHING_ASSETS', label: 'Fetching Assets' },
    { value: 'RENDERING', label: 'Rendering' },
    { value: 'READY_TO_UPLOAD', label: 'Ready to Upload' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 border-b border-border">
        <div className="relative flex-1 w-full sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search niches…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
            className="pl-8"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
          className="h-9 rounded-lg border border-border bg-muted px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {statusOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {hasActive && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">#</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Niche</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden md:table-cell">Created</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden lg:table-cell">Duration</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'No projects match your filters.' : 'No projects yet. Create your first video!'}
                </td>
              </tr>
            ) : (
              paginated.map((project, idx) => (
                <tr
                  key={project.id}
                  className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer"
                  onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                >
                  <td className="px-4 py-3.5 text-muted-foreground text-xs">
                    {page * PAGE_SIZE + idx + 1}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-foreground line-clamp-1 max-w-[200px] block">
                      {project.niche}
                    </span>
                    {project.youtubeTitle && (
                      <span className="text-xs text-muted-foreground line-clamp-1">{project.youtubeTitle}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusBadge status={project.status} />
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden md:table-cell text-xs">
                    {formatRelativeTime(project.createdAt)}
                  </td>
                  <td className="px-4 py-3.5 text-muted-foreground hidden lg:table-cell text-xs font-mono">
                    {formatDuration(project.createdAt, project.updatedAt, project.status)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                      {project.status === 'READY_TO_UPLOAD' && (
                        <Button
                          size="sm"
                          variant="success"
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/projects/${project.id}`); }}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Upload</span>
                        </Button>
                      )}
                      {project.youtubeUrl && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <a href={project.youtubeUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">YouTube</span>
                          </a>
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
