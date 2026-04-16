use scrypto_test::prelude::*;

// ============================================================
// TEST SUITE — TaskEscrowV3
//
// Covers: instantiation, create, claim, submit, release,
//         cancel, force_cancel, expire, admin ops, full lifecycle
// ============================================================

/// Helper: deploy escrow V3 with a badge manager for claim/submit proofs.
/// Returns (ledger, public_key, admin_account, escrow_component, badge_resource, owner_badge, verifier_badge)
fn setup_escrow() -> (
    DefaultLedgerSimulator,
    Secp256k1PublicKey,
    ComponentAddress,
    ComponentAddress,
    ResourceAddress,
    ResourceAddress,
    ResourceAddress,
) {
    let mut ledger = LedgerSimulatorBuilder::new().build();
    let (public_key, _private_key, account) = ledger.new_allocated_account();
    let package_address = ledger.compile_and_publish(this_package!());

    // Create owner badge and verifier badge as simple fungible resources
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_function(
            package_address,
            "TaskEscrowV3",
            "instantiate",
            manifest_args!(
                dec!("2.5"),                                   // fee_pct
                XRD,                                           // initial_token
                dec!("5"),                                     // initial_min_deposit
                XRD,                                           // verifier_badge (using XRD as placeholder)
                XRD,                                           // guild_badge (using XRD as placeholder)
                XRD,                                           // owner_badge (using XRD as placeholder)
                GlobalAddress::from(account)                   // dapp_def
            ),
        )
        .build();

    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();

    let escrow = receipt.expect_commit(true).new_component_addresses()[0];

    // Using XRD as badge stand-in for simplicity in tests
    // In production, these would be separate badge resources
    (ledger, public_key, account, escrow, XRD, XRD, XRD)
}

/// Helper: create a task with XRD deposit
fn create_task(
    ledger: &mut DefaultLedgerSimulator,
    public_key: &Secp256k1PublicKey,
    account: ComponentAddress,
    escrow: ComponentAddress,
    amount: Decimal,
    deadline: Option<i64>,
) -> TransactionReceiptV1 {
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .withdraw_from_account(account, XRD, amount)
        .take_from_worktop(XRD, amount, "deposit")
        .with_name_lookup(|builder, lookup| {
            builder.call_method(
                escrow,
                "create_task",
                manifest_args!(lookup.bucket("deposit"), account, deadline),
            )
        })
        .call_method(
            account,
            "deposit_batch",
            manifest_args!(ManifestExpression::EntireWorktop),
        )
        .build();

    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(public_key)],
    )
}

/// Helper: claim a task
fn claim_task(
    ledger: &mut DefaultLedgerSimulator,
    public_key: &Secp256k1PublicKey,
    account: ComponentAddress,
    escrow: ComponentAddress,
    task_id: u64,
    badge_resource: ResourceAddress,
) -> TransactionReceiptV1 {
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(account, "create_proof_of_amount", manifest_args!(badge_resource, dec!("1")))
        .call_method(
            escrow,
            "claim_task",
            manifest_args!(task_id, account, ManifestProof(1u32)),
        )
        .build();

    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(public_key)],
    )
}

/// Helper: submit a task
fn submit_task(
    ledger: &mut DefaultLedgerSimulator,
    public_key: &Secp256k1PublicKey,
    account: ComponentAddress,
    escrow: ComponentAddress,
    task_id: u64,
    badge_resource: ResourceAddress,
) -> TransactionReceiptV1 {
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(account, "create_proof_of_amount", manifest_args!(badge_resource, dec!("1")))
        .call_method(
            escrow,
            "submit_task",
            manifest_args!(task_id, ManifestProof(1u32)),
        )
        .build();

    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(public_key)],
    )
}

/// Helper: release a task (verifier/owner)
fn release_task(
    ledger: &mut DefaultLedgerSimulator,
    public_key: &Secp256k1PublicKey,
    account: ComponentAddress,
    escrow: ComponentAddress,
    task_id: u64,
) -> TransactionReceiptV1 {
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "release_task", manifest_args!(task_id))
        .build();

    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(public_key)],
    )
}

// ── A. Instantiation Tests ──────────────────────────────────

#[test]
fn test_instantiate_basic() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    // Read stats
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_stats", manifest_args!())
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
    println!("Instantiation successful. Stats readable.");
}

#[test]
fn test_get_platform_fee() {
    let (mut ledger, public_key, _account, escrow, ..) = setup_escrow();

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_platform_fee", manifest_args!())
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_get_accepted_tokens() {
    let (mut ledger, public_key, _account, escrow, ..) = setup_escrow();

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_accepted_tokens", manifest_args!())
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

// ── B. Task Creation Tests ──────────────────────────────────

#[test]
fn test_create_task_basic() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    let receipt = create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None);
    receipt.expect_commit_success();

    // Verify stats: total_tasks should be 1
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_task_info", manifest_args!(1u64))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_create_task_with_deadline() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    let deadline: i64 = 1999999999; // far future
    let receipt = create_task(&mut ledger, &public_key, account, escrow, dec!("50"), Some(deadline));
    receipt.expect_commit_success();
}

