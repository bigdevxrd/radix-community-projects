use scrypto::prelude::*;

#[derive(ScryptoSbor, NonFungibleData, Clone, Debug)]
pub struct UniversalBadgeData {
    pub issued_by: ComponentAddress,
    pub issued_to: String,
    pub schema_name: String,
    pub issued_at: i64,
    #[mutable]
    pub tier: String,
    #[mutable]
    pub status: String,
    #[mutable]
    pub expires_at: Option<i64>,
    #[mutable]
    pub last_updated: i64,
    #[mutable]
    pub trades_executed: u64,
    #[mutable]
    pub volume_xrd: Decimal,
    #[mutable]
    pub extra_data: String,
}

#[derive(ScryptoSbor, Clone, Debug)]
pub struct BadgeSchema {
    pub name: String,
    pub display_name: String,
    pub description: String,
    pub valid_tiers: Vec<String>,
    pub default_tier: String,
    pub default_expiry_seconds: Option<i64>,
    pub recall_enabled: bool,
    pub stats_enabled: bool,
}

#[derive(ScryptoSbor, Clone, Debug)]
pub struct ManagerConfig {
    pub badge_name: String,
    pub badge_description: String,
    pub icon_url: Option<String>,
    pub dapp_definition: GlobalAddress,
}
