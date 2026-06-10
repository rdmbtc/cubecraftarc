// Arc Testnet configuration for CubeCraft Arc Tycoon
export const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: {
    name: 'USDC',
    symbol: 'USDC',
    decimals: 18, // Native gas uses 18 decimals
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
    public: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
  testnet: true,
} as const

// USDC ERC-20 on Arc Testnet (6 decimals)
export const USDC_ADDRESS = '0x3600000000000000000000000000000000000000' as const
export const USDC_DECIMALS = 6

// Contract addresses (update after deployment)
export const CONTRACTS = {
  landNFT: '0x0000000000000000000000000000000000000000', // Update after deploy
  landRental: '0x0000000000000000000000000000000000000000', // Update after deploy
  gameEconomy: '0x0000000000000000000000000000000000000000', // Update after deploy
} as const

// Minimal ABIs for contract interaction
export const LAND_NFT_ABI = [
  {
    name: 'mintParcel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'x', type: 'uint16' },
      { name: 'y', type: 'uint16' },
      { name: 'width', type: 'uint16' },
      { name: 'height', type: 'uint16' },
      { name: 'zoneType', type: 'uint8' },
      { name: 'pricePerDay', type: 'uint256' },
      { name: 'uri', type: 'string' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'parcels',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'x', type: 'uint16' },
      { name: 'y', type: 'uint16' },
      { name: 'width', type: 'uint16' },
      { name: 'height', type: 'uint16' },
      { name: 'zoneType', type: 'uint8' },
      { name: 'developmentLevel', type: 'uint8' },
      { name: 'pricePerDay', type: 'uint256' },
      { name: 'forRent', type: 'bool' },
    ],
  },
  {
    name: 'listForRent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'pricePerDay', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'upgradeDevelopment',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const LAND_RENTAL_ABI = [
  {
    name: 'rentParcel',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'pricePerDay', type: 'uint256' },
      { name: 'days', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'isRentalActive',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'activeRentals',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'tenant', type: 'address' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'totalPaid', type: 'uint256' },
      { name: 'pricePerDay', type: 'uint256' },
    ],
  },
] as const

export const GAME_ECONOMY_ABI = [
  {
    name: 'buildBusiness',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'parcelId', type: 'uint256' },
      { name: 'btype', type: 'uint8' },
    ],
    outputs: [],
  },
  {
    name: 'claimRevenue',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'businessId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'upgradeBusiness',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'businessId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'businesses',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [
      { name: 'parcelId', type: 'uint256' },
      { name: 'businessType', type: 'uint8' },
      { name: 'level', type: 'uint8' },
      { name: 'revenuePerHour', type: 'uint256' },
      { name: 'lastClaimTime', type: 'uint256' },
      { name: 'totalEarned', type: 'uint256' },
      { name: 'active', type: 'bool' },
    ],
  },
  {
    name: 'getPlayerBusinesses',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  {
    name: 'getPendingRevenue',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'businessId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'buildCosts',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

export const USDC_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const

// Business type names
export const BUSINESS_TYPES = ['Shop', 'Farm', 'Mine', 'Factory', 'Marketplace', 'Tower'] as const
export const ZONE_TYPES = ['Commercial', 'Residential', 'Industrial', 'Special'] as const
