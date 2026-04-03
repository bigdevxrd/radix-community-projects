import { CONFIG } from '../config'

export function buildMintManifest(account: string, username?: string): string {
  const name = username || `guild_${account.slice(-8)}`
  // Withdraw 0.01 XRD and re-deposit — makes wallet recognise as conforming TX
  // Then call public_mint and deposit the badge
  return [
    `CALL_METHOD Address("${account}") "withdraw" Address("resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd") Decimal("0.01");`,
    `CALL_METHOD Address("${CONFIG.managerComponent}") "public_mint" "${name}";`,
    `CALL_METHOD Address("${account}") "deposit_batch" Expression("ENTIRE_WORKTOP");`,
  ].join('\n')
}
