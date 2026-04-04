"use client";

interface Props {
  status?: string;
  txId?: string;
  error?: string;
}

export function StatusAlert({ status, txId, error }: Props) {
  if (!status && !error) return null;

  return (
    <div
      className={`mt-3 rounded-md px-4 py-3 text-sm ${
        error
          ? "bg-status-revoked/10 text-status-revoked border border-status-revoked/20"
          : "bg-accent-dim text-accent border border-accent/20"
      }`}
    >
      {error || status}
      {txId && (
        <a
          href={`https://dashboard.radixdlt.com/transaction/${txId}`}
          target="_blank"
          rel="noopener"
          className="block mt-1 text-xs text-accent hover:text-accent-hover"
        >
          View on Dashboard
        </a>
      )}
    </div>
  );
}
