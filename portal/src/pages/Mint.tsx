import { useState } from 'react'
import { useRadix } from '../hooks/useRadix'
import { buildMintManifest } from '../services/manifests'

export function Mint() {
  const { account, connected, sendTransaction } = useRadix()
  const [status, setStatus] = useState('')

  async function handleMint() {
    if (!account) return
    setStatus('Minting...')
    const manifest = buildMintManifest(account)
    const result = await sendTransaction(manifest)
    if (result.ok) {
      setStatus('Badge minted! Check your wallet.')
    } else {
      setStatus(`Error: ${result.error}`)
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2>Get Your Badge</h2>
        <span className="card-badge">Free</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Mint a free Radix Guild participation badge. Your badge tracks your XP, level, and contributions across all DAOs.
      </p>
      <button className="btn" onClick={handleMint} disabled={!connected}>
        {connected ? 'Mint Free Badge' : 'Connect Wallet First'}
      </button>
      {status && (
        <p style={{ marginTop: 12, color: status.includes('Error') ? 'var(--status-revoked)' : 'var(--accent)' }}>
          {status}
        </p>
      )}
    </div>
  )
}
