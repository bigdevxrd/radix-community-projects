use scrypto::prelude::*;
use crate::types::*;
use crate::events::*;

#[blueprint]
#[events(BadgeMintedEvent, BadgeRevokedEvent, TierUpgradedEvent)]
mod managed_badge_manager {
    enable_method_auth! {
        roles {
            admin => updatable_by: [OWNER];
        },
        methods {
            get_badge_info => PUBLIC;
            get_badge_resource => PUBLIC;
            get_schema => PUBLIC;
            mint_badge => restrict_to: [admin, OWNER];
            revoke_badge => restrict_to: [admin, OWNER];
            update_tier => restrict_to: [admin, OWNER];
            update_stats => restrict_to: [admin, OWNER];
            update_extra_data => restrict_to: [admin, OWNER];
        }
    }

    struct ManagedBadgeManager {
        minter_vault: Vault,
        badge_resource: ResourceManager,
        schema: BadgeSchema,
        next_id: u64,
        total_minted: u64,
        total_revoked: u64,
    }

    impl ManagedBadgeManager {
        pub fn instantiate_with_schema(
            schema: BadgeSchema,
            config: ManagerConfig,
            owner_badge_address: ResourceAddress,
        ) -> Global<ManagedBadgeManager> {
            let minter_badge = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(
                    init {
                        "name" => "Badge Manager Internal Minter", locked;
                    }
                ))
                .mint_initial_supply(1);

            let minter_address = minter_badge.resource_address();

            let badge_resource = ResourceBuilder::new_string_non_fungible::<UniversalBadgeData>(
                OwnerRole::Updatable(rule!(require(owner_badge_address))),
            )
            .metadata(metadata!(
                init {
                    "name" => config.badge_name, locked;
                    "description" => config.badge_description, locked;
                    "dapp_definitions" => vec![config.dapp_definition], locked;
                }
            ))
            .mint_roles(mint_roles!(
                minter => rule!(require(minter_address));
                minter_updater => rule!(deny_all);
            ))
            .burn_roles(burn_roles!(
                burner => rule!(require(minter_address));
                burner_updater => rule!(deny_all);
            ))
            .non_fungible_data_update_roles(non_fungible_data_update_roles!(
                non_fungible_data_updater => rule!(require(minter_address));
                non_fungible_data_updater_updater => rule!(deny_all);
            ))
            .create_with_no_initial_supply();

            Self {
                minter_vault: Vault::with_bucket(minter_badge.into()),
                badge_resource: badge_resource.into(),
                schema,
                next_id: 1u64,
                total_minted: 0u64,
                total_revoked: 0u64,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(rule!(require(owner_badge_address))))
            .globalize()
        }

        pub fn mint_badge(&mut self, username: String, tier: String) -> Bucket {
            assert!(
                self.schema.valid_tiers.contains(&tier),
                "Invalid tier"
            );

            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;
            let expires_at = self.schema.default_expiry_seconds.map(|s| now + s);

            let id = StringNonFungibleLocalId::new(
                format!("{}_{}", self.schema.name, self.next_id)
            ).unwrap();
            let local_id = NonFungibleLocalId::String(id);
            let component_address = Runtime::global_address();

            let badge = self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.badge_resource.mint_non_fungible(
                    &local_id,
                    UniversalBadgeData {
                        issued_by: component_address.into(),
                        issued_to: username.clone(),
                        schema_name: self.schema.name.clone(),
                        issued_at: now,
                        tier: tier.clone(),
                        status: "active".to_string(),
                        expires_at,
                        last_updated: now,
                        trades_executed: 0,
                        volume_xrd: Decimal::ZERO,
                        extra_data: "{}".to_string(),
                    },
                )
            });

            self.next_id += 1;
            self.total_minted += 1;

            Runtime::emit_event(BadgeMintedEvent {
                badge_id: local_id,
                issued_to: username,
                tier,
                schema_name: self.schema.name.clone(),
            });

            badge
        }

        pub fn revoke_badge(&mut self, badge_id: NonFungibleLocalId, reason: String) {
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;

            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.badge_resource.update_non_fungible_data(&badge_id, "status", "revoked".to_string());
                self.badge_resource.update_non_fungible_data(&badge_id, "tier", "revoked".to_string());
                self.badge_resource.update_non_fungible_data(&badge_id, "last_updated", now);
            });

            self.total_revoked += 1;
            Runtime::emit_event(BadgeRevokedEvent { badge_id, reason });
        }

        pub fn update_tier(&mut self, badge_id: NonFungibleLocalId, new_tier: String) {
            assert!(self.schema.valid_tiers.contains(&new_tier), "Invalid tier");

            let data: UniversalBadgeData = self.badge_resource.get_non_fungible_data(&badge_id);
            let old_tier = data.tier;
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;

            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.badge_resource.update_non_fungible_data(&badge_id, "tier", new_tier.clone());
                self.badge_resource.update_non_fungible_data(&badge_id, "last_updated", now);
            });

            Runtime::emit_event(TierUpgradedEvent { badge_id, old_tier, new_tier });
        }

        pub fn update_stats(&mut self, badge_id: NonFungibleLocalId, trades: u64, volume: Decimal) {
            assert!(self.schema.stats_enabled, "Stats not enabled");
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;

            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.badge_resource.update_non_fungible_data(&badge_id, "trades_executed", trades);
                self.badge_resource.update_non_fungible_data(&badge_id, "volume_xrd", volume);
                self.badge_resource.update_non_fungible_data(&badge_id, "last_updated", now);
            });
        }

        pub fn update_extra_data(&mut self, badge_id: NonFungibleLocalId, extra_data: String) {
            let now = Clock::current_time_rounded_to_seconds().seconds_since_unix_epoch;

            self.minter_vault.as_fungible().authorize_with_amount(1, || {
                self.badge_resource.update_non_fungible_data(&badge_id, "extra_data", extra_data);
                self.badge_resource.update_non_fungible_data(&badge_id, "last_updated", now);
            });
        }

        pub fn get_badge_info(&self, badge_id: NonFungibleLocalId) -> UniversalBadgeData {
            self.badge_resource.get_non_fungible_data(&badge_id)
        }

        pub fn get_badge_resource(&self) -> ResourceAddress {
            self.badge_resource.address()
        }

        pub fn get_schema(&self) -> BadgeSchema {
            self.schema.clone()
        }
    }
}
