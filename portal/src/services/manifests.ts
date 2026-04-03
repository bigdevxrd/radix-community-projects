import { CONFIG } from '../config'

export function buildMintManifest(account: string, username?: string): string {
  const name = username || `guild_${account.slice(-8)}`
  // Match Sats dashboard pattern exactly — single line format
  return [
    `CALL_METHOD Address("${account}") "lock_fee" Decimal("5");`,
    `CALL_METHOD Address("${CONFIG.managerComponent}") "public_mint" "${name}";`,
    `CALL_METHOD Address("${account}") "deposit_batch" Expression("ENTIRE_WORKTOP");`,
  ].join('\n')
}
