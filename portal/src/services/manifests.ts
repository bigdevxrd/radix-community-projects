import { CONFIG } from '../config'

export function buildMintManifest(account: string, username?: string): string {
  const name = username || `guild_${account.slice(-8)}`
  return `
CALL_METHOD
  Address("${CONFIG.managerComponent}")
  "public_mint"
  "${name}"
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`.trim()
}
