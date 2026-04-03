import { useState } from 'react'
import { useRadix } from '../hooks/useRadix'
import { buildMintManifest } from '../services/manifests'
import { CONFIG } from '../config'

export function Mint() {
  const { account, connected, sendTransaction } = useRadix()
  const [status, setStatus] = useState('')
  const [txId, setTxId] = useState('')

  async function handleMint() {
    if (!account) {
      setStatus('Error: No account connected')
      return
    }
    setStatus('Opening Radix Wallet...')
    setTxId('')

    try {
      const manifest = buildMintManifest(account)
      console.log('[Mint] Account:', account)
      console.log('[Mint] Manager:', CONFIG.managerComponent)
      console.log('[Mint] Manifest:', manifest)

      const result = await sendTransaction(manifest)
      console.log('[Mint] Result:', result)

      if (result.ok) {
        setStatus('Badge minted! Check your wallet.')
        setTxId(result.txId || '')
      } else {
        setStatus(`Error: ${result.error}`)
      }
    } catch (e: any) {
      console.error('[Mint] Exception:', e)
      setStatus(`Error: ${e.message || 'Unexpected error'}`)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Become a Member</h2>
        <span className="card-badge">Free</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Join the Radix Guild. Your member badge tracks your XP, level, and contributions across all DAOs.
      </p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button className="btn" onClick={handleMint} disabled={!connected}>
          {connected ? 'Join the Guild' : 'Connect Wallet First'}
        </button>
        {connected && (
          <span style={{ font: '400 11px var(--font-mono)', color: 'var(--text-muted)' }}>
            Costs ~0.1 XRD gas only
          </span>
        )}
      </div>
      {status && (
        <p style={{ marginTop: 12, color: status.includes('Error') ? 'var(--status-revoked)' : 'var(--accent)' }}>
          {status}
        </p>
      )}
      {txId && (
        <a
          href={`${CONFIG.dashboardUrl}/transaction/${txId}`}
          target="_blank"
          style={{ display: 'block', marginTop: 8, font: '400 12px var(--font-mono)', color: 'var(--accent)' }}
        >
          View on Dashboard →
        </a>
      )}
    </div>
  )
}
