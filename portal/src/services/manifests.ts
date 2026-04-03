import { CONFIG } from '../config'

export function buildMintManifest(account: string, username?: string): string {
  const name = username || `guild_${account.slice(-8)}`
  // Minimal manifest — only the component call. Wallet adds lock_fee + deposit.
  return `CALL_METHOD Address("${CONFIG.managerComponent}") "public_mint" "${name}";`
}
