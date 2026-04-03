import { ProposalCard } from '../components/ProposalCard'
import { PROPOSALS } from '../data/proposals'

export function Proposals() {
  const active = PROPOSALS.filter(p => p.status === 'active')
  const closed = PROPOSALS.filter(p => p.status !== 'active')

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>Active Proposals</h2>
          <span className="card-badge">{active.length} active</span>
        </div>
        {active.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No active proposals right now.</p>
        ) : (
          <div className="badge-list">
            {active.map(p => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        )}
      </div>

      {closed.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Past Proposals</h2>
            <span className="card-badge">{closed.length} closed</span>
          </div>
          <div className="badge-list">
            {closed.map(p => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2>Propose an Idea</h2>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
          Have an idea for the Guild? Submit a proposal on CrumbsUp.
        </p>
        <a href="https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0" target="_blank" className="btn" style={{ textDecoration: 'none' }}>
          New Proposal on CrumbsUp →
        </a>
      </div>
    </>
  )
}
