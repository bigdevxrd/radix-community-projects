#!/usr/bin/env node
/**
 * Generate a new ed25519 keypair for the bot signer account.
 *
 * Usage: node scripts/generate-keypair.js
 *
 * Outputs:
 *   - Private key (hex) — store in .env as BOT_PRIVATE_KEY
 *   - Public key (hex) — for reference
 *   - Account address — store in .env as RADIX_ACCOUNT_ADDRESS
 *
 * SECURITY:
 *   - Run this ONCE, save the output securely
 *   - Never commit the private key to git
 *   - Fund the account with minimal XRD (5-10 XRD for tx fees)
 *   - For handover: transfer the private key securely to the new admin
 */

const { PrivateKey, RadixEngineToolkit, NetworkId } = require("@radixdlt/radix-engine-toolkit");
const crypto = require("crypto");

async function main() {
  // Generate 32 random bytes for the private key
  const privateKeyBytes = crypto.randomBytes(32);
  const privateKeyHex = privateKeyBytes.toString("hex");

  // Create the key object
  const pk = new PrivateKey.Ed25519(privateKeyHex);
  const publicKeyHex = pk.publicKeyHex();

  // Derive the account address
  const address = await RadixEngineToolkit.Derive.virtualAccountAddressFromPublicKey(
    pk.publicKey(),
    NetworkId.Mainnet
  );

  console.log("=== Bot Signer Keypair ===\n");
  console.log("Private Key (KEEP SECRET):");
  console.log(privateKeyHex);
  console.log("\nPublic Key:");
  console.log(publicKeyHex);
  console.log("\nAccount Address:");
  console.log(address);
  console.log("\n=== Add to /opt/rad-dao/bot/.env ===\n");
  console.log(`BOT_PRIVATE_KEY=${privateKeyHex}`);
  console.log(`RADIX_ACCOUNT_ADDRESS=${address}`);
  console.log("\n=== Next Steps ===\n");
  console.log("1. Copy the two lines above into /opt/rad-dao/bot/.env");
  console.log("2. Send 5-10 XRD to the account address above");
  console.log("3. Run: pm2 restart guild-bot --update-env");
  console.log("4. Test: create a /temp in Telegram, check if it bridges to CV2");
  console.log("\nFor handover: the private key is the only secret.");
  console.log("Transfer it securely to the new admin when the DAO transitions.");
  console.log("The account only needs enough XRD for transaction fees (~0.1 XRD each).");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
