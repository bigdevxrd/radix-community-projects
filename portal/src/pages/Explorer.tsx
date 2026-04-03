import { useState } from 'react'
import { lookupBadgeById } from '../services/gateway'
import { CONFIG } from '../config'
import { tierColor, formatDate } from '../utils'
import type { BadgeData } from '../types'

export function Explorer() {
  const [resource, setResource] = useState<string>(CONFIG.badgeNftResource)
  const [nfId, setNfId] = useState('')
  const [result, setResult] = useState<BadgeData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLookup() {
    if (!resource || !nfId) return
    setError('')
    setResult(null)
    setLoading(true)
    try {
      const badge = await lookupBadgeById(resource, nfId)
      if (badge) setResult(badge)
      else setError('Badge not found')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Badge Explorer</h2>
        <span className="card-badge">Lookup</span>
      </div>
      <div className="form-row">
        <input value={resource} onChange={e => setResource(e.target.value)} placeholder="Badge resource address" />
      </div>
      <div className="form-row">
        <input value={nfId} onChange={e => setNfId(e.target.value)} placeholder="Badge ID, e.g. <rad_dao_player_1>" />
        <button className="btn" onClick={handleLookup} disabled={loading}>
          {loading ? 'Loading...' : 'Look Up'}
        </button>
      </div>

      {error && <p style={{ color: 'var(--status-revoked)', marginTop: 12 }}>{error}</p>}

      {result && (
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <div style={{ font: '600 18px var(--font-sans)' }}>{result.issued_to}</div>
              <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-secondary)' }}>{result.schema_name}</div>
            </div>
            <span className="tier-pill" style={{
              background: tierColor(result.tier) + '1a',
              color: tierColor(result.tier),
            }}>
              {result.tier}
            </span>
          </div>
          <div className="kv-row"><span className="kv-label">Status</span><span className="kv-value">{result.status}</span></div>
          <div className="kv-row"><span className="kv-label">XP</span><span className="kv-value accent">{result.xp.toLocaleString()}</span></div>
          <div className="kv-row"><span className="kv-label">Level</span><span className="kv-value">{result.level}</span></div>
          <div className="kv-row"><span className="kv-label">Issued At</span><span className="kv-value">{formatDate(result.issued_at)}</span></div>
          <div className="kv-row"><span className="kv-label">Badge ID</span><span className="kv-value" style={{ fontSize: 11 }}>{result.id}</span></div>
        </div>
      )}
    </div>
  )
}
