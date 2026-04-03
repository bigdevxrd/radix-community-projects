import { useEffect, useState } from 'react'
import { CONFIG } from '../config'

interface ServiceStatus {
  name: string
  url: string
  status: 'checking' | 'online' | 'offline'
  latency?: number
}

export function Status() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Radix Gateway API', url: CONFIG.gatewayUrl + '/status/gateway-status', status: 'checking' },
    { name: 'Guild Portal', url: '/guild/', status: 'checking' },
    { name: 'Badge Manager', url: CONFIG.gatewayUrl + '/state/entity/details', status: 'checking' },
  ])

  useEffect(() => {
    checkServices()
  }, [])

  async function checkServices() {
    const updated = await Promise.all(
      services.map(async (s) => {
        const start = Date.now()
        try {
          if (s.name === 'Badge Manager') {
            const resp = await fetch(s.url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ addresses: [CONFIG.managerComponent] }),
            })
            return { ...s, status: resp.ok ? 'online' as const : 'offline' as const, latency: Date.now() - start }
          }
          const resp = await fetch(s.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
          return { ...s, status: resp.ok ? 'online' as const : 'offline' as const, latency: Date.now() - start }
        } catch {
          return { ...s, status: 'offline' as const, latency: Date.now() - start }
        }
      })
    )
    setServices(updated)
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <h2>System Status</h2>
          <button className="btn" style={{ padding: '4px 12px', fontSize: 11 }} onClick={checkServices}>Refresh</button>
        </div>
        <div className="badge-list">
          {services.map((s) => (
            <div className="badge-item" key={s.name}>
              <div className="badge-item-info">
                <span className="badge-item-name">{s.name}</span>
                <span className="badge-item-schema">{s.latency ? s.latency + 'ms' : 'checking...'}</span>
              </div>
              <span className="tier-pill" style={{
                background: s.status === 'online' ? 'var(--accent-dim)' : s.status === 'offline' ? 'rgba(239,68,68,0.1)' : 'var(--bg-surface-2)',
                color: s.status === 'online' ? 'var(--accent)' : s.status === 'offline' ? 'var(--status-revoked)' : 'var(--text-muted)',
              }}>
                {s.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Deployed Addresses</h2></div>
        <div className="kv-row">
          <span className="kv-label">Package</span>
          <span className="kv-value" style={{ fontSize: 10, wordBreak: 'break-all' }}>{CONFIG.packageAddress}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Factory</span>
          <span className="kv-value" style={{ fontSize: 10, wordBreak: 'break-all' }}>{CONFIG.factoryComponent}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Manager</span>
          <span className="kv-value" style={{ fontSize: 10, wordBreak: 'break-all' }}>{CONFIG.managerComponent}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">Badge NFT</span>
          <span className="kv-value" style={{ fontSize: 10, wordBreak: 'break-all' }}>{CONFIG.badgeNftResource}</span>
        </div>
        <div className="kv-row">
          <span className="kv-label">dApp Definition</span>
          <span className="kv-value" style={{ fontSize: 10, wordBreak: 'break-all' }}>{CONFIG.dAppDefinitionAddress}</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h2>Links</h2></div>
        <div className="ecosystem-links">
          <a href={`${CONFIG.dashboardUrl}/component/${CONFIG.factoryComponent}`} target="_blank" className="eco-link">Factory on Dashboard</a>
          <a href={`${CONFIG.dashboardUrl}/component/${CONFIG.managerComponent}`} target="_blank" className="eco-link">Manager on Dashboard</a>
          <a href={`${CONFIG.dashboardUrl}/resource/${CONFIG.badgeNftResource}`} target="_blank" className="eco-link">Badge Resource on Dashboard</a>
          <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="eco-link">Source Code</a>
        </div>
      </div>
    </>
  )
}
