"use client";
import { useAdmin } from "@/hooks/useAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, connected } = useAdmin();

  if (!connected) {
    return (
      <Alert>
        <AlertDescription>Connect your wallet to access this page.</AlertDescription>
      </Alert>
    );
  }

  if (!isAdmin) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Admin badge required (steward tier or higher).
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-2 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function ErrorBoundaryMessage({ error }: { error: string }) {
  return (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  );
}
