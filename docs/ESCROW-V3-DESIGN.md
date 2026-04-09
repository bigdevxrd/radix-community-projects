# TaskEscrow V3 Design — Multi-Token + Stablecoin Support

## Why V3

V2 (deployed) only accepts XRD. The $5 minimum fluctuates with XRD price.
V3 accepts any fungible token — XRD, fUSD, hUSDC, wUSDC — so task creators can fund in stablecoins.

## Changes from V2

### TaskInfo — add resource tracking
```rust
pub struct TaskInfo {
    pub creator: ComponentAddress,
    pub worker: Option<ComponentAddress>,
    pub amount: Decimal,
    pub resource: ResourceAddress,  // NEW: which token is escrowed
    pub status: String,
    pub created_at: i64,
    pub deadline: Option<i64>,
}
```

### create_task — accept any fungible
```rust
pub fn create_task(
    &mut self,
    token_bucket: Bucket,  // any fungible token
    creator: ComponentAddress,
    deadline: Option<i64>,
) -> Bucket {
    // Validate: must be fungible, must meet minimum for this token
    let resource = token_bucket.resource_address();
    let amount = token_bucket.amount();
    let min = self.min_deposits.get(&resource).unwrap_or(&self.default_min_deposit);
    assert!(amount >= *min, "Below minimum deposit for this token");
    // ... rest is same as V2
}
```

### Accepted tokens — whitelist
```rust
struct TaskEscrow {
    // ...
    accepted_tokens: KeyValueStore<ResourceAddress, bool>,
    min_deposits: KeyValueStore<ResourceAddress, Decimal>,  // per-token minimums
    default_min_deposit: Decimal,
}
```

Admin methods:
- `add_accepted_token(resource: ResourceAddress, min_deposit: Decimal)`
- `remove_accepted_token(resource: ResourceAddress)`
- `update_token_min_deposit(resource: ResourceAddress, new_min: Decimal)`

### Fee collection — in the deposited token
The 2.5% fee is taken in whatever token was deposited. The fee vault becomes a KeyValueStore of vaults:
```rust
fee_vaults: KeyValueStore<ResourceAddress, Vault>,
```

### Known Radix stablecoin addresses (mainnet)
- fUSD: TBD (Radix Foundation stablecoin — check if deployed)
- hUSDC: TBD (Hydra bridged USDC)
- wUSDC: TBD (wrapped USDC via Radix bridge)

## Deployment
- Deploy as NEW package + component (don't modify V2)
- V2 remains active for existing XRD tasks
- V3 becomes the default for new tasks
- Bot + dashboard point to V3 after deploy

## Migration path
1. Deploy V3 with XRD + stablecoins whitelisted
2. Update bot `/bounty fund` to use V3 component address
3. Update dashboard constants
4. V2 stays live for any in-progress tasks (drain over time)

## Minimum deposits (initial)
| Token | Min Deposit | ~USD |
|-------|------------|------|
| XRD | 200 | ~$5 |
| fUSD | 5 | $5 |
| hUSDC | 5 | $5 |
| wUSDC | 5 | $5 |
