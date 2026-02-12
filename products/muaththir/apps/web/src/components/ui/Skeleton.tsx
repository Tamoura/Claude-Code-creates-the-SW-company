'use client';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function SkeletonBase({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-slate-200 dark:bg-slate-700 ${className}`}
      aria-hidden="true"
    />
  );
}

export default function Skeleton({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines,
}: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (lines && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBase
            key={i}
            className={`h-4 rounded ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
          />
        ))}
      </div>
    );
  }

  const variantClasses: Record<string, string> = {
    text: 'h-4 rounded w-full',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-2xl',
  };

  return (
    <SkeletonBase
      className={`${variantClasses[variant]} ${className}`}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`card space-y-4 ${className}`} aria-hidden="true">
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-1/3" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton variant="rounded" className="h-20 w-full" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-8" aria-hidden="true" aria-label="Loading dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-48" />
          <Skeleton variant="text" className="h-4 w-64" />
        </div>
      </div>

      {/* Stats Summary Row */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="card text-center py-3 space-y-2">
            <Skeleton variant="text" className="h-3 w-24 mx-auto" />
            <Skeleton variant="text" className="h-8 w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* Radar Chart area */}
      <div className="card">
        <Skeleton variant="text" className="h-6 w-48 mb-4" />
        <Skeleton variant="rounded" className="h-80 w-full" />
      </div>

      {/* Dimension Cards */}
      <div>
        <Skeleton variant="text" className="h-6 w-32 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card space-y-3">
              <div className="flex items-center gap-2">
                <Skeleton variant="circular" className="h-8 w-8" />
                <Skeleton variant="text" className="h-5 w-24" />
              </div>
              <Skeleton variant="text" className="h-4 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton variant="text" className="h-8 w-12" />
                <Skeleton variant="text" className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Observations */}
      <div>
        <Skeleton variant="text" className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card space-y-3" style={{ borderLeft: '4px solid #e2e8f0' }}>
              <div className="flex items-center gap-2">
                <Skeleton variant="rounded" className="h-5 w-16" />
                <Skeleton variant="rounded" className="h-5 w-14" />
              </div>
              <Skeleton variant="text" className="h-4 w-full" />
              <Skeleton variant="text" className="h-4 w-3/4" />
              <Skeleton variant="text" className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* Milestones Due */}
      <div>
        <Skeleton variant="text" className="h-6 w-36 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card">
              <div className="flex items-start gap-3">
                <Skeleton variant="circular" className="h-8 w-8" />
                <div className="flex-1 space-y-2">
                  <Skeleton variant="text" className="h-4 w-2/3" />
                  <Skeleton variant="text" className="h-3 w-full" />
                  <Skeleton variant="text" className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTimeline() {
  return (
    <div className="space-y-8" aria-hidden="true" aria-label="Loading timeline">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton variant="text" className="h-8 w-32" />
          <Skeleton variant="text" className="h-4 w-56" />
        </div>
        <Skeleton variant="rounded" className="h-9 w-28" />
      </div>

      {/* Search Input */}
      <Skeleton variant="rounded" className="h-10 w-full" />

      {/* Filter Bar */}
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} variant="rounded" className="h-8 w-20" />
          ))}
        </div>
        <div className="flex gap-3">
          <Skeleton variant="rounded" className="h-8 w-32" />
          <Skeleton variant="rounded" className="h-8 w-32" />
          <Skeleton variant="rounded" className="h-8 w-32" />
        </div>
      </div>

      {/* Observation Cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card space-y-3" style={{ borderLeft: '4px solid #e2e8f0' }}>
            <div className="flex items-center gap-2">
              <Skeleton variant="rounded" className="h-5 w-16" />
              <Skeleton variant="rounded" className="h-5 w-14" />
            </div>
            <Skeleton variant="text" className="h-4 w-full" />
            <Skeleton variant="text" className="h-4 w-3/4" />
            <div className="flex items-center justify-between">
              <Skeleton variant="text" className="h-3 w-24" />
              <div className="flex gap-1">
                <Skeleton variant="rounded" className="h-5 w-12" />
                <Skeleton variant="rounded" className="h-5 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonMilestones() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-hidden="true" aria-label="Loading milestones">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="card space-y-3" style={{ borderLeft: '4px solid #e2e8f0' }}>
          <Skeleton variant="text" className="h-5 w-28" />
          <Skeleton variant="text" className="h-4 w-full" />
          <div className="flex items-center gap-1">
            <Skeleton variant="text" className="h-3 w-20" />
            <Skeleton variant="text" className="h-3 w-4" />
            <Skeleton variant="text" className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonSettings() {
  return (
    <div className="max-w-2xl mx-auto space-y-8" aria-hidden="true" aria-label="Loading settings">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton variant="text" className="h-8 w-32" />
        <Skeleton variant="text" className="h-4 w-56" />
      </div>

      {/* Profile form */}
      <div className="card space-y-5">
        <Skeleton variant="text" className="h-6 w-40" />
        <div className="space-y-4">
          <div>
            <Skeleton variant="text" className="h-4 w-20 mb-2" />
            <Skeleton variant="rounded" className="h-12 w-full" />
          </div>
          <div>
            <Skeleton variant="text" className="h-4 w-16 mb-2" />
            <Skeleton variant="rounded" className="h-12 w-full" />
          </div>
          <div>
            <Skeleton variant="text" className="h-4 w-24 mb-2" />
            <Skeleton variant="text" className="h-4 w-32" />
          </div>
          <Skeleton variant="rounded" className="h-12 w-full" />
        </div>
      </div>

      {/* Password form */}
      <div className="card space-y-5">
        <Skeleton variant="text" className="h-6 w-44" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton variant="text" className="h-4 w-28 mb-2" />
              <Skeleton variant="rounded" className="h-12 w-full" />
            </div>
          ))}
          <Skeleton variant="rounded" className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
