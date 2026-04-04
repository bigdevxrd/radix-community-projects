"use client";

interface Props {
  status: string;
  txId?: string;
  error?: string;
}

export function StatusMessage({ status, txId, error }: Props) {
  if (!status && !error) return null;

  const isError = !!error;
  const color = isError ? "var(--status-revoked)" : "var(--accent)";

  return (
    <div style={{
      background: isError ? "rgba(239,68,68,0.08)" : "var(--accent-dim)",
      border: `1px solid ${color}33`,
      borderRadius: "var(--radius-sm)",
      padding: "10px 14px",
      fontSize: 13,
      color,
      marginTop: 12,
    }}>
      {error || status}
      {txId && (
        <a
          href={`https://dashboard.radixdlt.com/transaction/${txId}`}
          target="_blank"
          rel="noopener"
          style={{ display: "block", marginTop: 4, fontSize: 12, color: "var(--accent)" }}
        >
          View on Dashboard
        </a>
      )}
    </div>
  );
}
