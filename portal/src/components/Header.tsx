export function Header() {
  return (
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
  )
}
