// Radix Guild Portal — Configuration
// All mainnet addresses for v2 (with royalties)

export const CONFIG = {
  // Network
  networkId: 1, // 1 = Mainnet
  gatewayUrl: 'https://mainnet.radixdlt.com',
  dashboardUrl: 'https://dashboard.radixdlt.com',

  // dApp Definition
  dAppDefinitionAddress: 'account_rdx12yh4fwevmvnqgd3ppzau66cm9xu874srmrt9g2cye3fa8j8y78z9sq',

  // Package
  packageAddress: 'package_rdx1p4hx8r99n3fdf60sa7868tw2p8grq7nar4uycr8nup4f3c7xwy2q90',

  // Components
  factoryComponent: 'component_rdx1cz0494dztlww72czpynshpcjvxu3hfnhvemet3ndfunum65z3ewp2h',
  managerComponent: 'component_rdx1cr6u85scdgp3ws8xfxaw5e8upz9gun6r43fldchmkqhmzjt32vvhg6',

  // Resources
  badgeNftResource: 'resource_rdx1ntw34axdj0thqynn6lwl97q7uedkgj964el9ut9tu65sdmpx4lfd6x',

  // XRD
  xrdResource: 'resource_rdx1tknxxxxxxxxxradxrdxxxxxxxxx009923554798xxxxxxxxxradxrd',

  // Levels
  levels: [
    { name: 'newcomer', minXp: 0, color: '#8888a0' },
    { name: 'contributor', minXp: 100, color: '#4ea8de' },
    { name: 'builder', minXp: 500, color: '#a78bfa' },
    { name: 'trusted', minXp: 2000, color: '#f59e0b' },
    { name: 'elder', minXp: 10000, color: '#00e49f' },
  ],
} as const
