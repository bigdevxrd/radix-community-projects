"use client";

export function LoadingSkeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse g-card-inner rounded-md ${className}`} />;
}

export function BadgeSkeleton() {
  return (
    <div className="g-card p-5">
      <div className="flex justify-between mb-4">
        <LoadingSkeleton className="h-5 w-32" />
        <LoadingSkeleton className="h-5 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {[1, 2, 3, 4].map((i) => <LoadingSkeleton key={i} className="h-14" />)}
      </div>
      <LoadingSkeleton className="h-1.5 w-full" />
    </div>
  );
}

export function ProposalSkeleton() {
  return (
    <div className="g-card p-4">
      <div className="flex justify-between mb-3">
        <LoadingSkeleton className="h-4 w-48" />
        <LoadingSkeleton className="h-4 w-16 rounded-full" />
      </div>
      <LoadingSkeleton className="h-3 w-full mb-2" />
      <LoadingSkeleton className="h-3 w-2/3" />
    </div>
  );
}
