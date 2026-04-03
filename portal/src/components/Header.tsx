import { useEffect, useState } from 'react'

export function Header() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <img src="/guild/rg-logo.png" alt="RG" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <h1>Radix Guild</h1>
        </div>
        <div className="header-controls">
          <button
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            style={{
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
              color: 'var(--text-secondary)', font: '400 14px var(--font-sans)',
            }}
            title="Toggle theme"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span className="network-pill">
            <span className="network-dot" />
            Mainnet
          </span>
          <radix-connect-button />
        </div>
      </div>
    </header>
  )
}
