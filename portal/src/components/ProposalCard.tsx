import type { Proposal } from '../types'

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--accent)',
  passed: 'var(--accent)',
  failed: 'var(--status-revoked)',
  closed: 'var(--text-muted)',
}

const SOURCE_LABELS: Record<string, string> = {
  crumbsup: 'CrumbsUp',
  consultation: 'Consultation',
  guild: 'Guild',
}

export function ProposalCard({ proposal }: { proposal: Proposal }) {
  const daysLeft = proposal.endDate
    ? Math.max(0, Math.ceil((new Date(proposal.endDate).getTime() - Date.now()) / 86400000))
    : null

  return (
    <div className="badge-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="tier-pill" style={{
            background: STATUS_COLORS[proposal.status] + '1a',
            color: STATUS_COLORS[proposal.status],
            fontSize: 10,
          }}>
            {proposal.status.toUpperCase()}
          </span>
          <span style={{ font: '400 11px var(--font-mono)', color: 'var(--text-muted)' }}>
            {SOURCE_LABELS[proposal.source]}
          </span>
        </div>
        {daysLeft !== null && proposal.status === 'active' && (
          <span style={{ font: '500 11px var(--font-mono)', color: 'var(--text-secondary)' }}>
            {daysLeft}d left
          </span>
        )}
      </div>
      <div>
        <div style={{ font: '600 15px var(--font-sans)', marginBottom: 4 }}>{proposal.title}</div>
        <div style={{ font: '400 13px var(--font-sans)', color: 'var(--text-secondary)' }}>{proposal.abstract}</div>
      </div>
      {proposal.status === 'active' && (
        <a href={proposal.sourceUrl} target="_blank" className="btn" style={{ fontSize: 12, padding: '6px 16px', textDecoration: 'none' }}>
          Vote on {SOURCE_LABELS[proposal.source]} →
        </a>
      )}
    </div>
  )
}
