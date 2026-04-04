use scrypto_test::prelude::*;
use radix_badge_manager::UniversalBadgeData;

// Helper to set up a factory and create a manager
fn setup_test_env() -> Result<
    (
        TestEnvironment<InMemSubstateDatabase>,
        Global<AnyComponent>, // factory
        Bucket,               // factory owner badge
    ),
    RuntimeError,
> {
    let mut env = TestEnvironment::new();
    let package = PackageFactory::compile_and_publish(
        this_package!(),
        &mut env,
        CompileProfile::Fast,
    )?;

    // Instantiate factory
    let (factory, owner_badge) = env.call_function_typed::<_, (Global<AnyComponent>, Bucket)>(
        package,
        "BadgeFactory",
        "instantiate",
        &(),
    )?;

    Ok((env, factory, owner_badge))
}

fn create_test_manager(
    env: &mut TestEnvironment<InMemSubstateDatabase>,
    factory: &Global<AnyComponent>,
    owner_badge: &Bucket,
) -> Result<(Global<AnyComponent>, Bucket), RuntimeError> {
    let owner_proof = owner_badge.create_proof_of_all(env)?;
    LocalAuthZone::push(owner_proof, env)?;

    let dapp_def = env.account;

    let (manager, admin_badge) = env.call_method_typed::<_, (Global<AnyComponent>, Bucket)>(
        factory.handle(),
        "create_manager",
        &(
            "test_schema".to_string(),
            vec![
                "member".to_string(),
                "contributor".to_string(),
                "builder".to_string(),
                "steward".to_string(),
                "elder".to_string(),
            ],
            "member".to_string(),
            true, // free mint enabled
            "Test Badge".to_string(),
            "A test badge".to_string(),
            dapp_def,
        ),
    )?;

    Ok((manager, admin_badge))
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test 1: Factory instantiation
    #[test]
    fn test_factory_instantiate() -> Result<(), RuntimeError> {
        let (_env, _factory, owner_badge) = setup_test_env()?;
        assert!(owner_badge.amount() > Decimal::ZERO);
        Ok(())
    }

    // Test 2: Create manager
    #[test]
    fn test_create_manager() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (_manager, admin_badge) = create_test_manager(&mut env, &factory, &owner_badge)?;
        assert!(admin_badge.amount() > Decimal::ZERO);
        Ok(())
    }

    // Test 3: Factory info
    #[test]
    fn test_factory_info() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let _manager = create_test_manager(&mut env, &factory, &owner_badge)?;

        let (count, active): (u64, bool) = env.call_method_typed(
            factory.handle(),
            "get_factory_info",
            &(),
        )?;
        assert_eq!(count, 1);
        assert!(active);
        Ok(())
    }

    // Test 4: Public mint
    #[test]
    fn test_public_mint() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, _admin) = create_test_manager(&mut env, &factory, &owner_badge)?;

        let badge: Bucket = env.call_method_typed(
            manager.handle(),
            "public_mint",
            &("testuser".to_string(),),
        )?;

        assert_eq!(badge.amount(), Decimal::ONE);
        Ok(())
    }

    // Test 5: Public mint — empty username rejected
    #[test]
    fn test_public_mint_empty_username() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, _admin) = create_test_manager(&mut env, &factory, &owner_badge)?;

        let result = env.call_method_typed::<_, Bucket>(
            manager.handle(),
            "public_mint",
            &("".to_string(),),
        );

        assert!(result.is_err());
        Ok(())
    }

    // Test 6: Public mint — long username rejected
    #[test]
    fn test_public_mint_long_username() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, _admin) = create_test_manager(&mut env, &factory, &owner_badge)?;

        let long_name = "a".repeat(65);
        let result = env.call_method_typed::<_, Bucket>(
            manager.handle(),
            "public_mint",
            &(long_name,),
        );

        assert!(result.is_err());
        Ok(())
    }

    // Test 7: Admin mint with specific tier
    #[test]
    fn test_admin_mint() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, admin_badge) = create_test_manager(&mut env, &factory, &owner_badge)?;

        let proof = admin_badge.create_proof_of_all(&mut env)?;
        LocalAuthZone::push(proof, &mut env)?;

        let badge: Bucket = env.call_method_typed(
            manager.handle(),
            "mint_badge",
            &("admin_user".to_string(), "contributor".to_string()),
        )?;

        assert_eq!(badge.amount(), Decimal::ONE);
        Ok(())
    }

    // Test 8: Get schema name
    #[test]
    fn test_get_schema_name() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, _admin) = create_test_manager(&mut env, &factory, &owner_badge)?;

        let name: String = env.call_method_typed(
            manager.handle(),
            "get_schema_name",
            &(),
        )?;

        assert_eq!(name, "test_schema");
        Ok(())
    }

    // Test 9: Get valid tiers
    #[test]
    fn test_get_valid_tiers() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, _admin) = create_test_manager(&mut env, &factory, &owner_badge)?;

        let tiers: Vec<String> = env.call_method_typed(
            manager.handle(),
            "get_valid_tiers",
            &(),
        )?;

        assert_eq!(tiers.len(), 5);
        assert_eq!(tiers[0], "member");
        assert_eq!(tiers[4], "elder");
        Ok(())
    }

    // Test 10: Get stats
    #[test]
    fn test_get_stats() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;
        let (manager, _admin) = create_test_manager(&mut env, &factory, &owner_badge)?;

        // Mint a badge
        let _badge: Bucket = env.call_method_typed(
            manager.handle(),
            "public_mint",
            &("user1".to_string(),),
        )?;

        let (total, active): (u64, u64) = env.call_method_typed(
            manager.handle(),
            "get_stats",
            &(),
        )?;

        assert_eq!(total, 1);
        assert_eq!(active, 1);
        Ok(())
    }

    // Test 11: Factory pause/unpause
    #[test]
    fn test_factory_pause() -> Result<(), RuntimeError> {
        let (mut env, factory, owner_badge) = setup_test_env()?;

        let proof = owner_badge.create_proof_of_all(&mut env)?;
        LocalAuthZone::push(proof, &mut env)?;

        env.call_method_typed::<_, ()>(factory.handle(), "pause_factory", &())?;

        let (_count, active): (u64, bool) = env.call_method_typed(
            factory.handle(),
            "get_factory_info",
            &(),
        )?;

        assert!(!active);
        Ok(())
    }
}
