use scrypto_test::prelude::*;
use task_escrow::task_escrow::*;
use task_escrow::TaskReceipt;

// ── Test Helpers ────────────────────────────────────────

fn setup() -> (
    TestEnvironment,
    Global<TaskEscrow>,
    Bucket, // owner badge
    ResourceAddress, // verifier badge address
) {
    let mut env = TestEnvironment::new();

    // Create owner badge
    let owner_badge = ResourceBuilder::new_fungible(OwnerRole::None)
        .divisibility(DIVISIBILITY_NONE)
        .mint_initial_supply(1, &mut env)
        .unwrap();

    let owner_address = owner_badge.resource_address(&env).unwrap();

    // Create verifier badge (simulates guild badge)
    let verifier_badge = ResourceBuilder::new_fungible(OwnerRole::None)
        .divisibility(DIVISIBILITY_NONE)
        .mint_initial_supply(1, &mut env)
        .unwrap();

    let verifier_address = verifier_badge.resource_address(&env).unwrap();

    // Get dapp definition (use the environment's account)
    let dapp_def = env.account.address().into();

    // Instantiate escrow with 2.5% fee
    let escrow = TaskEscrow::instantiate(
        dec!("2.5"),
        verifier_address,
        owner_address,
        dapp_def,
        &mut env,
    )
    .unwrap();

    (env, escrow, owner_badge, verifier_address)
}

// ── Tests ───────────────────────────────────────────────

#[test]
fn test_create_task() {
    let (mut env, mut escrow, _owner, _) = setup();

    // Fund 100 XRD
    let xrd = BucketFactory::create_fungible_bucket(XRD, 100.into(), Mock, &mut env).unwrap();
    let creator = env.account.address().into();

    let receipt = escrow.create_task(xrd, creator, None, &mut env).unwrap();

    // Receipt should be 1 NFT
    assert_eq!(receipt.amount(&env).unwrap(), dec!("1"));

    // Check stats: 1 task, 97.5 XRD escrowed (2.5% fee)
    let (total, completed, cancelled, escrowed, released, fees) = escrow.get_stats(&mut env).unwrap();
    assert_eq!(total, 1);
    assert_eq!(completed, 0);
    assert_eq!(cancelled, 0);
    assert_eq!(escrowed, dec!("97.5"));
    assert_eq!(released, Decimal::ZERO);
    assert_eq!(fees, dec!("2.5"));
}

#[test]
fn test_create_and_cancel() {
    let (mut env, mut escrow, _owner, _) = setup();

    let xrd = BucketFactory::create_fungible_bucket(XRD, 50.into(), Mock, &mut env).unwrap();
    let creator = env.account.address().into();

    let receipt = escrow.create_task(xrd, creator, None, &mut env).unwrap();

    // Cancel — should get refund (minus fee already taken)
    let proof = receipt.create_proof_of_all(&mut env).unwrap();
    let refund = escrow.cancel_task(1, proof, &mut env).unwrap();

    // Refund = 48.75 XRD (50 - 2.5% fee)
    assert_eq!(refund.amount(&env).unwrap(), dec!("48.75"));

    let (_, _, cancelled, escrowed, _, _) = escrow.get_stats(&mut env).unwrap();
    assert_eq!(cancelled, 1);
    assert_eq!(escrowed, Decimal::ZERO);
}

#[test]
#[should_panic(expected = "Can only cancel open")]
fn test_cannot_cancel_claimed_task() {
    let (mut env, mut escrow, _owner, _) = setup();

    let xrd = BucketFactory::create_fungible_bucket(XRD, 100.into(), Mock, &mut env).unwrap();
    let creator = env.account.address().into();
    let worker = env.account.address().into();

    let receipt = escrow.create_task(xrd, creator, None, &mut env).unwrap();

    // Claim the task
    escrow.claim_task(1, worker, &mut env).unwrap();

    // Try to cancel — should panic
    let proof = receipt.create_proof_of_all(&mut env).unwrap();
    escrow.cancel_task(1, proof, &mut env).unwrap();
}

#[test]
fn test_full_lifecycle() {
    let (mut env, mut escrow, _owner, _) = setup();

    let xrd = BucketFactory::create_fungible_bucket(XRD, 200.into(), Mock, &mut env).unwrap();
    let creator = env.account.address().into();
    let worker = env.account.address().into();

    // Create
    let _receipt = escrow.create_task(xrd, creator, None, &mut env).unwrap();

    // Claim
    escrow.claim_task(1, worker, &mut env).unwrap();

    // Verify task is claimed
    let (amount, status, assigned_worker, _) = escrow.get_task_info(1, &mut env).unwrap();
    assert_eq!(status, "claimed");
    assert_eq!(amount, dec!("195")); // 200 - 2.5%
    assert!(assigned_worker.is_some());

    // Release (requires verifier role — this test runs as owner which has access)
    escrow.release_task(1, &mut env).unwrap();

    let (_, completed, _, _, released, _) = escrow.get_stats(&mut env).unwrap();
    assert_eq!(completed, 1);
    assert_eq!(released, dec!("195"));
}

#[test]
fn test_fee_collection() {
    let (mut env, mut escrow, _owner, _) = setup();

    // Create 3 tasks
    for _ in 0..3 {
        let xrd = BucketFactory::create_fungible_bucket(XRD, 100.into(), Mock, &mut env).unwrap();
        let creator = env.account.address().into();
        escrow.create_task(xrd, creator, None, &mut env).unwrap();
    }

    // Fees: 3 × 2.5 = 7.5 XRD
    let (_, _, _, _, _, fees) = escrow.get_stats(&mut env).unwrap();
    assert_eq!(fees, dec!("7.5"));

    // Withdraw fees
    let fee_bucket = escrow.withdraw_fees(&mut env).unwrap();
    assert_eq!(fee_bucket.amount(&env).unwrap(), dec!("7.5"));
}

#[test]
fn test_platform_fee_update() {
    let (mut env, mut escrow, _owner, _) = setup();

    assert_eq!(escrow.get_platform_fee(&mut env).unwrap(), dec!("2.5"));

    escrow.update_fee(dec!("5"), &mut env).unwrap();
    assert_eq!(escrow.get_platform_fee(&mut env).unwrap(), dec!("5"));
}

#[test]
#[should_panic(expected = "Fee must be 0-10%")]
fn test_fee_cap() {
    let (mut env, mut escrow, _owner, _) = setup();
    escrow.update_fee(dec!("15"), &mut env).unwrap();
}

#[test]
#[should_panic(expected = "Only XRD accepted")]
fn test_reject_non_xrd() {
    let (mut env, mut escrow, _owner, _) = setup();

    // Create a non-XRD token
    let other = ResourceBuilder::new_fungible(OwnerRole::None)
        .divisibility(DIVISIBILITY_MAXIMUM)
        .mint_initial_supply(100, &mut env)
        .unwrap();

    let creator = env.account.address().into();
    escrow.create_task(other, creator, None, &mut env).unwrap();
}
