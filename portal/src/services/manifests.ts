import { CONFIG } from '../config'

export function buildMintManifest(account: string): string {
  return `
CALL_METHOD
  Address("${account}")
  "lock_fee"
  Decimal("10")
;
CALL_METHOD
  Address("${CONFIG.managerComponent}")
  "public_mint"
  "${account.slice(0, 20)}"
;
CALL_METHOD
  Address("${account}")
  "deposit_batch"
  Expression("ENTIRE_WORKTOP")
;`.trim()
}
