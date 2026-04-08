use scrypto::prelude::*;

// ============================================================
// TASK ESCROW v2 — On-chain vault for task marketplace
//
// Patterns sourced from:
// - OpenZeppelin RefundEscrow (state machine, pull pattern)
// - StandardBounties/ERC-1081 (multi-state, contribution tracking)
// - Kleros Escrow (timeout auto-release)
// - Radix Escrow Boilerplate (vault isolation, badge auth)
// - Superteam Earn (receipt NFT as proof of work)
//
// Key decisions:
// - Fee on RELEASE, not deposit (full refund on cancel)
// - Vault-per-task isolation (no balance tracking bugs)
// - Badge-gated claiming (prevent sybil)
// - Receipt NFT for creator auth (cancel/refund)
// - One-way state transitions (no going backwards)
// ============================================================

// ── Receipt NFT Data ──────────────────────────────────────

/// Receipt NFT given to task creator. Required to cancel/refund.
#[derive(ScryptoSbor, NonFungibleData)]
pub struct TaskReceipt {
    pub task_id: u64,
    pub amount: Decimal,
    pub created_at: i64,
    #[mutable]
    pub status: String,
}

// ── Task Metadata ─────────────────────────────────────────

#[derive(ScryptoSbor, Clone)]
pub struct TaskInfo {
    pub creator: ComponentAddress,
    pub worker: Option<ComponentAddress>,
    pub amount: Decimal,
    pub status: String,
    pub created_at: i64,
    pub deadline: Option<i64>,
}

// Status transitions (one-way):
// open → claimed → submitted → completed
// open → cancelled (creator cancel)
// open → expired (deadline passed)
// claimed → cancelled (verifier can cancel if worker abandons)

