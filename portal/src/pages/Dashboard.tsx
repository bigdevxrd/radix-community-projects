import { useRadix } from '../hooks/useRadix'
import { useBadges } from '../hooks/useBadges'
import { BadgeCard } from '../components/BadgeCard'
import { ProposalCard } from '../components/ProposalCard'
import { BountyCard } from '../components/BountyCard'
import { PROPOSALS } from '../data/proposals'
import { BOUNTIES } from '../data/bounties'
import { tierColor } from '../utils'
import { Link } from 'react-router-dom'

export function Dashboard() {
  const { account, connected } = useRadix()
  const { badges, loading } = useBadges(account)

  if (!connected) {
    return (
      <div className="connect-prompt">
        <h2>Welcome to the Radix Guild</h2>
        <p>Connect your Radix Wallet to view your badges and participate</p>
      </div>
    )
  }

  const primary = badges[0]
  const activeProposals = PROPOSALS.filter(p => p.status === 'active')
  const openBounties = BOUNTIES.filter(b => b.status === 'open').slice(0, 3)

  return (
    <>
      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading badges...</p>}

      <div className="card">
        <div className="card-header">
          <h2>My Status</h2>
          <span className="card-badge">{badges.length} badge{badges.length !== 1 ? 's' : ''}</span>
        </div>
        {badges.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>
            No badges yet. <Link to="/guild/mint" className="btn" style={{ marginLeft: 12, textDecoration: 'none' }}>Get Your Badge</Link>
          </p>
        ) : (
          <div className="stat-grid">
            <div className="stat-box">
              <div className="stat-label">Level</div>
              <div className="stat-value" style={{ color: tierColor(primary?.level) }}>{primary?.level?.toUpperCase()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">XP</div>
              <div className="stat-value accent">{primary?.xp?.toLocaleString()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Tier</div>
              <div className="stat-value" style={{ color: tierColor(primary?.tier) }}>{primary?.tier?.toUpperCase()}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{ color: primary?.status === 'active' ? 'var(--status-active)' : 'var(--status-revoked)' }}>{primary?.status}</div>
            </div>
          </div>
        )}
      </div>

      {activeProposals.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Active Proposals</h2>
            <Link to="/guild/proposals" className="card-badge" style={{ color: 'var(--accent)', textDecoration: 'none' }}>View All →</Link>
          </div>
          <div className="badge-list">
            {activeProposals.map(p => <ProposalCard key={p.id} proposal={p} />)}
          </div>
        </div>
      )}

      {badges.length > 0 && (
        <div className="card">
          <div className="card-header"><h2>My Badges</h2></div>
          <div className="badge-list">
            {badges.map(b => <BadgeCard key={b.id} badge={b} />)}
          </div>
        </div>
      )}

      {openBounties.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Open Bounties</h2>
            <Link to="/guild/bounties" className="card-badge" style={{ color: 'var(--accent)', textDecoration: 'none' }}>View All →</Link>
          </div>
          <div className="badge-list">
            {openBounties.map(b => <BountyCard key={b.id} bounty={b} />)}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header"><h2>Wallet</h2></div>
        <div className="kv-row">
          <span className="kv-label">Account</span>
          <span className="kv-value" style={{ fontSize: 11, wordBreak: 'break-all' }}>{account}</span>
        </div>
      </div>
    </>
  )
}
