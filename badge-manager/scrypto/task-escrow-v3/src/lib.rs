use scrypto::prelude::*;

// ============================================================
// TASK ESCROW v3 — Multi-Token On-chain Escrow
//
// Forked from V2. Key changes:
// - Accepts any whitelisted fungible token (XRD, xUSDC, xUSDT, etc.)
// - Per-token fee vaults and minimum deposits
// - Removed cross-token aggregate stats (total_escrowed/released)
// ============================================================

#[derive(ScryptoSbor, NonFungibleData)]
pub struct TaskReceipt {
    pub task_id: u64,
    pub amount: Decimal,
    pub resource: ResourceAddress,
    pub created_at: i64,
    #[mutable]
    pub status: String,
}

#[derive(ScryptoSbor, Clone)]
pub struct TaskInfo {
    pub creator: ComponentAddress,
    pub worker: Option<ComponentAddress>,
    pub amount: Decimal,
    pub resource: ResourceAddress,
    pub status: String,
    pub created_at: i64,
    pub deadline: Option<i64>,
}

// Events
#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCreatedEvent {
    pub task_id: u64,
    pub amount: Decimal,
    pub resource: ResourceAddress,
    pub creator: ComponentAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskClaimedEvent { pub task_id: u64, pub worker: ComponentAddress }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskSubmittedEvent { pub task_id: u64, pub worker: ComponentAddress }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskReleasedEvent {
    pub task_id: u64,
    pub worker: ComponentAddress,
    pub payout: Decimal,
    pub fee: Decimal,
    pub resource: ResourceAddress,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TaskCancelledEvent { pub task_id: u64, pub refunded: Decimal, pub resource: ResourceAddress }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TokenAddedEvent { pub resource: ResourceAddress, pub min_deposit: Decimal }

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TokenRemovedEvent { pub resource: ResourceAddress }

#[blueprint]
#[events(TaskCreatedEvent, TaskClaimedEvent, TaskSubmittedEvent, TaskReleasedEvent, TaskCancelledEvent, TokenAddedEvent, TokenRemovedEvent)]
mod task_escrow_v3 {
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
            get_accepted_tokens => PUBLIC;
            update_fee => restrict_to: [OWNER];
            add_accepted_token => restrict_to: [OWNER];
            update_token_min => restrict_to: [OWNER];
            remove_accepted_token => restrict_to: [OWNER];
            withdraw_fees => restrict_to: [OWNER];
        }
    }

    struct TaskEscrowV3 {
        task_vaults: KeyValueStore<u64, Vault>,
        tasks: KeyValueStore<u64, TaskInfo>,
        fee_vaults: KeyValueStore<ResourceAddress, Vault>,
        accepted_tokens: KeyValueStore<ResourceAddress, Decimal>,
        accepted_token_list: Vec<ResourceAddress>,
        minter_vault: Vault,
        receipt_manager: ResourceManager,
        badge_resource: ResourceAddress,
        next_id: u64,
        fee_pct: Decimal,
        total_tasks: u64,
        total_completed: u64,
        total_cancelled: u64,
    }

    impl TaskEscrowV3 {
        pub fn instantiate(
            fee_pct: Decimal,
            initial_token: ResourceAddress,
            initial_min_deposit: Decimal,
            verifier_badge: ResourceAddress,
            guild_badge: ResourceAddress,
            owner_badge: ResourceAddress,
            dapp_def: GlobalAddress,
        ) -> Global<TaskEscrowV3> {
            assert!(fee_pct >= Decimal::ZERO && fee_pct <= dec!("10"), "Fee must be 0-10%");
            assert!(initial_min_deposit >= Decimal::ZERO, "Min deposit must be >= 0");

            let minter = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(init { "name" => "Task Escrow V3 Minter", locked; }))
                .mint_initial_supply(1);

            let minter_addr = minter.resource_address();

            let receipt_mgr = ResourceBuilder::new_integer_non_fungible::<TaskReceipt>(
                OwnerRole::Updatable(rule!(require(owner_badge))),
            )
            .metadata(metadata!(
                init {
                    "name" => "Task Escrow V3 Receipt", locked;
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

            let mut accepted_tokens = KeyValueStore::new();
            accepted_tokens.insert(initial_token, initial_min_deposit);

            Self {
                task_vaults: KeyValueStore::new(),
                tasks: KeyValueStore::new(),
                fee_vaults: KeyValueStore::new(),
                accepted_tokens,
                accepted_token_list: vec![initial_token],
                minter_vault: Vault::with_bucket(minter.into()),
                receipt_manager: receipt_mgr.into(),
                badge_resource: guild_badge,
                next_id: 1u64,
                fee_pct,
                total_tasks: 0u64,
                total_completed: 0u64,
                total_cancelled: 0u64,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge))))
            .roles(roles!(
                verifier => rule!(require(verifier_badge));
            ))
            .metadata(metadata!(
                init {
                    "name" => "Radix Guild Task Escrow V3", locked;
                    "description" => "Multi-token on-chain escrow for task marketplace.", locked;
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
                    get_accepted_tokens => Free, locked;
                    update_fee => Free, locked;
                    add_accepted_token => Free, locked;
                    update_token_min => Free, locked;
                    remove_accepted_token => Free, locked;
                    withdraw_fees => Free, locked;
                }
            })
            .globalize()
        }

        /// Create a funded task with any accepted token.
        pub fn create_task(
            &mut self,
            token_bucket: Bucket,
            creator: ComponentAddress,
            deadline: Option<i64>,
        ) -> Bucket {
            let resource = token_bucket.resource_address();
            let min = self.accepted_tokens.get(&resource)
                .expect("Token not accepted. Use get_accepted_tokens() to see whitelisted tokens.");
            let amount = token_bucket.amount();
            assert!(amount >= *min, "Below minimum deposit for this token");

            let task_id = self.next_id;
            self.next_id += 1;
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;

            self.task_vaults.insert(task_id, Vault::with_bucket(token_bucket));
            self.tasks.insert(task_id, TaskInfo {
                creator, worker: None, amount, resource,
                status: "open".to_string(), created_at: now, deadline,
            });

            let receipt = self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.receipt_manager.mint_non_fungible(
                    &NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id)),
                    TaskReceipt { task_id, amount, resource, created_at: now, status: "open".to_string() },
                )
            });

            self.total_tasks += 1;
            Runtime::emit_event(TaskCreatedEvent { task_id, amount, resource, creator });
            receipt
        }

        pub fn claim_task(&mut self, task_id: u64, worker: ComponentAddress, badge_proof: Proof) {
            let checked = badge_proof.check_with_message(self.badge_resource, "Must hold a guild badge");
            checked.drop();
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "open", "Task is not open");
                task.worker = Some(worker);
                task.status = "claimed".to_string();
            }
            self.update_receipt_status(task_id, "claimed");
            Runtime::emit_event(TaskClaimedEvent { task_id, worker });
        }

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

        /// Verifier releases funds. Fee deducted on release, routed to per-token fee vault.
        pub fn release_task(&mut self, task_id: u64) {
            let worker;
            let amount;
            let resource;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(
                    task.status == "submitted" || task.status == "claimed",
                    "Task must be submitted or claimed"
                );
                worker = task.worker.expect("No worker assigned");
                amount = task.amount;
                resource = task.resource;
                task.status = "completed".to_string();
            }

            let fee = amount * self.fee_pct / dec!("100");
            let payout = amount - fee;

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let mut funds = vault.take_all();
            drop(vault);

            if fee > Decimal::ZERO {
                let fee_bucket = funds.take(fee);
                let has_vault = self.fee_vaults.get(&resource).is_some();
                if has_vault {
                    let mut fv = self.fee_vaults.get_mut(&resource).unwrap();
                    fv.put(fee_bucket);
                } else {
                    self.fee_vaults.insert(resource, Vault::with_bucket(fee_bucket));
                }
            }

            let mut worker_account: Global<Account> = Global::from(worker);
            worker_account.try_deposit_or_abort(funds, None);

            self.update_receipt_status(task_id, "completed");
            self.total_completed += 1;
            Runtime::emit_event(TaskReleasedEvent { task_id, worker, payout, fee, resource });
        }

        pub fn cancel_task(&mut self, task_id: u64, receipt_proof: Proof) -> Bucket {
            let checked = receipt_proof.check_with_message(self.receipt_manager.address(), "Invalid receipt");
            let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
            assert!(checked.as_non_fungible().non_fungible_local_ids().contains(&nft_id), "Receipt does not match task");
            checked.drop();

            let resource;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "open", "Can only cancel open (unclaimed) tasks");
                task.status = "cancelled".to_string();
                resource = task.resource;
            }

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();
            let refunded = refund.amount();
            drop(vault);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            Runtime::emit_event(TaskCancelledEvent { task_id, refunded, resource });
            refund
        }

        pub fn force_cancel(&mut self, task_id: u64) {
            let creator;
            let resource;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(
                    task.status == "claimed" || task.status == "open",
                    "Can only force-cancel open or claimed tasks"
                );
                creator = task.creator;
                resource = task.resource;
                task.status = "cancelled".to_string();
            }

            let mut vault = self.task_vaults.get_mut(&task_id).expect("Vault not found");
            let refund = vault.take_all();
            let refunded = refund.amount();
            drop(vault);

            let mut creator_account: Global<Account> = Global::from(creator);
            creator_account.try_deposit_or_abort(refund, None);

            self.update_receipt_status(task_id, "cancelled");
            self.total_cancelled += 1;
            Runtime::emit_event(TaskCancelledEvent { task_id, refunded, resource });
        }

        pub fn expire_task(&mut self, task_id: u64) {
            let creator;
            let resource;
            let amount;
            {
                let mut task = self.tasks.get_mut(&task_id).expect("Task not found");
                assert!(task.status == "open", "Can only expire open tasks");
                let deadline = task.deadline.expect("Task has no deadline");
                let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;
                assert!(now > deadline, "Task has not expired yet");
                creator = task.creator;
                resource = task.resource;
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
            Runtime::emit_event(TaskCancelledEvent { task_id, refunded: amount, resource });
        }

        // ── Reads ──

        pub fn get_task_info(&self, task_id: u64) -> TaskInfo {
            self.tasks.get(&task_id).expect("Task not found").clone()
        }

        pub fn get_stats(&self) -> (u64, u64, u64, Decimal) {
            (self.total_tasks, self.total_completed, self.total_cancelled, self.fee_pct)
        }

        pub fn get_platform_fee(&self) -> Decimal { self.fee_pct }
        pub fn get_receipt_resource(&self) -> ResourceAddress { self.receipt_manager.address() }

        pub fn get_accepted_tokens(&self) -> Vec<(ResourceAddress, Decimal)> {
            self.accepted_token_list.iter()
                .filter_map(|addr| {
                    self.accepted_tokens.get(addr).map(|min| (*addr, *min))
                })
                .collect()
        }

        // ── Admin ──

        pub fn update_fee(&mut self, new_fee_pct: Decimal) {
            assert!(new_fee_pct >= Decimal::ZERO && new_fee_pct <= dec!("10"), "Fee must be 0-10%");
            self.fee_pct = new_fee_pct;
        }

        pub fn add_accepted_token(&mut self, resource: ResourceAddress, min_deposit: Decimal) {
            assert!(min_deposit >= Decimal::ZERO, "Min deposit must be >= 0");
            assert!(self.accepted_tokens.get(&resource).is_none(), "Token already accepted");
            self.accepted_tokens.insert(resource, min_deposit);
            self.accepted_token_list.push(resource);
            Runtime::emit_event(TokenAddedEvent { resource, min_deposit });
        }

        pub fn update_token_min(&mut self, resource: ResourceAddress, new_min: Decimal) {
            assert!(new_min >= Decimal::ZERO, "Min deposit must be >= 0");
            assert!(self.accepted_tokens.get(&resource).is_some(), "Token not in accepted list");
            self.accepted_tokens.insert(resource, new_min);
        }

        pub fn remove_accepted_token(&mut self, resource: ResourceAddress) {
            assert!(self.accepted_tokens.get(&resource).is_some(), "Token not in accepted list");
            self.accepted_tokens.remove(&resource);
            self.accepted_token_list.retain(|a| *a != resource);
            Runtime::emit_event(TokenRemovedEvent { resource });
        }

        pub fn withdraw_fees(&mut self, resource: ResourceAddress) -> Bucket {
            let mut vault = self.fee_vaults.get_mut(&resource).expect("No fees collected for this token");
            vault.take_all()
        }

        // ── Internal ──

        fn update_receipt_status(&self, task_id: u64, status: &str) {
            let nft_id = NonFungibleLocalId::Integer(IntegerNonFungibleLocalId::new(task_id));
            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.receipt_manager.update_non_fungible_data(&nft_id, "status", status.to_string());
            });
        }
    }
}
