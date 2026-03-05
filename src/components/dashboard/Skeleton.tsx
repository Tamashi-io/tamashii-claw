export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-shimmer rounded-md ${className}`} />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}

export function AgentCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div>
          <Skeleton className="h-4 w-28 mb-1" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton className="h-8 w-full" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

export function TableSkeleton() {
  return (
    <div className="glass-card p-5">
      <Skeleton className="h-4 w-32 mb-4" />
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-10 w-full mb-2" />
      ))}
    </div>
  );
}

export function AgentSidebarSkeleton() {
  return (
    <div className="space-y-2 p-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  );
}
