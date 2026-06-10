/**
 * useContracts.ts - React hooks for interacting with CubeCraft Tycoon smart contracts
 * Uses viem for type-safe blockchain interactions on Arc Testnet
 */

import { createPublicClient, createWalletClient, custom, http, parseAbi, formatUnits, type Address, type PublicClient, type WalletClient } from 'viem';

// ============ Network Config ============

export const ARC_TESTNET = {
    id: 5042002,
    name: 'Arc Testnet',
    network: 'arc-testnet',
    nativeCurrency: {
        name: 'USDC',
        symbol: 'USDC',
        decimals: 18, // Native gas uses 18 decimals on Arc
    },
    rpcUrls: {
        default: { http: ['https://rpc.testnet.arc.network'] },
        public: { http: ['https://rpc.testnet.arc.network'] },
    },
    blockExplorers: {
        default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
    },
} as const;

// ============ Contract Addresses ============

// Update these after deployment
export const CONTRACT_ADDRESSES = {
    LandNFT: (import.meta.env.VITE_LAND_NFT_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    LandRental: (import.meta.env.VITE_LAND_RENTAL_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    GameEconomy: (import.meta.env.VITE_GAME_ECONOMY_ADDRESS || '0x0000000000000000000000000000000000000000') as Address,
    USDC: '0x3600000000000000000000000000000000000000' as Address,
} as const;

// ============ ABIs ============

export const ERC20_ABI = parseAbi([
    'function balanceOf(address account) view returns (uint256)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

export const LAND_NFT_ABI = parseAbi([
    // ERC-721 standard
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function balanceOf(address owner) view returns (uint256)',
    'function ownerOf(uint256 tokenId) view returns (address)',
    'function approve(address to, uint256 tokenId)',
    'function getApproved(uint256 tokenId) view returns (address)',
    'function setApprovalForAll(address operator, bool approved)',
    'function isApprovedForAll(address owner, address operator) view returns (bool)',
    'function transferFrom(address from, address to, uint256 tokenId)',
    'function safeTransferFrom(address from, address to, uint256 tokenId)',
    'function tokenURI(uint256 tokenId) view returns (string)',
    // LandNFT specific
    'function parcels(uint256 tokenId) view returns (int256 x, int256 y, uint256 width, uint256 height, uint8 zoneType, uint8 developmentLevel, bool exists)',
    'function ownerParcels(address owner, uint256 index) view returns (uint256)',
    'function getParcelData(uint256 tokenId) view returns (tuple(int256 x, int256 y, uint256 width, uint256 height, uint8 zoneType, uint8 developmentLevel, bool exists))',
    'function getOwnerParcels(address owner) view returns (uint256[])',
    'function getOwnerParcelCount(address owner) view returns (uint256)',
    'function tokenByCoordinates(int256 x, int256 y, uint256 width, uint256 height) view returns (uint256)',
    'function totalParcels() view returns (uint256)',
    'function gameAdmin() view returns (address)',
    'function mintLand(address to, int256 x, int256 y, uint256 width, uint256 height, uint8 zoneType) returns (uint256)',
    'function mintLandBatch(address[] recipients, int256[] xs, int256[] ys, uint256[] widths, uint256[] heights, uint8[] zoneTypes)',
    'function upgradeDevelopment(uint256 tokenId, uint8 newLevel)',
    'function changeZoneType(uint256 tokenId, uint8 newZone)',
    'function setBaseURI(string newBaseURI)',
    // Events
    'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
    'event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId)',
    'event LandMinted(uint256 indexed tokenId, address indexed to, int256 x, int256 y, uint256 width, uint256 height, uint8 zoneType)',
    'event DevelopmentUpgraded(uint256 indexed tokenId, uint8 oldLevel, uint8 newLevel)',
    'event ZoneTypeChanged(uint256 indexed tokenId, uint8 oldZone, uint8 newZone)',
]);

export const LAND_RENTAL_ABI = parseAbi([
    // Config
    'function usdc() view returns (address)',
    'function landNFT() view returns (address)',
    'function gameAdmin() view returns (address)',
    'function treasury() view returns (address)',
    'function feeBasisPoints() view returns (uint256)',
    // Listings
    'function listings(uint256 tokenId) view returns (uint256 pricePerDay, bool isListed, uint256 minDays, uint256 maxDays)',
    'function listLand(uint256 tokenId, uint256 pricePerDay, uint256 minDays, uint256 maxDays)',
    'function unlistLand(uint256 tokenId)',
    'function updateListing(uint256 tokenId, uint256 newPricePerDay, uint256 newMinDays, uint256 newMaxDays)',
    'function getListing(uint256 tokenId) view returns (tuple(uint256 pricePerDay, bool isListed, uint256 minDays, uint256 maxDays))',
    // Rentals
    'function activeRentals(uint256 tokenId) view returns (address tenant, uint256 tokenId_, uint256 startTime, uint256 endTime, uint256 totalPaid, bool isActive)',
    'function rentLand(uint256 tokenId, uint256 days)',
    'function expireRental(uint256 tokenId)',
    'function isRented(uint256 tokenId) view returns (bool)',
    'function isRentalExpired(uint256 tokenId) view returns (bool)',
    'function getRemainingTime(uint256 tokenId) view returns (uint256)',
    'function getActiveRental(uint256 tokenId) view returns (tuple(address tenant, uint256 tokenId_, uint256 startTime, uint256 endTime, uint256 totalPaid, bool isActive))',
    'function getRentalCost(uint256 tokenId, uint256 days) view returns (uint256 totalCost, uint256 ownerPayment, uint256 fee)',
    'function getTenantRentals(address tenant) view returns (uint256[])',
    'function getRentalHistory(uint256 tokenId) view returns (tuple(address tenant, uint256 tokenId_, uint256 startTime, uint256 endTime, uint256 totalPaid, bool isActive)[])',
    // Revenue
    'function totalRevenue() view returns (uint256)',
    'function treasuryRevenue() view returns (uint256)',
    // Events
    'event LandListed(uint256 indexed tokenId, uint256 pricePerDay, uint256 minDays, uint256 maxDays)',
    'event LandUnlisted(uint256 indexed tokenId)',
    'event LandRented(uint256 indexed tokenId, address indexed tenant, uint256 startTime, uint256 endTime, uint256 totalCost)',
    'event RentalExpired(uint256 indexed tokenId, address indexed tenant)',
]);

export const GAME_ECONOMY_ABI = parseAbi([
    // Config
    'function usdc() view returns (address)',
    'function landNFT() view returns (address)',
    'function landRental() view returns (address)',
    'function gameAdmin() view returns (address)',
    'function treasury() view returns (address)',
    'function revenueFeeBasisPoints() view returns (uint256)',
    // Business data
    'function businesses(uint256 businessId) view returns (uint256 id, uint256 landTokenId, uint8 businessType, uint8 level, uint256 builtAt, uint256 lastClaimTime, uint256 totalRevenue_, bool exists)',
    'function landBusiness(uint256 landTokenId) view returns (uint256)',
    'function ownerBusinesses(address owner, uint256 index) view returns (uint256)',
    'function businessConfigs(uint8 businessType) view returns (uint256 buildCost, uint256 dailyRevenue, uint256 upgradeCost, uint8 maxLevel, bool enabled)',
    'function nextBusinessId() view returns (uint256)',
    'function totalBusinesses() view returns (uint256)',
    'function totalRevenueGenerated() view returns (uint256)',
    // Actions
    'function buildBusiness(uint256 landTokenId, uint8 businessType)',
    'function upgradeBusiness(uint256 businessId)',
    'function claimRevenue(uint256 businessId)',
    'function demolishBusiness(uint256 businessId)',
    // View
    'function getBusiness(uint256 businessId) view returns (tuple(uint256 id, uint256 landTokenId, uint8 businessType, uint8 level, uint256 builtAt, uint256 lastClaimTime, uint256 totalRevenue_, bool exists))',
    'function getBusinessConfig(uint8 businessType) view returns (tuple(uint256 buildCost, uint256 dailyRevenue, uint256 upgradeCost, uint8 maxLevel, bool enabled))',
    'function getOwnerBusinesses(address owner) view returns (uint256[])',
    'function getPendingRevenue(uint256 businessId) view returns (uint256 total, uint256 ownerShare, uint256 fee)',
    'function getBusinessOnLand(uint256 landTokenId) view returns (uint256)',
    'function getRevenuePerDay(uint256 businessId) view returns (uint256)',
    'function fundTreasury(uint256 amount)',
    // Events
    'event BusinessBuilt(uint256 indexed businessId, address indexed owner, uint256 indexed landTokenId, uint8 businessType)',
    'event BusinessUpgraded(uint256 indexed businessId, uint8 oldLevel, uint8 newLevel)',
    'event RevenueClaimed(uint256 indexed businessId, address indexed owner, uint256 amount, uint256 fee)',
    'event BusinessDemolished(uint256 indexed businessId, uint256 indexed landTokenId)',
]);

// ============ Enum Helpers ============

export enum ZoneType {
    Commercial = 0,
    Residential = 1,
    Industrial = 2,
}

export enum BusinessType {
    Shop = 0,
    Restaurant = 1,
    Factory = 2,
    Office = 3,
    Mall = 4,
}

export const BUSINESS_TYPE_NAMES: Record<BusinessType, string> = {
    [BusinessType.Shop]: 'Shop',
    [BusinessType.Restaurant]: 'Restaurant',
    [BusinessType.Factory]: 'Factory',
    [BusinessType.Office]: 'Office',
    [BusinessType.Mall]: 'Mall',
};

export const ZONE_TYPE_NAMES: Record<ZoneType, string> = {
    [ZoneType.Commercial]: 'Commercial',
    [ZoneType.Residential]: 'Residential',
    [ZoneType.Industrial]: 'Industrial',
};

// ============ Types ============

export interface LandParcel {
    x: bigint;
    y: bigint;
    width: bigint;
    height: bigint;
    zoneType: ZoneType;
    developmentLevel: number;
    exists: boolean;
}

export interface RentalListing {
    pricePerDay: bigint;
    isListed: boolean;
    minDays: bigint;
    maxDays: bigint;
}

export interface Rental {
    tenant: Address;
    tokenId: bigint;
    startTime: bigint;
    endTime: bigint;
    totalPaid: bigint;
    isActive: boolean;
}

export interface Business {
    id: bigint;
    landTokenId: bigint;
    businessType: BusinessType;
    level: number;
    builtAt: bigint;
    lastClaimTime: bigint;
    totalRevenue: bigint;
    exists: boolean;
}

export interface BusinessConfig {
    buildCost: bigint;
    dailyRevenue: bigint;
    upgradeCost: bigint;
    maxLevel: number;
    enabled: boolean;
}

// ============ Client Factories ============

let publicClient: PublicClient | null = null;
let walletClient: WalletClient | null = null;

export function getPublicClient(): PublicClient {
    if (!publicClient) {
        publicClient = createPublicClient({
            chain: ARC_TESTNET,
            transport: http('https://rpc.testnet.arc.network'),
        });
    }
    return publicClient;
}

export function getWalletClient(): WalletClient {
    if (!walletClient && typeof window !== 'undefined' && window.ethereum) {
        walletClient = createWalletClient({
            chain: ARC_TESTNET,
            transport: custom(window.ethereum),
        });
    }
    return walletClient!;
}

// ============ USDC Hooks ============

export async function getUSDCBalance(address: Address): Promise<bigint> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
    });
}

export async function getUSDCAllowance(owner: Address, spender: Address): Promise<bigint> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [owner, spender],
    });
}