// ── Events ────────────────────────────────────────────────

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCreatedEvent {
    pub task_id: u64,
    pub amount: Decimal,
    pub creator: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskClaimedEvent {
    pub task_id: u64,
    pub worker: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskSubmittedEvent {
    pub task_id: u64,
    pub worker: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskReleasedEvent {
    pub task_id: u64,
    pub worker: ComponentAddress,
    pub payout: Decimal,
    pub fee: Decimal,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCancelledEvent {
    pub task_id: u64,
    pub refunded: Decimal,
}

// ============================================================
// TASK ESCROW BLUEPRINT
// ============================================================

#[blueprint]
#[events(
    TaskCreatedEvent, TaskClaimedEvent, TaskSubmittedEvent,
    TaskReleasedEvent, TaskCancelledEvent
)]
mod task_escrow {
    enable_method_auth! {
        roles {
            verifier => updatable_by: [OWNER];
        },
        methods {
            // Anyone with XRD can create a task
            create_task => PUBLIC;
            // Cancel requires receipt NFT proof
            cancel_task => PUBLIC;
            // Claim requires guild badge proof (checked in method)
            claim_task => PUBLIC;
            // Worker marks work as submitted
            submit_task => PUBLIC;
            // Verifier releases funds OR cancels abandoned tasks
            release_task => restrict_to: [verifier, OWNER];
            force_cancel => restrict_to: [verifier, OWNER];
            expire_task => restrict_to: [verifier, OWNER];
            // Reads
            get_task_info => PUBLIC;
            get_stats => PUBLIC;
            get_platform_fee => PUBLIC;
            get_receipt_resource => PUBLIC;
            // Admin
            update_fee => restrict_to: [OWNER];
            update_min_deposit => restrict_to: [OWNER];
            withdraw_fees => restrict_to: [OWNER];
        }
    }

    struct TaskEscrow {
        /// Isolated XRD vault per task — funds physically separated
        task_vaults: KeyValueStore<u64, Vault>,
        /// Task metadata
        tasks: KeyValueStore<u64, TaskInfo>,
        /// Accumulated platform fees (taken on release, not deposit)
        fee_vault: Vault,
        /// Internal badge for receipt NFT mint/burn/update
        minter_vault: Vault,
        /// Receipt NFT resource
        receipt_manager: ResourceManager,
        /// Guild badge resource — required for claiming tasks
        badge_resource: ResourceAddress,
        /// Next task ID
        next_id: u64,
        /// Platform fee % (taken on RELEASE, not deposit — full refund on cancel)
        fee_pct: Decimal,
        /// Minimum deposit to prevent spam
        min_deposit: Decimal,
        /// Counters
        total_tasks: u64,
        total_completed: u64,
        total_cancelled: u64,
        total_escrowed: Decimal,
        total_released: Decimal,
    }

    impl TaskEscrow {
        /// Instantiate the escrow.
        ///
        /// - fee_pct: platform fee taken on release (0-10%)
        /// - min_deposit: minimum XRD per task (spam prevention)
        /// - verifier_badge: resource that can release/cancel tasks
        /// - guild_badge: resource required to claim tasks (guild membership)
        /// - owner_badge: admin resource
        /// - dapp_def: dApp definition address for metadata
        pub fn instantiate(
            fee_pct: Decimal,
            min_deposit: Decimal,
            verifier_badge: ResourceAddress,
            guild_badge: ResourceAddress,
            owner_badge: ResourceAddress,
            dapp_def: GlobalAddress,
        ) -> Global<TaskEscrow> {
            assert!(fee_pct >= Decimal::ZERO && fee_pct <= dec!("10"), "Fee must be 0-10%");
            assert!(min_deposit >= Decimal::ZERO, "Min deposit must be >= 0");

            // Internal minter badge
            let minter = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(init { "name" => "Task Escrow Minter", locked; }))
                .mint_initial_supply(1);

            let minter_addr = minter.resource_address();

            // Receipt NFT resource
            let receipt_mgr = ResourceBuilder::new_integer_non_fungible::<TaskReceipt>(
                OwnerRole::Updatable(rule!(require(owner_badge))),
            )
            .metadata(metadata!(
                init {
                    "name" => "Task Escrow Receipt", locked;
                    "description" => "Proof of task creation. Present to cancel and get a full refund.", locked;
                    "dapp_definitions" => vec![dapp_def], locked;
                }
            ))
            .mint_roles(mint_roles!(
                minter => rule!(require(minter_addr));
                minter_updater => rule!(deny_all);
            ))
            .burn_roles(burn_roles!(
                burner => rule!(require(minter_addr));
                burner_updater => rule!(deny_all);
            ))
            .non_fungible_data_update_roles(non_fungible_data_update_roles!(
                non_fungible_data_updater => rule!(require(minter_addr));
                non_fungible_data_updater_updater => rule!(deny_all);
            ))
            .create_with_no_initial_supply();

            Self {
                task_vaults: KeyValueStore::new(),
                tasks: KeyValueStore::new(),
                fee_vault: Vault::new(XRD),
                minter_vault: Vault::with_bucket(minter.into()),
                receipt_manager: receipt_mgr.into(),
                badge_resource: guild_badge,
                next_id: 1u64,
                fee_pct,
                min_deposit,
                total_tasks: 0u64,
                total_completed: 0u64,
                total_cancelled: 0u64,
                total_escrowed: Decimal::ZERO,
                total_released: Decimal::ZERO,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge))))
            .roles(roles!(
                verifier => rule!(require(verifier_badge));
            ))
            .metadata(metadata!(
                init {
                    "name" => "Radix Guild Task Escrow", locked;
                    "description" => "On-chain escrow for the Radix Guild task marketplace. XRD locked in isolated vaults, released on verification. No admin wallet custody.", locked;
                    "dapp_definitions" => vec![dapp_def], locked;
                }
            ))
            .enable_component_royalties(component_royalties! {
                init {
                    create_task => Xrd(dec!("0.5")), updatable;
                    release_task => Xrd(dec!("0.25")), updatable;
                    cancel_task => Free, locked;
                    claim_task => Free, locked;
                    submit_task => Free, locked;
                    force_cancel => Free, locked;
                    expire_task => Free, locked;
                    get_task_info => Free, locked;
                    get_stats => Free, locked;
                    get_platform_fee => Free, locked;
                    get_receipt_resource => Free, locked;
                    update_fee => Free, locked;
                    update_min_deposit => Free, locked;
                    withdraw_fees => Free, locked;
                }
            })
            .globalize()
        }

        // ── Core Methods ───────────────────────────────────

        /// Create a funded task. Full XRD amount goes into vault.
        /// Fee is NOT taken here — taken on release. Cancel = full refund.
        /// Returns a receipt NFT (keep it to cancel later).
        pub fn create_task(
            &mut self,
            xrd_bucket: Bucket,
            creator: ComponentAddress,
            deadline: Option<i64>,
        ) -> Bucket {
            assert!(xrd_bucket.resource_address() == XRD, "Only XRD accepted");
            let amount = xrd_bucket.amount();
            assert!(amount >= self.min_deposit, "Below minimum deposit");

            let task_id = self.next_id;
            self.next_id += 1;
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;

            // Full amount into isolated vault — NO fee deducted yet
            self.task_vaults.insert(task_id, Vault::with_bucket(xrd_bucket));

            self.tasks.insert(task_id, TaskInfo {
                creator,
                worker: None,
                amount,
                status: "open".to_string(),
                created_at: now,
                deadline,
            });

            // Mint receipt NFT
            let receipt = self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.receipt_manager.mint_non_fungible(
                    &NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id)),
                    TaskReceipt {
                        task_id,
                        amount,
                        created_at: now,
                        status: "open".to_string(),
                    },
                )
            });

            self.total_tasks += 1;
            self.total_escrowed += amount;

            Runtime::emit_event(TaskCreatedEvent { task_id, amount, creator });

            receipt
        }

        /// Claim a task. Worker must hold a guild badge (proof checked).
        pub fn claim_task(&mut self, task_id: u64, worker: ComponentAddress, badge_proof: Proof) {
            // Verify caller holds a guild badge
            let checked = badge_proof
                .check_with_message(self.badge_resource, "Must hold a guild badge to claim tasks");
            checked.drop();

            let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
            assert!(task.status == "open", "Task is not open");
            task.worker = Some(worker);
            task.status = "claimed".to_string();

            self.update_receipt_status(task_id, "claimed");
            Runtime::emit_event(TaskClaimedEvent { task_id, worker });
        }

        /// Worker marks task as submitted (work delivered, awaiting verification).
        pub fn submit_task(&mut self, task_id: u64, badge_proof: Proof) {
            // Verify caller holds a guild badge
            let checked = badge_proof
                .check_with_message(self.badge_resource, "Must hold a guild badge");
            checked.drop();

            let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
            assert!(task.status == "claimed", "Task must be claimed before submitting");
            task.status = "submitted".to_string();

            self.update_receipt_status(task_id, "submitted");
            Runtime::emit_event(TaskSubmittedEvent {
                task_id,
                worker: task.worker.expect("No worker"),
            });
        }

        /// Verifier releases funds. Fee deducted HERE (not on deposit).
        /// Worker receives (amount - fee). Fee goes to fee_vault.
        pub fn release_task(&mut self, task_id: u64) {
            let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
            assert!(
                task.status == "submitted" || task.status == "claimed",
                "Task must be submitted or claimed"
            );
            let worker = task.worker.expect("No worker assigned");
            let amount = task.amount;
            task.status = "completed".to_string();

            // Calculate fee on release
            let fee = amount * self.fee_pct / dec!("100");
            let payout = amount - fee;

            // Take from task vault
            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let mut funds = vault.take_all();

            // Split: fee to fee_vault, payout to worker
            if fee > Decimal::ZERO {
                let fee_bucket = funds.take(fee);
                self.fee_vault.put(fee_bucket);
            }

            // Send payout to worker account
            let worker_account: Global<Account> = Global::from(worker);
            worker_account.try_deposit_or_abort(funds, None);

            self.update_receipt_status(task_id, "completed");
            self.total_completed += 1;
            self.total_released += payout;

            Runtime::emit_event(TaskReleasedEvent { task_id, worker, payout, fee });
        }

        /// Cancel an open task. Creator must present receipt NFT.
        /// FULL refund — no fee deducted (fee only on release).
        pub fn cancel_task(&mut self, task_id: u64, receipt_proof: Proof) -> Bucket {
            // Verify receipt matches this task
            let checked = receipt_proof
                .check_with_message(self.receipt_manager.address(), "Invalid receipt");
            let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
            assert!(
                checked.as_non_fungible().non_fungible_local_ids().contains(&nft_id),
                "Receipt does not match task"
            );
            checked.drop();

            let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
            assert!(task.status == "open", "Can only cancel open (unclaimed) tasks");
            task.status = "cancelled".to_string();

            // Full refund from task vault
            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();
            let refunded = refund.amount();

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            self.total_escrowed -= refunded;

            Runtime::emit_event(TaskCancelledEvent { task_id, refunded });

            refund
        }

        /// Verifier force-cancels a claimed task (worker abandoned).
        /// Refunds directly to creator account.
        pub fn force_cancel(&mut self, task_id: u64) {
            let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
            assert!(
                task.status == "claimed" || task.status == "open",
                "Can only force-cancel open or claimed tasks"
            );
            let creator = task.creator;
            let amount = task.amount;
            task.status = "cancelled".to_string();

            // Full refund to creator
            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();

            let creator_account: Global<Account> = Global::from(creator);
            creator_account.try_deposit_or_abort(refund, None);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            self.total_escrowed -= amount;

            Runtime::emit_event(TaskCancelledEvent { task_id, refunded: amount });
        }

        /// Expire a task past its deadline. Refunds to creator.
        pub fn expire_task(&mut self, task_id: u64) {
            let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
            assert!(task.status == "open", "Can only expire open tasks");
            let deadline = task.deadline.expect("Task has no deadline");
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;
            assert!(now > deadline, "Task has not expired yet");

            let creator = task.creator;
            let amount = task.amount;
            task.status = "cancelled".to_string();

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();

            let creator_account: Global<Account> = Global::from(creator);
            creator_account.try_deposit_or_abort(refund, None);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            self.total_escrowed -= amount;

            Runtime::emit_event(TaskCancelledEvent { task_id, refunded: amount });
        }

        // ── Read Methods ───────────────────────────────────

        pub fn get_task_info(&self, task_id: u64) -> TaskInfo {
            self.tasks.get(&task_id).expect("Task not found").clone()
        }

        pub fn get_stats(&self) -> (u64, u64, u64, Decimal, Decimal, Decimal) {
            (
                self.total_tasks,
                self.total_completed,
                self.total_cancelled,
                self.total_escrowed,
                self.total_released,
                self.fee_vault.amount(),
            )
        }

        pub fn get_platform_fee(&self) -> Decimal {
            self.fee_pct
        }

        pub fn get_receipt_resource(&self) -> ResourceAddress {
            self.receipt_manager.address()
        }

        // ── Admin Methods ──────────────────────────────────

        pub fn update_fee(&mut self, new_fee_pct: Decimal) {
            assert!(new_fee_pct >= Decimal::ZERO && new_fee_pct <= dec!("10"), "Fee must be 0-10%");
            self.fee_pct = new_fee_pct;
        }

        pub fn update_min_deposit(&mut self, new_min: Decimal) {
            assert!(new_min >= Decimal::ZERO, "Min deposit must be >= 0");
            self.min_deposit = new_min;
        }

        pub fn withdraw_fees(&mut self) -> Bucket {
            self.fee_vault.take_all()
        }

        // ── Internal ───────────────────────────────────────

        fn update_receipt_status(&self, task_id: u64, status: &str) {
            let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.receipt_manager.update_non_fungible_data(
                    &nft_id, "status", status.to_string(),
                );
            });
        }
    }
}
