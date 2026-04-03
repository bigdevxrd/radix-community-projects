export interface BadgeData {
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

export interface Proposal {
  id: string
  title: string
  abstract: string
  status: 'active' | 'passed' | 'failed' | 'closed'
  source: 'crumbsup' | 'consultation' | 'guild'
  sourceUrl: string
  votesFor?: number
  votesAgainst?: number
  endDate?: string
}

export interface Bounty {
  id: string
  title: string
  reward: number
  proof: string
  status: 'open' | 'claimed' | 'completed'
  claimedBy?: string
}

export interface WorkingGroup {
  id: string
  name: string
  description: string
  schema: string
  members: number
}

export interface EcosystemLink {
  name: string
  url: string
  description?: string
  primary?: boolean
}