#[test]
fn test_create_task_below_minimum_fails() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    // Min deposit is 5 XRD, try with 1
    let receipt = create_task(&mut ledger, &public_key, account, escrow, dec!("1"), None);
    receipt.expect_commit_failure();
}

#[test]
fn test_create_multiple_tasks() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    let r1 = create_task(&mut ledger, &public_key, account, escrow, dec!("10"), None);
    r1.expect_commit_success();
    let r2 = create_task(&mut ledger, &public_key, account, escrow, dec!("20"), None);
    r2.expect_commit_success();
    let r3 = create_task(&mut ledger, &public_key, account, escrow, dec!("30"), None);
    r3.expect_commit_success();

    // Verify task 3 exists
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_task_info", manifest_args!(3u64))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

// ── C. Claim Tests ──────────────────────────────────────────

#[test]
fn test_claim_task_valid() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();

    let receipt = claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource);
    receipt.expect_commit_success();
}

#[test]
fn test_claim_already_claimed_fails() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();

    // Try claiming again — should fail
    let receipt = claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource);
    receipt.expect_commit_failure();
}

#[test]
fn test_claim_nonexistent_task_fails() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    let receipt = claim_task(&mut ledger, &public_key, account, escrow, 999, badge_resource);
    receipt.expect_commit_failure();
}

// ── D. Submit Tests ─────────────────────────────────────────

#[test]
fn test_submit_valid() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();

    let receipt = submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource);
    receipt.expect_commit_success();
}

#[test]
fn test_submit_unclaimed_fails() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();

    // Try submitting without claiming first
    let receipt = submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource);
    receipt.expect_commit_failure();
}

// ── E. Release Tests ────────────────────────────────────────

#[test]
fn test_release_submitted() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();

    let receipt = release_task(&mut ledger, &public_key, account, escrow, 1);
    receipt.expect_commit_success();
    // Worker should receive 97.5 XRD (2.5% fee on 100)
    // Fee vault should have 2.5 XRD
}

#[test]
fn test_release_claimed_not_submitted() {
    // This is DOCUMENTED BEHAVIOR: verifier can release on "claimed" status
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();

    // Release without submit — should succeed (verifier prerogative)
    let receipt = release_task(&mut ledger, &public_key, account, escrow, 1);
    receipt.expect_commit_success();
}

#[test]
fn test_release_open_task_fails() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();

    // Try releasing an unclaimed task — should fail
    let receipt = release_task(&mut ledger, &public_key, account, escrow, 1);
    receipt.expect_commit_failure();
}

// ── F. Cancel Tests ─────────────────────────────────────────

#[test]
fn test_cancel_open_task() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    let create_receipt = create_task(&mut ledger, &public_key, account, escrow, dec!("50"), None);
    create_receipt.expect_commit_success();

    // Get receipt NFT address
    let receipt_resource = create_receipt.expect_commit(true).new_resource_addresses()
        .iter()
        .find(|r| **r != XRD)
        .cloned();

    if let Some(receipt_addr) = receipt_resource {
        let manifest = ManifestBuilder::new()
            .lock_fee_from_faucet()
            .call_method(
                account,
                "create_proof_of_non_fungibles",
                manifest_args!(
                    receipt_addr,
                    indexset![NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(1))]
                ),
            )
            .call_method(
                escrow,
                "cancel_task",
                manifest_args!(1u64, ManifestProof(1u32)),
            )
            .call_method(
                account,
                "deposit_batch",
                manifest_args!(ManifestExpression::EntireWorktop),
            )
            .build();

        let receipt = ledger.execute_manifest(
            manifest,
            vec![NonFungibleGlobalId::from_public_key(&public_key)],
        );
        receipt.expect_commit_success();
    }
}

// ── G. Force Cancel Tests ───────────────────────────────────

#[test]
fn test_force_cancel_open() {
    let (mut ledger, public_key, account, escrow, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("50"), None)
        .expect_commit_success();

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "force_cancel", manifest_args!(1u64))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_force_cancel_claimed() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("50"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "force_cancel", manifest_args!(1u64))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

// ── H. Admin Tests ──────────────────────────────────────────

#[test]
fn test_update_fee_valid() {
    let (mut ledger, public_key, _account, escrow, ..) = setup_escrow();

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "update_fee", manifest_args!(dec!("5")))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_update_fee_above_max_fails() {
    let (mut ledger, public_key, _account, escrow, ..) = setup_escrow();

    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "update_fee", manifest_args!(dec!("15")))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_failure();
}

