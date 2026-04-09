use scrypto::prelude::*;

// ============================================================
// TASK ESCROW v2 — On-chain vault for task marketplace
//
// Patterns from: OpenZeppelin, StandardBounties, Kleros, Radix Escrow Boilerplate
// Fee on RELEASE not deposit. Vault-per-task isolation. Badge-gated claiming.
// ============================================================

#[derive(ScryptoSbor, NonFungibleData)]
pub struct TaskReceipt {
    pub task_id: u64,
    pub amount: Decimal,
    pub created_at: i64,
    #[mutable]
    pub status: String,
}

#[derive(ScryptoSbor, Clone)]
pub struct TaskInfo {
    pub creator: ComponentAddress,
    pub worker: Option<ComponentAddress>,
    pub amount: Decimal,
    pub status: String,
    pub created_at: i64,
    pub deadline: Option<i64>,
}

// Events
#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCreatedEvent { pub task_id: u64, pub amount: Decimal, pub creator: ComponentAddress }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskClaimedEvent { pub task_id: u64, pub worker: ComponentAddress }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskSubmittedEvent { pub task_id: u64, pub worker: ComponentAddress }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskReleasedEvent { pub task_id: u64, pub worker: ComponentAddress, pub payout: Decimal, pub fee: Decimal }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCancelledEvent { pub task_id: u64, pub refunded: Decimal }

#[blueprint]
#[events(TaskCreatedEvent, TaskClaimedEvent, TaskSubmittedEvent, TaskReleasedEvent, TaskCancelledEvent)]
mod task_escrow {
    enable_method_auth! {
        roles {
            verifier => updatable_by: [OWNER];
        },
        methods {
            create_task => PUBLIC;
            cancel_task => PUBLIC;
            claim_task => PUBLIC;
            submit_task => PUBLIC;
            release_task => restrict_to: [verifier, OWNER];
            force_cancel => restrict_to: [verifier, OWNER];
            expire_task => restrict_to: [verifier, OWNER];
            get_task_info => PUBLIC;
            get_stats => PUBLIC;
            get_platform_fee => PUBLIC;
            get_receipt_resource => PUBLIC;
            update_fee => restrict_to: [OWNER];
            update_min_deposit => restrict_to: [OWNER];
            withdraw_fees => restrict_to: [OWNER];
        }
    }

    struct TaskEscrow {
        task_vaults: KeyValueStore<u64, Vault>,
        tasks: KeyValueStore<u64, TaskInfo>,
        fee_vault: Vault,
        minter_vault: Vault,
        receipt_manager: ResourceManager,
        badge_resource: ResourceAddress,
        next_id: u64,
        fee_pct: Decimal,
        min_deposit: Decimal,
        total_tasks: u64,
        total_completed: u64,
        total_cancelled: u64,
        total_escrowed: Decimal,
        total_released: Decimal,
    }

    impl TaskEscrow {
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

            let minter = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(init { "name" => "Task Escrow Minter", locked; }))
                .mint_initial_supply(1);

            let minter_addr = minter.resource_address();

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
                    "description" => "On-chain escrow for task marketplace. No admin wallet custody.", locked;
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

        /// Create a funded task. Full XRD into vault. Fee on release, not deposit.
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

            self.task_vaults.insert(task_id, Vault::with_bucket(xrd_bucket));
            self.tasks.insert(task_id, TaskInfo {
                creator, worker: None, amount,
                status: "open".to_string(), created_at: now, deadline,
            });

