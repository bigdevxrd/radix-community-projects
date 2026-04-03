import type { WorkingGroup } from '../types'

export const WORKING_GROUPS: WorkingGroup[] = [
  {
    id: 'wg-dev',
    name: 'Dev',
    description: 'Build managers, review PRs, maintain code',
    schema: 'rad_guild_dev',
    members: 0,
  },
  {
    id: 'wg-content',
    name: 'Content',
    description: 'Write docs, tutorials, manage website',
    schema: 'rad_guild_content',
    members: 0,
  },
  {
    id: 'wg-governance',
    name: 'Governance',
    description: 'Draft proposals, run consultations',
    schema: 'rad_guild_governance',
    members: 0,
  },
]
