import type { Bounty } from '../types'

export function BountyCard({ bounty }: { bounty: Bounty }) {
  return (
    <div className="badge-item">
      <div className="badge-item-info">
        <span className="badge-item-name">{bounty.title}</span>
        <span className="badge-item-schema">Proof: {bounty.proof}</span>
      </div>
      <span className="tier-pill" style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}>
        {bounty.reward} XRD
      </span>
    </div>
  )
}