export async function approveUSDC(spender: Address, amount: bigint): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.USDC,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spender, amount],
    });
}

// ============ LandNFT Functions ============

export async function getParcelData(tokenId: bigint): Promise<LandParcel> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.LandNFT,
        abi: LAND_NFT_ABI,
        functionName: 'getParcelData',
        args: [tokenId],
    });
    return {
        x: data[0],
        y: data[1],
        width: data[2],
        height: data[3],
        zoneType: data[4] as ZoneType,
        developmentLevel: data[5],
        exists: data[6],
    };
}

export async function getOwnerParcels(owner: Address): Promise<bigint[]> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.LandNFT,
        abi: LAND_NFT_ABI,
        functionName: 'getOwnerParcels',
        args: [owner],
    });
}

export async function mintLand(
    to: Address,
    x: bigint,
    y: bigint,
    width: bigint,
    height: bigint,
    zoneType: ZoneType,
): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.LandNFT,
        abi: LAND_NFT_ABI,
        functionName: 'mintLand',
        args: [to, x, y, width, height, zoneType],
    });
}

export async function upgradeDevelopment(tokenId: bigint, newLevel: number): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.LandNFT,
        abi: LAND_NFT_ABI,
        functionName: 'upgradeDevelopment',
        args: [tokenId, newLevel],
    });
}

