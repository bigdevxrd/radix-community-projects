import { useEffect, useState } from 'react'
import { loadBadgesForAccount } from '../services/gateway'
import type { BadgeData } from '../types'

export function useBadges(account: string | null) {
  const [badges, setBadges] = useState<BadgeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!account) { setBadges([]); return }
    setLoading(true)
    setError(null)
    loadBadgesForAccount(account)
      .then(setBadges)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [account])

  function refresh() {
    if (account) {
      setLoading(true)
      loadBadgesForAccount(account)
        .then(setBadges)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false))
    }
  }

  return { badges, loading, error, refresh }
}