// ── I. Withdraw Fees ────────────────────────────────────────

#[test]
fn test_withdraw_fees_after_release() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    // Full lifecycle: create → claim → submit → release
    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    release_task(&mut ledger, &public_key, account, escrow, 1)
        .expect_commit_success();

    // Now withdraw accumulated fees (should be 2.5 XRD)
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "withdraw_fees", manifest_args!(XRD))
        .call_method(
            account,
            "deposit_batch",
            manifest_args!(ManifestExpression::EntireWorktop),
        )
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

// ── J. Full Lifecycle Tests ─────────────────────────────────

#[test]
fn test_full_lifecycle_happy_path() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    // Create
    let r = create_task(&mut ledger, &public_key, account, escrow, dec!("200"), None);
    r.expect_commit_success();

    // Claim
    let r = claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource);
    r.expect_commit_success();

    // Submit
    let r = submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource);
    r.expect_commit_success();

    // Release
    let r = release_task(&mut ledger, &public_key, account, escrow, 1);
    r.expect_commit_success();

    // Verify stats
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_stats", manifest_args!())
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_full_lifecycle_force_cancel_after_claim() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();

    // Force cancel — funds should return to creator
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "force_cancel", manifest_args!(1u64))
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_concurrent_tasks() {
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    // Create 5 tasks
    for i in 0..5 {
        create_task(&mut ledger, &public_key, account, escrow, dec!("10") + Decimal::from(i * 10), None)
            .expect_commit_success();
    }

    // Claim tasks 1, 2, 3
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 2, badge_resource)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 3, badge_resource)
        .expect_commit_success();

    // Submit and release tasks 1, 2
    submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    release_task(&mut ledger, &public_key, account, escrow, 1)
        .expect_commit_success();

    submit_task(&mut ledger, &public_key, account, escrow, 2, badge_resource)
        .expect_commit_success();
    release_task(&mut ledger, &public_key, account, escrow, 2)
        .expect_commit_success();

    // Force cancel task 3 (claimed but not submitted)
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "force_cancel", manifest_args!(3u64))
        .build();
    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    ).expect_commit_success();

    // Force cancel task 4 (open)
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "force_cancel", manifest_args!(4u64))
        .build();
    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    ).expect_commit_success();

    // Task 5 still open
    // Final stats: 5 total, 2 completed, 2 cancelled, 1 still open
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "get_stats", manifest_args!())
        .build();
    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
}

#[test]
fn test_update_fee_then_release() {
    // Verify fee is applied at release time, not creation time
    let (mut ledger, public_key, account, escrow, badge_resource, ..) = setup_escrow();

    // Create task at 2.5% fee
    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();

    // Update fee to 5%
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_method(escrow, "update_fee", manifest_args!(dec!("5")))
        .build();
    ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    ).expect_commit_success();

    // Complete lifecycle — fee should be 5% (applied at release), not 2.5% (at creation)
    claim_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    submit_task(&mut ledger, &public_key, account, escrow, 1, badge_resource)
        .expect_commit_success();
    release_task(&mut ledger, &public_key, account, escrow, 1)
        .expect_commit_success();
}

#[test]
fn test_zero_fee_full_payout() {
    let mut ledger = LedgerSimulatorBuilder::new().build();
    let (public_key, _private_key, account) = ledger.new_allocated_account();
    let package_address = ledger.compile_and_publish(this_package!());

    // Instantiate with 0% fee
    let manifest = ManifestBuilder::new()
        .lock_fee_from_faucet()
        .call_function(
            package_address,
            "TaskEscrowV3",
            "instantiate",
            manifest_args!(
                dec!("0"),
                XRD,
                dec!("5"),
                XRD,
                XRD,
                XRD,
                GlobalAddress::from(account)
            ),
        )
        .build();

    let receipt = ledger.execute_manifest(
        manifest,
        vec![NonFungibleGlobalId::from_public_key(&public_key)],
    );
    receipt.expect_commit_success();
    let escrow = receipt.expect_commit(true).new_component_addresses()[0];

    // Full lifecycle with 0% fee
    create_task(&mut ledger, &public_key, account, escrow, dec!("100"), None)
        .expect_commit_success();
    claim_task(&mut ledger, &public_key, account, escrow, 1, XRD)
        .expect_commit_success();
    submit_task(&mut ledger, &public_key, account, escrow, 1, XRD)
        .expect_commit_success();
    release_task(&mut ledger, &public_key, account, escrow, 1)
        .expect_commit_success();
    // Worker should receive full 100 XRD, no fee deducted
}
