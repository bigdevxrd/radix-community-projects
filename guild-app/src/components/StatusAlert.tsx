"use client";

export function StatusAlert({ status, txId, error }: { status?: string; txId?: string; error?: string }) {
  if (!status && !error) return null;
  return (
    <div className={`mt-3 rounded-md px-4 py-3 text-sm ${error ? "g-alert-err" : "g-alert-ok"}`}>
      {error || status}
      {txId && (
        <a href={`https://dashboard.radixdlt.com/transaction/${txId}`} target="_blank" rel="noopener"
          className="block mt-1 text-xs g-accent">
          View on Dashboard
        </a>
      )}
    </div>
  );
}
