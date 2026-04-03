use scrypto::prelude::*;

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct ManagerCreatedEvent {
    pub manager_address: ComponentAddress,
    pub schema_name: String,
    pub creator: ComponentAddress,
    pub created_at: i64,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BadgeMintedEvent {
    pub badge_id: NonFungibleLocalId,
    pub issued_to: String,
    pub tier: String,
    pub schema_name: String,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct BadgeRevokedEvent {
    pub badge_id: NonFungibleLocalId,
    pub reason: String,
}

#[derive(ScryptoSbor, ScryptoEvent)]
pub struct TierUpgradedEvent {
    pub badge_id: NonFungibleLocalId,
    pub old_tier: String,
    pub new_tier: String,
}