            let receipt = self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.receipt_manager.mint_non_fungible(
                    &NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id)),
                    TaskReceipt { task_id, amount, created_at: now, status: "open".to_string() },
                )
            });

            self.total_tasks += 1;
            self.total_escrowed += amount;
            Runtime::emit_event(TaskCreatedEvent { task_id, amount, creator });
            receipt
        }

        /// Claim a task. Badge proof required.
        pub fn claim_task(&mut self, task_id: u64, worker: ComponentAddress, badge_proof: Proof) {
            let checked = badge_proof.check_with_message(self.badge_resource, "Must hold a guild badge");
            checked.drop();

            // Scope the mutable borrow so we can call update_receipt_status after
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "open", "Task is not open");
                task.worker = Some(worker);
                task.status = "claimed".to_string();
            } // task dropped here, mutable borrow released

            self.update_receipt_status(task_id, "claimed");
            Runtime::emit_event(TaskClaimedEvent { task_id, worker });
        }

        /// Worker marks task as submitted.
        pub fn submit_task(&mut self, task_id: u64, badge_proof: Proof) {
            let checked = badge_proof.check_with_message(self.badge_resource, "Must hold a guild badge");
            checked.drop();

            let worker;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "claimed", "Task must be claimed before submitting");
                task.status = "submitted".to_string();
                worker = task.worker.expect("No worker");
            }

            self.update_receipt_status(task_id, "submitted");
            Runtime::emit_event(TaskSubmittedEvent { task_id, worker });
        }

        /// Verifier releases funds. Fee deducted on release.
        pub fn release_task(&mut self, task_id: u64) {
            let worker;
            let amount;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(
                    task.status == "submitted" || task.status == "claimed",
                    "Task must be submitted or claimed"
                );
                worker = task.worker.expect("No worker assigned");
                amount = task.amount;
                task.status = "completed".to_string();
            }

            let fee = amount * self.fee_pct / dec!("100");
            let payout = amount - fee;

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let mut funds = vault.take_all();
            drop(vault); // release borrow before using self.fee_vault

            if fee > Decimal::ZERO {
                let fee_bucket = funds.take(fee);
                self.fee_vault.put(fee_bucket);
            }

            let mut worker_account: Global<Account> = Global::from(worker);
            worker_account.try_deposit_or_abort(funds, None);

            self.update_receipt_status(task_id, "completed");
            self.total_completed += 1;
            self.total_released += payout;
            Runtime::emit_event(TaskReleasedEvent { task_id, worker, payout, fee });
        }

        /// Cancel an open task. Receipt NFT proof required. Full refund.
        pub fn cancel_task(&mut self, task_id: u64, receipt_proof: Proof) -> Bucket {
            let checked = receipt_proof.check_with_message(self.receipt_manager.address(), "Invalid receipt");
            let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
            assert!(checked.as_non_fungible().non_fungible_local_ids().contains(&nft_id), "Receipt does not match task");
            checked.drop();

            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "open", "Can only cancel open (unclaimed) tasks");
                task.status = "cancelled".to_string();
            }

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();
            let refunded = refund.amount();
            drop(vault);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            self.total_escrowed -= refunded;
            Runtime::emit_event(TaskCancelledEvent { task_id, refunded });
            refund
        }

        /// Verifier force-cancels an abandoned task. Refund to creator.
        pub fn force_cancel(&mut self, task_id: u64) {
            let creator;
            let amount;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(
                    task.status == "claimed" || task.status == "open",
                    "Can only force-cancel open or claimed tasks"
                );
                creator = task.creator;
                amount = task.amount;
                task.status = "cancelled".to_string();
            }

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();
            drop(vault);

            let mut creator_account: Global<Account> = Global::from(creator);
            creator_account.try_deposit_or_abort(refund, None);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            self.total_escrowed -= amount;
            Runtime::emit_event(TaskCancelledEvent { task_id, refunded: amount });
        }

        /// Expire an unclaimed task past its deadline. Refund to creator.
        pub fn expire_task(&mut self, task_id: u64) {
            let creator;
            let amount;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "open", "Can only expire open tasks");
                let deadline = task.deadline.expect("Task has no deadline");
                let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;
                assert!(now > deadline, "Task has not expired yet");
                creator = task.creator;
                amount = task.amount;
                task.status = "cancelled".to_string();
            }

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();
            drop(vault);

            let mut creator_account: Global<Account> = Global::from(creator);
            creator_account.try_deposit_or_abort(refund, None);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            self.total_escrowed -= amount;
            Runtime::emit_event(TaskCancelledEvent { task_id, refunded: amount });
        }

        // ── Reads ──

        pub fn get_task_info(&self, task_id: u64) -> TaskInfo {
            self.tasks.get(&task_id).expect("Task not found").clone()
        }

        pub fn get_stats(&self) -> (u64, u64, u64, Decimal, Decimal, Decimal) {
            (self.total_tasks, self.total_completed, self.total_cancelled,
             self.total_escrowed, self.total_released, self.fee_vault.amount())
        }

        pub fn get_platform_fee(&self) -> Decimal { self.fee_pct }
        pub fn get_receipt_resource(&self) -> ResourceAddress { self.receipt_manager.address() }

        // ── Admin ──

        pub fn update_fee(&mut self, new_fee_pct: Decimal) {
            assert!(new_fee_pct >= Decimal::ZERO && new_fee_pct <= dec!("10"), "Fee must be 0-10%");
            self.fee_pct = new_fee_pct;
        }

        pub fn update_min_deposit(&mut self, new_min: Decimal) {
            assert!(new_min >= Decimal::ZERO, "Min deposit must be >= 0");
            self.min_deposit = new_min;
        }

        pub fn withdraw_fees(&mut self) -> Bucket { self.fee_vault.take_all() }

        // ── Internal ──

        fn update_receipt_status(&self, task_id: u64, status: &str) {
            let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.receipt_manager.update_non_fungible_data(&nft_id, "status", status.to_string());
            });
        }
    }
}
