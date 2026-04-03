import { ECOSYSTEM_LINKS } from '../data/ecosystem'

export function Ecosystem() {
  return (
    <div className="card">
      <div className="card-header">
        <h2>Radix Ecosystem</h2>
        <span className="card-badge">Links</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>
        Connect with the Radix community. These tools plug into the Guild.
      </p>
      <div className="ecosystem-links">
        {ECOSYSTEM_LINKS.map(link => (
          <a key={link.name} href={link.url} target="_blank" className="eco-link"
            style={link.primary ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : {}}>
            <strong>{link.name}</strong>{link.description && ` — ${link.description}`}
          </a>
        ))}
      </div>
    </div>
  )
}
