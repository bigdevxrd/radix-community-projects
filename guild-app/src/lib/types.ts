export interface BadgeInfo {
  id: string;
  issued_to: string;
  schema_name: string;
  issued_at: number;
  tier: string;
  status: string;
  last_updated: number;
  xp: number;
  level: string;
  extra_data: string;
}

export interface TxResult {
  ok: boolean;
  txId?: string;
  error?: string;
}

// Analytics types
export interface AnalyticsSummary {
  total_voters: number;
  total_proposals: number;
  pass_rate: number;
  xp_distributed: number;
  bounties_paid: number;
  avg_votes_per_proposal: number;
  charter_progress: {
    phase_1: { total: number; resolved: number };
    phase_2: { total: number; resolved: number };
    phase_3: { total: number; resolved: number };
  };
}

export interface TimelineEntry {
  month: string;
  total: number;
  passed: number;
  failed: number;
  amended: number;
}

export interface VoterBucket {
  range: string;
  count: number;
}

export interface XpWeekEntry {
  week: string;
  total: number;
  xp: number;
}

export interface XpDistribution {
  by_week: XpWeekEntry[];
  top_earners: { address: string; total: number }[];
}

export interface CharterPhaseProgress {
  total: number;
  resolved: number;
  percent: number;
  ready: boolean;
  blockers: string[];
  next_to_vote: string | null;
  reason?: string;
}

export interface CharterProgressAnalytics {
  phase_1: CharterPhaseProgress;
  phase_2: CharterPhaseProgress;
  phase_3: CharterPhaseProgress;
}

export interface TopVoter {
  address: string;
  votes: number;
  streak: number;
  last_vote: string | null;
}

// Proposal / Outcome types
export interface Proposal {
  id: number;
  title: string;
  type: string;
  status: string;
  creator_tg_id: number;
  created_at: number;
  ends_at: number;
  min_votes: number;
  charter_param?: string;
  options?: string[];
  description?: string;
  recorded_on_chain?: number;
  on_chain_tx?: string;
  on_chain_outcome_json?: string;
}

export interface VoteEntry {
  radix_address: string;
  vote: string;
  voted_at: number;
}

export interface CharterParam {
  param_key: string;
  title: string;
  category: string;
  phase: number;
  status: string;
  param_value?: string;
  depends_on: string;
  proposal_type: string;
  options?: string;
  resolved_at?: number;
  resolved_by?: number;
}

export interface ProposalOutcome {
  proposal: Proposal;
  counts: Record<string, number>;
  total_votes: number;
  votes: VoteEntry[];
  charter_param: CharterParam | null;
}

// Bounty types
export interface Bounty {
  id: number;
  title: string;
  description?: string;
  reward_xrd: number;
  reward_xp: number;
  status: string;
  creator_tg_id: number;
  assignee_tg_id?: number;
  assignee_address?: string;
  github_issue?: string;
  github_pr?: string;
  created_at: number;
  submitted_at?: number;
  paid_at?: number;
  paid_tx?: string;
}

export interface BountyStats {
  open: number;
  assigned: number;
  submitted: number;
  verified: number;
  paid: number;
  totalPaid: number;
  escrow: { funded: number; released: number; available: number };
}

// XP types
export interface XpQueueEntry {
  address: string;
  amount: number;
  reason: string;
  proposal_id?: number;
  awarded_at?: number;
  signed?: boolean;
}

// Health types
export interface SystemHealth {
  bot: { status: "ok" | "error" | "unknown"; uptime?: number; lastCheck?: number };
  api: { status: "ok" | "error" | "unknown"; responseMs?: number; errorRate?: number };
  db: { status: "ok" | "error" | "unknown"; sizeMb?: number };
}

export interface AdminStats {
  pending_proposals: number;
  unresolved_charter: number;
  xp_queue: number;
  bounty_submitted: number;
  bounty_open: number;
}

