use scrypto::prelude::*;
use crate::types::*;
use crate::events::*;
use crate::manager::managed_badge_manager::ManagedBadgeManager;

#[blueprint]
#[events(ManagerCreatedEvent)]
mod badge_factory {
    enable_method_auth! {
        roles {
            factory_admin => updatable_by: [OWNER];
        },
        methods {
            create_manager => PUBLIC;
            get_manager_count => PUBLIC;
            get_factory_info => PUBLIC;
            pause_factory => restrict_to: [factory_admin, OWNER];
            unpause_factory => restrict_to: [factory_admin, OWNER];
        }
    }

    struct BadgeFactory {
        managers: Vec<ComponentAddress>,
        total_managers: u64,
        paused: bool,
    }

    impl BadgeFactory {
        pub fn instantiate() -> (Global<BadgeFactory>, Bucket) {
            let owner_badge = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(
                    init {
                        "name" => "Badge Factory Owner", locked;
                        "description" => "Owner badge for Badge Factory", locked;
                    }
                ))
                .mint_initial_supply(1);

            let component = Self {
                managers: Vec::new(),
                total_managers: 0u64,
                paused: false,
            }
            .instantiate()
            .prepare_to_globalize(OwnerRole::Fixed(
                rule!(require(owner_badge.resource_address())),
            ))
            .metadata(metadata!(
                init {
                    "name" => "Badge Factory", locked;
                    "description" => "Permissionless badge infrastructure for Radix", locked;
                }
            ))
            .globalize();

            (component, owner_badge.into())
        }

        pub fn create_manager(
            &mut self,
            schema: BadgeSchema,
            config: ManagerConfig,
        ) -> (Global<ManagedBadgeManager>, Bucket) {
            assert!(!self.paused, "Factory is paused");
            assert!(!schema.name.is_empty(), "Schema name cannot be empty");
            assert!(!schema.valid_tiers.is_empty(), "Must have at least one tier");
            assert!(
                schema.valid_tiers.contains(&schema.default_tier),
                "Default tier must be in valid_tiers"
            );

            let admin_badge = ResourceBuilder::new_fungible(OwnerRole::None)
                .divisibility(DIVISIBILITY_NONE)
                .metadata(metadata!(
                    init {
                        "name" => format!("{} Admin Badge", schema.display_name), locked;
                        "description" => format!("Admin badge for {} badge manager", schema.display_name), locked;
                    }
                ))
                .mint_initial_supply(1);

            let admin_badge_address = admin_badge.resource_address();

            let manager = ManagedBadgeManager::instantiate_with_schema(
                schema.clone(),
                config,
                admin_badge_address,
            );

            let manager_address = manager.address().into();
            self.managers.push(manager_address);
            self.total_managers += 1;

            let now = Clock::current_time_rounded_to_seconds()
                .seconds_since_unix_epoch;

            Runtime::emit_event(ManagerCreatedEvent {
                manager_address,
                schema_name: schema.name,
                creator: manager_address,
                created_at: now,
            });

            (manager, admin_badge.into())
        }

        pub fn get_manager_count(&self) -> u64 {
            self.total_managers
        }

        pub fn get_factory_info(&self) -> (u64, bool) {
            (self.total_managers, self.paused)
        }

        pub fn pause_factory(&mut self) {
            self.paused = true;
        }

        pub fn unpause_factory(&mut self) {
            self.paused = false;
        }
    }
}