// ============ LandRental Functions ============

export async function getRentalListing(tokenId: bigint): Promise<RentalListing> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'getListing',
        args: [tokenId],
    });
    return {
        pricePerDay: data[0],
        isListed: data[1],
        minDays: data[2],
        maxDays: data[3],
    };
}

export async function getActiveRental(tokenId: bigint): Promise<Rental> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'getActiveRental',
        args: [tokenId],
    });
    return {
        tenant: data[0],
        tokenId: data[1],
        startTime: data[2],
        endTime: data[3],
        totalPaid: data[4],
        isActive: data[5],
    };
}

export async function listLand(
    tokenId: bigint,
    pricePerDay: bigint,
    minDays: bigint,
    maxDays: bigint,
): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'listLand',
        args: [tokenId, pricePerDay, minDays, maxDays],
    });
}

export async function rentLand(tokenId: bigint, days: bigint): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'rentLand',
        args: [tokenId, days],
    });
}

export async function getRentalCost(
    tokenId: bigint,
    days: bigint,
): Promise<{ totalCost: bigint; ownerPayment: bigint; fee: bigint }> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'getRentalCost',
        args: [tokenId, days],
    });
    return { totalCost: data[0], ownerPayment: data[1], fee: data[2] };
}

export async function isRented(tokenId: bigint): Promise<boolean> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'isRented',
        args: [tokenId],
    });
}

