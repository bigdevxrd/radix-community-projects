const GATEWAY = "https://mainnet.radixdlt.com";
const BADGE_NFT = process.env.BADGE_NFT || "resource_rdx1n22rq94kh6ugwnrvc65m2pwhle3s6ez6j7702vkn2ctkaxemz4ppwl";
const ESCROW_COMPONENT = process.env.ESCROW_COMPONENT || "component_rdx1cp8mwwe2pkrrtm05p7txgygf9y9uuwx6p87djkda8stk8nuwpyg56r";

async function hasBadge(radixAddress) {
  try {
    const badge = await getBadgeData(radixAddress);
    return badge !== null && badge.status === "active";
  } catch (e) {
    console.error("[Gateway] hasBadge error:", e.message);
    return false;
  }
}

async function getBadgeData(radixAddress) {
  try {
    const resp = await fetch(`${GATEWAY}/state/entity/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [radixAddress],
        aggregation_level: "Vault",
        opt_ins: { non_fungible_include_nfids: true },
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const nfResources = data.items?.[0]?.non_fungible_resources?.items || [];
    const badgeRes = nfResources.find((r) => r.resource_address === BADGE_NFT);
    if (!badgeRes) return null;

    const nfIds = badgeRes.vaults?.items?.[0]?.items || [];
    if (nfIds.length === 0) return null;

    const badgeResp = await fetch(`${GATEWAY}/state/non-fungible/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resource_address: BADGE_NFT,
        non_fungible_ids: [nfIds[0]],
      }),
    });
    if (!badgeResp.ok) return null;
    const badgeData = await badgeResp.json();
    const nft = badgeData.non_fungible_ids?.[0];
    if (!nft?.data?.programmatic_json?.fields) return null;

    const f = nft.data.programmatic_json.fields;
    const g = (i) => f[i]?.value || f[i]?.fields?.[0]?.value || "-";

    return {
      id: nfIds[0],
      issued_to: g(0),
      schema: g(1),
      tier: g(3),
      status: g(4),
      xp: parseInt(g(6)) || 0,
      level: g(7),
    };
  } catch (e) {
    console.error("[Gateway] getBadgeData error:", e.message);
    return null;
  }
}

// ── Escrow On-Chain Reads ────────────────────────────────

/**
 * Read TaskEscrow component state from mainnet.
 * Returns: { total_tasks, total_completed, total_cancelled, total_escrowed, total_released, fee_pct, next_id }
 */
async function getEscrowStats() {
  try {
    const resp = await fetch(`${GATEWAY}/state/entity/details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        addresses: [ESCROW_COMPONENT],
        aggregation_level: "Vault",
        opt_ins: { explicit_metadata: ["name"] },
      }),
    });
    if (!resp.ok) {
      console.error("[Gateway] getEscrowStats HTTP", resp.status);
      return null;
    }
    const data = await resp.json();
    const state = data.items?.[0]?.details?.state?.fields;
    if (!state) return null;

    // Fields are in order from the Scrypto struct
    // 0: task_vaults (KVS), 1: tasks (KVS), 2: fee_vault, 3: minter_vault,
    // 4: receipt_manager, 5: badge_resource, 6: next_id, 7: fee_pct,
    // 8: min_deposit, 9: total_tasks, 10: total_completed, 11: total_cancelled,
    // 12: total_escrowed, 13: total_released
    const g = (i) => state[i]?.value || "0";

    return {
      next_id: parseInt(g(6)) || 1,
      fee_pct: g(7),
      min_deposit: g(8),
      total_tasks: parseInt(g(9)) || 0,
      total_completed: parseInt(g(10)) || 0,
      total_cancelled: parseInt(g(11)) || 0,
      total_escrowed: g(12),
      total_released: g(13),
      component: ESCROW_COMPONENT,
      source: "on-chain",
    };
  } catch (e) {
    console.error("[Gateway] getEscrowStats error:", e.message);
    return null;
  }
}

/**
 * Verify a transaction actually deposited into the TaskEscrow component.
 * Returns: { verified, amount, task_id } or { verified: false, reason }
 */
async function verifyEscrowTx(txHash) {
  try {
    const resp = await fetch(`${GATEWAY}/transaction/committed-details`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent_hash: txHash,
        opt_ins: {
          receipt_events: true,
          affected_global_entities: true,
          balance_changes: true,
        },
      }),
    });
    if (!resp.ok) {
      console.error("[Gateway] verifyEscrowTx HTTP", resp.status);
      return { verified: false, reason: "gateway_error" };
    }
    const data = await resp.json();
    const tx = data.transaction;

    if (!tx) return { verified: false, reason: "tx_not_found" };
    if (tx.transaction_status !== "CommittedSuccess") {
      return { verified: false, reason: "tx_failed", status: tx.transaction_status };
    }

    // Check if the escrow component was affected
    const entities = tx.affected_global_entities || [];
    if (!entities.includes(ESCROW_COMPONENT)) {
      return { verified: false, reason: "escrow_not_involved" };
    }

    // Look for TaskCreatedEvent in receipt events
    const events = tx.receipt?.events || [];
    const createEvent = events.find(e =>
      e.name === "TaskCreatedEvent" &&
      e.emitter?.entity?.entity_address === ESCROW_COMPONENT
    );

    if (createEvent) {
      const fields = createEvent.data?.fields || [];
      return {
        verified: true,
        event: "TaskCreated",
        task_id: parseInt(fields[0]?.value) || null,
        amount: fields[1]?.value || null,
        creator: fields[2]?.value || null,
        tx_hash: txHash,
      };
    }

    // Fallback — escrow was involved but we couldn't parse the event
    return {
      verified: true,
      event: "unknown",
      tx_hash: txHash,
      note: "Escrow component was affected but event not parsed",
    };
  } catch (e) {
    console.error("[Gateway] verifyEscrowTx error:", e.message);
    return { verified: false, reason: "error", message: e.message };
  }
}

module.exports = { hasBadge, getBadgeData, getEscrowStats, verifyEscrowTx };
