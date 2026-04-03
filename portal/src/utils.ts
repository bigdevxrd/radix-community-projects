export function tierColor(tier: string): string {
  const colors: Record<string, string> = {
    member: '#8888a0',
    newcomer: '#8888a0',
    contributor: '#4ea8de',
    builder: '#a78bfa',
    steward: '#f59e0b',
    trusted: '#f59e0b',
    elder: '#00e49f',
    lead: '#f59e0b',
    senior: '#00e49f',
  }
  return colors[tier] || '#8888a0'
}

export function formatDate(ts: string): string {
  const n = parseInt(ts)
  if (!n) return '-'
  return new Date(n * 1000).toISOString().replace('T', ' ').slice(0, 19) + ' UTC'
}
