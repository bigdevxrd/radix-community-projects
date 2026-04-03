import type { BadgeData } from '../types'
import { tierColor } from '../utils'

export function BadgeCard({ badge }: { badge: BadgeData }) {
  return (
    <div className="badge-item">
      <div className="badge-item-info">
        <span className="badge-item-name">{badge.issued_to}</span>
        <span className="badge-item-schema">{badge.schema_name} | {badge.id}</span>
      </div>
      <span className="tier-pill" style={{
        background: tierColor(badge.tier) + '1a',
        color: tierColor(badge.tier),
      }}>
        {badge.tier}
      </span>
    </div>
  )
}
