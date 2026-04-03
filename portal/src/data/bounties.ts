import type { Bounty } from '../types'

export const BOUNTIES: Bounty[] = [
  {
    id: 'b-001',
    title: 'Write a "Getting Started with Radix Guild" tutorial',
    reward: 50,
    proof: 'Published doc or blog post',
    status: 'open',
  },
  {
    id: 'b-002',
    title: 'Design Guild banner/header for website',
    reward: 25,
    proof: 'Image file submitted',
    status: 'open',
  },
  {
    id: 'b-003',
    title: 'Create 3 social media posts about the Guild',
    reward: 25,
    proof: 'Posted on X/Twitter with links',
    status: 'open',
  },
  {
    id: 'b-004',
    title: 'Report and document a bug in the portal',
    reward: 10,
    proof: 'GitHub issue with repro steps',
    status: 'open',
  },
  {
    id: 'b-005',
    title: 'Translate Guild README to another language',
    reward: 30,
    proof: 'Pull request with translated file',
    status: 'open',
  },
]
