# Manager Spec

Shared interface specification for Rad-DAO managers.

## Status: Phase 1 — Draft

## The Trait

```rust
trait RadManager {
    fn manager_type() -> String;
    fn manager_version() -> String;
    fn manager_info() -> ManagerInfo;
    fn health_check() -> HealthStatus;
    fn required_badge() -> Option<ResourceAddress>;
}
```

## Manager Registry

Central component where managers register. DAOs discover managers and bolt them on/off.

```
ManagerRegistry
  +-- register_manager(type, address, badge)
  +-- discover(type) -> Vec<ComponentAddress>
  +-- bolt_on(dao_id, manager_type, address)
  +-- bolt_off(dao_id, manager_type)
  +-- get_dao_stack(dao_id) -> Vec<Manager>
```
