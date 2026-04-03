import { useEffect, useRef, useState } from 'react'
import { RadixDappToolkit, DataRequestBuilder } from '@radixdlt/radix-dapp-toolkit'
// import { GatewayApiClient } from '@radixdlt/babylon-gateway-api-sdk'
import { CONFIG } from './config'
import './index.css'

type Page = 'dashboard' | 'explorer' | 'mint' | 'ecosystem'

interface BadgeData {
  id: string
  issued_to: string
  schema_name: string
  tier: string
  status: string
  xp: number
  level: string
  issued_at: string
  extra_data: string
}

// Gateway client available for future use
// const gateway = GatewayApiClient.initialize({
//   basePath: CONFIG.gatewayUrl,
//   applicationName: 'Radix Guild',
// })

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [account, setAccount] = useState<string | null>(null)
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [lookupResult, setLookupResult] = useState<BadgeData | null>(null)
  const [lookupError, setLookupError] = useState('')
  const [mintStatus, setMintStatus] = useState('')
  const rdtRef = useRef<ReturnType<typeof RadixDappToolkit> | null>(null)

  useEffect(() => {
    const rdt = RadixDappToolkit({
      dAppDefinitionAddress: CONFIG.dAppDefinitionAddress,
      networkId: CONFIG.networkId,
      applicationName: 'Radix Guild',
      applicationVersion: '1.0.0',
    })
    rdt.walletApi.setRequestData(DataRequestBuilder.accounts().exactly(1))
    rdt.walletApi.walletData$.subscribe((data) => {
      if (data.accounts?.length > 0) {
        setAccount(data.accounts[0].address)
        loadBadges(data.accounts[0].address)
      } else {
        setAccount(null)
        setBadges([])
      }
    })
    rdtRef.current = rdt
    return () => rdt.destroy()
  }, [])

  async function loadBadges(accountAddr: string) {
    try {
      const resp = await fetch(`${CONFIG.gatewayUrl}/state/entity/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          addresses: [accountAddr],
          aggregation_level: 'Vault',
          opt_ins: { non_fungible_include_nfids: true },
        }),
      })
      const data = await resp.json()
      const nfResources = data.items?.[0]?.non_fungible_resources?.items || []
      const badgeResource = nfResources.find(
        (r: any) => r.resource_address === CONFIG.badgeNftResource
      )
      if (!badgeResource) { setBadges([]); return }

      const nfIds = badgeResource.vaults?.items?.[0]?.items || []
      const loaded: BadgeData[] = []
      for (const nfId of nfIds) {
        const badge = await lookupBadge(nfId)
        if (badge) loaded.push(badge)
      }
      setBadges(loaded)
    } catch (e) {
      console.error('Failed to load badges:', e)
    }
  }

  async function lookupBadge(nfId: string): Promise<BadgeData | null> {
    try {
      const resp = await fetch(`${CONFIG.gatewayUrl}/state/non-fungible/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_address: CONFIG.badgeNftResource,
          non_fungible_ids: [nfId],
        }),
      })
      const data = await resp.json()
      const nft = data.non_fungible_ids?.[0]
      if (!nft?.data?.programmatic_json?.fields) return null

      const fields = nft.data.programmatic_json.fields
      const get = (i: number) => fields[i]?.value ?? fields[i]?.fields?.[0]?.value ?? ''

      return {
        id: nfId,
        issued_to: get(0),
        schema_name: get(1),
        issued_at: get(2),
        tier: get(3),
        status: get(4),
        xp: parseInt(get(6)) || 0,
        level: get(7),
        extra_data: get(8),
      }
    } catch { return null }
  }

  async function handleMint() {
    if (!rdtRef.current || !account) return
    setMintStatus('Minting...')
    try {
      const result = await rdtRef.current.walletApi.sendTransaction({
        transactionManifest: `
CALL_METHOD
  Address("${account}")
  "lock_fee"
  Decimal("10")
;
CALL_METHOD
  Address("${CONFIG.managerComponent}")
  "public_mint"
  "${account.slice(0, 20)}"
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`,
      })
      if (result.isOk()) {
        setMintStatus('Badge minted! Check your wallet.')
        setTimeout(() => loadBadges(account), 3000)
      } else {
        setMintStatus('Transaction rejected')
      }
    } catch (e: any) {
      setMintStatus(`Error: ${e.message}`)
    }
  }

  async function handleLookup(resourceAddr: string, nfId: string) {
    setLookupError('')
    setLookupResult(null)
    try {
      const resp = await fetch(`${CONFIG.gatewayUrl}/state/non-fungible/data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_address: resourceAddr || CONFIG.badgeNftResource,
          non_fungible_ids: [nfId],
        }),
      })
      const data = await resp.json()
      const nft = data.non_fungible_ids?.[0]
      if (!nft?.data?.programmatic_json?.fields) {
        setLookupError('Badge not found')
        return
      }
      const fields = nft.data.programmatic_json.fields
      const get = (i: number) => fields[i]?.value ?? fields[i]?.fields?.[0]?.value ?? ''
      setLookupResult({
        id: nfId,
        issued_to: get(0),
        schema_name: get(1),
        issued_at: get(2),
        tier: get(3),
        status: get(4),
        xp: parseInt(get(6)) || 0,
        level: get(7),
        extra_data: get(8),
      })
    } catch (e: any) {
      setLookupError(e.message)
    }
  }

  const tierColor = (tier: string) => {
    const colors: Record<string, string> = {
      newcomer: '#8888a0', contributor: '#4ea8de',
      builder: '#a78bfa', trusted: '#f59e0b', elder: '#00e49f',
    }
    return colors[tier] || '#8888a0'
  }

  const formatDate = (ts: string) => {
    const n = parseInt(ts)
    if (!n) return '-'
    return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
  }

  return (
    <>
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <div className="logo-icon"><div className="logo-icon-inner" /></div>
            <h1>Radix Guild</h1>
          </div>
          <div className="header-controls">
            <span className="network-pill">
              <span className="network-dot" />
              Mainnet
            </span>
            <radix-connect-button />
          </div>
        </div>
      </header>

      <nav className="nav">
        {(['dashboard', 'explorer', 'mint', 'ecosystem'] as Page[]).map((p) => (
          <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
            {p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </nav>

      <main className="main">
        {page === 'dashboard' && (
          account ? (
            <>
              <div className="card">
                <div className="card-header">
                  <h2>My Badges</h2>
                  <span className="card-badge">{badges.length} held</span>
                </div>
                {badges.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>
                    No badges yet. <button className="btn" style={{ marginLeft: 12 }} onClick={() => setPage('mint')}>Get Your Badge</button>
                  </p>
                ) : (
                  <>
                    <div className="stat-grid" style={{ marginBottom: 20 }}>
                      <div className="stat-box">
                        <div className="stat-label">Level</div>
                        <div className="stat-value" style={{ color: tierColor(badges[0]?.level) }}>
                          {badges[0]?.level?.toUpperCase()}
                        </div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">XP</div>
                        <div className="stat-value accent">{badges[0]?.xp?.toLocaleString()}</div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Tier</div>
                        <div className="stat-value" style={{ color: tierColor(badges[0]?.tier) }}>
                          {badges[0]?.tier?.toUpperCase()}
                        </div>
                      </div>
                      <div className="stat-box">
                        <div className="stat-label">Status</div>
                        <div className="stat-value" style={{ color: badges[0]?.status === 'active' ? 'var(--status-active)' : 'var(--status-revoked)' }}>
                          {badges[0]?.status}
                        </div>
                      </div>
                    </div>
                    <div className="badge-list">
                      {badges.map((b) => (
                        <div className="badge-item" key={b.id}>
                          <div className="badge-item-info">
                            <span className="badge-item-name">{b.issued_to}</span>
                            <span className="badge-item-schema">{b.schema_name} | {b.id}</span>
                          </div>
                          <span className="tier-pill" style={{
                            background: tierColor(b.tier) + '1a',
                            color: tierColor(b.tier),
                          }}>
                            {b.tier}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="card">
                <div className="card-header">
                  <h2>Wallet</h2>
                </div>
                <div className="kv-row">
                  <span className="kv-label">Account</span>
                  <span className="kv-value" style={{ fontSize: 11, wordBreak: 'break-all' }}>{account}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="connect-prompt">
              <h2>Welcome to the Radix Guild</h2>
              <p>Connect your Radix Wallet to view your badges and participate</p>
            </div>
          )
        )}

        {page === 'mint' && (
          <div className="card">
            <div className="card-header">
              <h2>Get Your Badge</h2>
              <span className="card-badge">Free</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Mint a free Radix Guild participation badge. Your badge tracks your XP, level, and contributions across all DAOs.
            </p>
            <button className="btn" onClick={handleMint} disabled={!account}>
              {account ? 'Mint Free Badge' : 'Connect Wallet First'}
            </button>
            {mintStatus && (
              <p style={{ marginTop: 12, color: mintStatus.includes('Error') ? 'var(--status-revoked)' : 'var(--accent)' }}>
                {mintStatus}
              </p>
            )}
          </div>
        )}

        {page === 'explorer' && (
          <div className="card">
            <div className="card-header">
              <h2>Badge Explorer</h2>
              <span className="card-badge">Lookup</span>
            </div>
            <ExplorerForm onLookup={handleLookup} />
            {lookupError && <p style={{ color: 'var(--status-revoked)', marginTop: 12 }}>{lookupError}</p>}
            {lookupResult && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div>
                    <div style={{ font: '600 18px var(--font-sans)' }}>{lookupResult.issued_to}</div>
                    <div style={{ font: '400 12px var(--font-mono)', color: 'var(--text-secondary)' }}>{lookupResult.schema_name}</div>
                  </div>
                  <span className="tier-pill" style={{
                    background: tierColor(lookupResult.tier) + '1a',
                    color: tierColor(lookupResult.tier),
                  }}>
                    {lookupResult.tier}
                  </span>
                </div>
                <div className="kv-row"><span className="kv-label">Status</span><span className="kv-value">{lookupResult.status}</span></div>
                <div className="kv-row"><span className="kv-label">XP</span><span className="kv-value accent">{lookupResult.xp.toLocaleString()}</span></div>
                <div className="kv-row"><span className="kv-label">Level</span><span className="kv-value">{lookupResult.level}</span></div>
                <div className="kv-row"><span className="kv-label">Issued At</span><span className="kv-value">{formatDate(lookupResult.issued_at)}</span></div>
                <div className="kv-row"><span className="kv-label">Badge ID</span><span className="kv-value" style={{ fontSize: 11 }}>{lookupResult.id}</span></div>
              </div>
            )}
          </div>
        )}

        {page === 'ecosystem' && (
          <div className="card">
            <div className="card-header">
              <h2>Radix Ecosystem</h2>
              <span className="card-badge">Links</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
              Connect with the Radix community. These tools plug into the Guild.
            </p>
            <div className="ecosystem-links">
              <a href="https://www.crumbsup.io/#dao?id=4db790d7-4d75-49ed-a2e0-3514743809e0" target="_blank" className="eco-link">Radix Guild DAO — Governance</a>
              <a href="https://quack.space/app/" target="_blank" className="eco-link">QuackSpace — Social Identity</a>
              <a href="https://miow.me/" target="_blank" className="eco-link">Miow — Web3 Website Builder</a>
              <a href="https://dashboard.radixdlt.com" target="_blank" className="eco-link">Radix Dashboard</a>
              <a href="https://radix.wiki/ecosystem" target="_blank" className="eco-link">Radix Wiki — Ecosystem</a>
              <a href="https://consultation.radixdlt.com" target="_blank" className="eco-link">Radix Consultation</a>
              <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank" className="eco-link">Source Code — GitHub</a>
            </div>
          </div>
        )}
      </main>

      <footer className="footer">
        <a href="https://github.com/bigdevxrd/radix-community-projects" target="_blank">Source on GitHub</a>
        <span style={{ color: 'var(--border)' }}>|</span>
        <span>Built on Radix</span>
      </footer>
    </>
  )
}

function ExplorerForm({ onLookup }: { onLookup: (resource: string, nfId: string) => void }) {
  const [resource, setResource] = useState<string>(CONFIG.badgeNftResource)
  const [nfId, setNfId] = useState('')
  return (
    <>
      <div className="form-row">
        <input value={resource} onChange={(e) => setResource(e.target.value)} placeholder="Badge resource address" />
      </div>
      <div className="form-row">
        <input value={nfId} onChange={(e) => setNfId(e.target.value)} placeholder="Badge ID, e.g. <rad_dao_player_1>" />
        <button className="btn" onClick={() => onLookup(resource, nfId)}>Look Up</button>
      </div>
    </>
  )
}

export default App
