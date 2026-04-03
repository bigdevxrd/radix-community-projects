// Radix Guild Portal — Configuration
// All mainnet addresses for v2 (with royalties)

export const CONFIG = {
  // Network
  networkId: 1, // 1 = Mainnet
  gatewayUrl: 'https://mainnet.radixdlt.com',
  dashboardUrl: 'https://dashboard.radixdlt.com',

  // dApp Definition
  // Using agent wallet as dApp def (same as Sats dashboard — deployer account)
  dAppDefinitionAddress: 'account_rdx128lggt503h7m2dhzqnrkkqv4zklxcjmdggr8xxtqy8e47p7fkmd8cx',

  // Package
  packageAddress: 'package_rdx1p4hx8r99n3fdf60sa7868tw2p8grq7nar4uycr8nup4f3c7xwy2q90',

  // Components
  factoryComponent: 'component_rdx1cz0494dztlww72czpynshpcjvxu3hfnhvemet3ndfunum65z3ewp2h',
  managerComponent: 'component_rdx1cqarn8x6gk0806qyc9eee4nh6arzkm90xvnk0edqgtcfgghx5m2v2w',

  // Resources
  badgeNftResource: 'resource_rdx1ntlzdss8nhd353h2lmu7d9cxhdajyzvstwp8kdnh53mk5vckfz9mj6',

  // XRD
  xrdResource: 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd',

  // Levels
  levels: [
    { name: 'member', minXp: 0, color: '#8888a0' },
    { name: 'contributor', minXp: 100, color: '#4ea8de' },
    { name: 'builder', minXp: 500, color: '#a78bfa' },
    { name: 'steward', minXp: 2000, color: '#f59e0b' },
    { name: 'elder', minXp: 10000, color: '#00e49f' },
  ],
} as const
