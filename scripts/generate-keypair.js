#!/usr/bin/env node
/**
 * Generate a new ed25519 keypair for the bot signer account.
 *
 * Usage: node scripts/generate-keypair.js
 *
 * IMPORTANT — READ BEFORE USING:
 *
 *   This creates a RAW ed25519 keypair. It is NOT a BIP39 mnemonic.
 *   You CANNOT import this key into the Radix Wallet mobile app.
 *   The private key hex IS the only way to control this account.
 *
 *   FUNDING RULES:
 *   - Do NOT send XRD from the Radix Wallet app to this account.
 *     The wallet will "securify" the account and the bot won't be
 *     able to withdraw funds.
 *   - Instead, fund via a DEX, faucet, or another programmatic transfer.
 *   - Or: accept that funds sent to this account can only be SPENT
 *     as transaction fees by the bot, never withdrawn.
 *   - Keep funding minimal (5-10 XRD). This covers hundreds of TX.
 *
 *   WHAT THE BOT CAN DO WITH THIS KEY:
 *   - lock_fee (pay for transactions)
 *   - Call methods on external components (CV2, BadgeManager)
 *   - Sign and submit any manifest
 *
 *   WHAT THE BOT CANNOT DO (if funded from a wallet):
 *   - withdraw XRD from its own account
 *   - Transfer funds to another account
 *   - The account becomes "securified" by the depositing wallet
 *
 *   HANDOVER:
 *   - The private key hex is the only secret needed
 *   - Store it in a password manager, not in code or chat
 *   - New admin: generate a fresh keypair, update .env, fund new account
 *   - Old account's remaining XRD is consumed as tx fees over time
 */

const { PrivateKey, RadixEngineToolkit, NetworkId } = require("@radixdlt/radix-engine-toolkit");
const crypto = require("crypto");

async function main() {
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKeyHex = privateKeyBytes.toString("hex");

  const pk = new PrivateKey.Ed25519(privateKeyHex);
  const publicKeyHex = pk.publicKeyHex();

  const address = await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
    pk.publicKey(),
    NetworkId.Mainnet
  );

  console.log("=== Bot Signer Keypair ===");
  console.log("");
  console.log("Private Key (KEEP SECRET — this is NOT a seed phrase):");
  console.log(privateKeyHex);
  console.log("");
  console.log("Public Key:");
  console.log(publicKeyHex);
  console.log("");
  console.log("Account Address:");
  console.log(address);
  console.log("");
  console.log("=== Add to .env ===");
  console.log("");
  console.log(`BOT_PRIVATE_KEY=${privateKeyHex}`);
  console.log(`RADIX_ACCOUNT_ADDRESS=${address}`);
  console.log("");
  console.log("=== WARNINGS ===");
  console.log("");
  console.log("1. This is a RAW ed25519 key, NOT a BIP39 mnemonic.");
  console.log("   You CANNOT import it into the Radix Wallet app.");
  console.log("");
  console.log("2. If you fund this account from the Radix Wallet,");
  console.log("   the account gets securified and the bot CANNOT");
  console.log("   withdraw funds. The XRD can only be spent as tx fees.");
  console.log("");
  console.log("3. Keep funding minimal (5-10 XRD). This covers hundreds");
  console.log("   of governance transactions at ~0.1 XRD each.");
  console.log("");
  console.log("4. Store this private key in a password manager.");
  console.log("   It is the ONLY way to control this account.");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
