import { BountyCard } from '../components/BountyCard'
import { BOUNTIES } from '../data/bounties'
import { WORKING_GROUPS } from '../data/workingGroups'

export function Bounties() {
  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>Bounty Board</h2>
          <span className="card-badge">Earn XRD</span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20 }}>
          Complete tasks, earn XRD. Badge holders can claim bounties.
        </p>
        <div className="badge-list">
          {BOUNTIES.map(b => <BountyCard key={b.id} bounty={b} />)}
        </div>
        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
          <p style={{ font: '500 13px var(--font-sans)', color: 'var(--text-primary)', marginBottom: 8 }}>How to claim:</p>
          <ol style={{ font: '400 13px var(--font-sans)', color: 'var(--text-secondary)', paddingLeft: 20 }}>
            <li>Mint a Guild badge (free)</li>
            <li>Do the work</li>
            <li>Submit proof on <a href="https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0" target="_blank">CrumbsUp</a> or <a href="https://github.com/bigdevxrd/radix-community-projects/issues" target="_blank">GitHub</a></li>
            <li>Get verified → receive XRD</li>
          </ol>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Working Groups</h2>
          <span className="card-badge">Join a team</span>
        </div>
        <div className="ecosystem-links">
          {WORKING_GROUPS.map(g => (
            <div className="eco-link" key={g.id}>
              <strong>{g.name}</strong> — {g.description}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
