'use strict';
/**
 * Standalone transaction signer for Radix Governance
 * Extracted from the trading engine — no external dependencies beyond radix-engine-toolkit
 *
 * Required env:
 *   BOT_PRIVATE_KEY — ed25519 hex private key
 *   RADIX_ACCOUNT_ADDRESS — signer account address
 *   RADIX_GATEWAY_URL — gateway (defaults to mainnet)
 */

const path = require('path');
const fs = require('fs');

// Load env from multiple locations
for (const f of [
  path.join(__dirname, '../.env'),
  path.join(__dirname, '.env'),
  path.join(process.env.HOME || '', '.secrets', '.env'),
]) {
  if (fs.existsSync(f)) require('dotenv').config({ path: f, override: false });
}

const { TransactionBuilder, PrivateKey, NetworkId, RadixEngineToolkit } = require('@radixdlt/radix-engine-toolkit');

const GATEWAY_URL = process.env.RADIX_GATEWAY_URL || 'https://mainnet.radixdlt.com';
const NETWORK_ID = NetworkId.Mainnet;

async function getCurrentEpoch() {
  const res = await fetch(`${GATEWAY_URL}/status/gateway-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  const data = await res.json();
  return data.ledger_state?.epoch ?? 1;
}

async function signAndSubmit(manifest) {
  const privateKeyHex = process.env.BOT_PRIVATE_KEY;
  if (!privateKeyHex) throw new Error('BOT_PRIVATE_KEY not set');

  const pk = new PrivateKey.Ed25519(privateKeyHex);
  const epoch = await getCurrentEpoch();
  const account = process.env.RADIX_ACCOUNT_ADDRESS;

  // Prepend lock_fee if not present
  if (account && !manifest.includes('lock_fee')) {
    manifest = `CALL_METHOD\n  Address("${account}")\n  "lock_fee"\n  Decimal("1")\n;\n\n` + manifest;
  }

  const builder = await TransactionBuilder.new();
  const notarized = await builder
    .header({
      networkId: NETWORK_ID,
      startEpochInclusive: epoch,
      endEpochExclusive: epoch + 10,
      nonce: Math.floor(Math.random() * 0xFFFFFFFF),
      notaryPublicKey: pk.publicKey(),
      notaryIsSignatory: true,
      tipPercentage: 0,
    })
    .manifest({ instructions: { kind: 'String', value: manifest }, blobs: [] })
    .notarize(pk);

  const compiled = await RadixEngineToolkit.NotarizedTransaction.compile(notarized);
  const hex = Buffer.from(compiled).toString('hex');
  const hashResult = await RadixEngineToolkit.NotarizedTransaction.intentHash(notarized);
  const intentHash = hashResult.id;

  console.log('[Signer] TX:', intentHash);

  const res = await fetch(`${GATEWAY_URL}/transaction/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notarized_transaction_hex: hex }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Submit failed: ' + JSON.stringify(data));

  return { intentHash, duplicate: data.duplicate };
}

async function waitForCommit(intentHash, maxWaitMs = 90000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${GATEWAY_URL}/transaction/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intent_hash: intentHash }),
    });
    const data = await res.json();
    if (data.status === 'CommittedSuccess') return { success: true, status: data };
    if (['CommittedFailure', 'Rejected'].includes(data.status)) return { success: false, status: data };
    await new Promise(r => setTimeout(r, 5000));
  }
  return { success: false, status: { status: 'Timeout' } };
}

module.exports = { signAndSubmit, waitForCommit };
