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
