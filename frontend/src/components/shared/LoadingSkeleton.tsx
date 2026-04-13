import { cn } from '../../lib/utils';
import type { CSSProperties } from 'react';

interface SkeletonProps {
  className?: string;
  style?:     CSSProperties;   // ← this was missing
}

export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn('bg-space-700 rounded-lg animate-pulse', className)}
      style={style}
    />
  );
}

export function MetricSkeleton() {
  return (
    <div className="panel space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-3 w-36" />
    </div>
  );
}

export function ChartSkeleton({ height = 120 }: { height?: number }) {
  return (
    <Skeleton className="w-full rounded-xl" style={{ height }} />
  );
}