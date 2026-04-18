import { ProjectStatus, ACTIVE_STATUSES } from '@/types';
import { STATUS_COLORS, STATUS_LABELS, cn } from '@/lib/utils';
import { Spinner } from './ui/spinner';

interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const isActive = ACTIVE_STATUSES.includes(status);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        STATUS_COLORS[status],
        className
      )}
    >
      {isActive && <Spinner className="h-3 w-3" />}
      {STATUS_LABELS[status]}
    </span>
  );
}