export async function getRemainingTime(tokenId: bigint): Promise<bigint> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.LandRental,
        abi: LAND_RENTAL_ABI,
        functionName: 'getRemainingTime',
        args: [tokenId],
    });
}

// ============ GameEconomy Functions ============

export async function getBusiness(businessId: bigint): Promise<Business> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'getBusiness',
        args: [businessId],
    });
    return {
        id: data[0],
        landTokenId: data[1],
        businessType: data[2] as BusinessType,
        level: data[3],
        builtAt: data[4],
        lastClaimTime: data[5],
        totalRevenue: data[6],
        exists: data[7],
    };
}

export async function getBusinessConfig(businessType: BusinessType): Promise<BusinessConfig> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'getBusinessConfig',
        args: [businessType],
    });
    return {
        buildCost: data[0],
        dailyRevenue: data[1],
        upgradeCost: data[2],
        maxLevel: data[3],
        enabled: data[4],
    };
}

export async function getOwnerBusinesses(owner: Address): Promise<bigint[]> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'getOwnerBusinesses',
        args: [owner],
    });
}

export async function buildBusiness(landTokenId: bigint, businessType: BusinessType): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'buildBusiness',
        args: [landTokenId, businessType],
    });
}

export async function upgradeBusiness(businessId: bigint): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'upgradeBusiness',
        args: [businessId],
    });
}

export async function claimRevenue(businessId: bigint): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'claimRevenue',
        args: [businessId],
    });
}

export async function demolishBusiness(businessId: bigint): Promise<Address> {
    const wallet = getWalletClient();
    const [account] = await wallet.getAddresses();
    return wallet.writeContract({
        account,
        chain: ARC_TESTNET,
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'demolishBusiness',
        args: [businessId],
    });
}

export async function getPendingRevenue(
    businessId: bigint,
): Promise<{ total: bigint; ownerShare: bigint; fee: bigint }> {
    const client = getPublicClient();
    const data = await client.readContract({
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'getPendingRevenue',
        args: [businessId],
    });
    return { total: data[0], ownerShare: data[1], fee: data[2] };
}

export async function getRevenuePerDay(businessId: bigint): Promise<bigint> {
    const client = getPublicClient();
    return client.readContract({
        address: CONTRACT_ADDRESSES.GameEconomy,
        abi: GAME_ECONOMY_ABI,
        functionName: 'getRevenuePerDay',
        args: [businessId],
    });
}

// ============ Utility Functions ============

/**
 * Format USDC amount (6 decimals) to human-readable string
 */
export function formatUSDC(amount: bigint): string {
    return formatUnits(amount, 6);
}

/**
 * Parse USDC amount from human-readable string to bigint (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
    const parts = amount.split('.');
    const whole = parts[0] || '0';
    const decimals = (parts[1] || '').padEnd(6, '0').slice(0, 6);
    return BigInt(whole) * 1000000n + BigInt(decimals);
}

/**
 * Get block explorer URL for a transaction or address
 */
export function getExplorerUrl(hash: Address, type: 'tx' | 'address' = 'tx'): string {
    return `https://testnet.arcscan.app/${type}/${hash}`;
}

/**
 * Check if wallet is connected and on the correct chain
 */
export async function ensureCorrectChain(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ethereum) return false;
    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    return parseInt(chainId as string, 16) === ARC_TESTNET.id;
}

/**
 * Request wallet connection
 */
export async function connectWallet(): Promise<Address[]> {
    const wallet = getWalletClient();
    if (!wallet) throw new Error('No wallet found');
    return wallet.requestAddresses();
}

// Declare ethereum on window for TypeScript
declare global {
    interface Window {
        ethereum?: {
            request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
            on: (event: string, callback: (...args: unknown[]) => void) => void;
            removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
        };
    }
}
