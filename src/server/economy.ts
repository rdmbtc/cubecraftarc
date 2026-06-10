/**
 * Economy Engine - Handles the tycoon economic simulation
 * Businesses generate income, players earn and spend currency
 */

import { LandManager, LandParcel } from './land'

export interface PlayerAccount {
    name: string
    balance: number
    totalEarned: number
    totalSpent: number
    income: number
    joinedAt: number
}

export interface BusinessTemplate {
    type: string
    name: string
    description: string
    buildCost: number
    revenuePerTick: number
    upgradeMultiplier: number
}

export const BUSINESS_TEMPLATES: BusinessTemplate[] = [
    {
        type: 'shop',
        name: 'General Store',
        description: 'A basic shop that generates steady income',
        buildCost: 50,
        revenuePerTick: 2
    },
    {
        type: 'farm',
        name: 'Automated Farm',
        description: 'Produces and sells crops automatically',
        buildCost: 80,
        revenuePerTick: 3
    },
    {
        type: 'mine',
        name: 'Mining Operation',
        description: 'Extracts and sells valuable resources',
        buildCost: 150,
        revenuePerTick: 5
    },
    {
        type: 'factory',
        name: 'Processing Factory',
        description: 'Converts raw materials into valuable goods',
        buildCost: 250,
        revenuePerTick: 8
    },
    {
        type: 'marketplace',
        name: 'Grand Marketplace',
        description: 'A large trading hub with high revenue',
        buildCost: 500,
        revenuePerTick: 15
    },
    {
        type: 'tower',
        name: 'Sky Tower',
        description: 'An iconic building with premium income',
        buildCost: 1000,
        revenuePerTick: 30
    }
]

export class EconomyEngine {
    private accounts: Map<string, PlayerAccount>
    private landManager: LandManager
    private tickInterval: ReturnType<typeof setInterval> | null = null
    private tickRate: number = 60000 // 1 minute
    private startingBalance: number = 200

    constructor(landManager: LandManager) {
        this.accounts = new Map()
        this.landManager = landManager
    }

    /**
     * Start the economy simulation loop
     */
    start(): void {
        if (this.tickInterval) return
        this.tickInterval = setInterval(() => this.tick(), this.tickRate)
        console.log(`Economy engine started (tick every ${this.tickRate / 1000}s)`)
    }

    /**
     * Stop the economy simulation
     */
    stop(): void {
        if (this.tickInterval) {
            clearInterval(this.tickInterval)
            this.tickInterval = null
        }
        console.log('Economy engine stopped')
    }

    /**
     * Register a new player in the economy
     */
    registerPlayer(playerName: string): PlayerAccount {
        if (this.accounts.has(playerName)) {
            return this.accounts.get(playerName)!
        }

        const account: PlayerAccount = {
            name: playerName,
            balance: this.startingBalance,
            totalEarned: this.startingBalance,
            totalSpent: 0,
            income: 0,
            joinedAt: Date.now()
        }
        this.accounts.set(playerName, account)
        console.log(`Registered player ${playerName} with ${this.startingBalance} starting balance`)
        return account
    }

    /**
     * Get a player's account
     */
    getAccount(playerName: string): PlayerAccount | undefined {
        return this.accounts.get(playerName)
    }

    /**
     * Get or create an account
     */
    getOrCreateAccount(playerName: string): PlayerAccount {
        return this.accounts.get(playerName) || this.registerPlayer(playerName)
    }

    /**
     * Add funds to a player's account
     */
    addFunds(playerName: string, amount: number, reason: string): boolean {
        const account = this.getOrCreateAccount(playerName)
        account.balance += amount
        account.totalEarned += amount
        console.log(`[Economy] ${playerName} received ${amount} (${reason}). Balance: ${account.balance}`)
        return true
    }

    /**
     * Deduct funds from a player's account
     */
    deductFunds(playerName: string, amount: number, reason: string): boolean {
        const account = this.getOrCreateAccount(playerName)
        if (account.balance < amount) {
            return false
        }
        account.balance -= amount
        account.totalSpent += amount
        console.log(`[Economy] ${playerName} spent ${amount} (${reason}). Balance: ${account.balance}`)
        return true
    }

    /**
     * Transfer funds between players
     */
    transfer(fromPlayer: string, toPlayer: string, amount: number): { success: boolean; message: string } {
        const fromAccount = this.getOrCreateAccount(fromPlayer)
        const toAccount = this.getOrCreateAccount(toPlayer)

        if (fromAccount.balance < amount) {
            return { success: false, message: `Insufficient funds. You have ${fromAccount.balance}, need ${amount}` }
        }

        fromAccount.balance -= amount
        fromAccount.totalSpent += amount
        toAccount.balance += amount
        toAccount.totalEarned += amount

        return { success: true, message: `Transferred ${amount} to ${toPlayer}` }
    }

    /**
     * Build a business on a parcel
     */
    buildBusiness(
        playerName: string,
        parcelX: number,
        parcelZ: number,
        businessType: string
    ): { success: boolean; message: string } {
        const template = BUSINESS_TEMPLATES.find(b => b.type === businessType)
        if (!template) {
            return { success: false, message: `Unknown business type: ${businessType}` }
        }

        const account = this.getOrCreateAccount(playerName)
        if (account.balance < template.buildCost) {
            return { success: false, message: `Insufficient funds. Need ${template.buildCost}, have ${account.balance}` }
        }

        const parcel = this.landManager.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }

        const position = {
            x: parcelX * 16 + 8,
            y: 64,
            z: parcelZ * 16 + 8
        }

        const result = this.landManager.buildStructure(parcelX, parcelZ, playerName, {
            type: template.type,
            name: template.name,
            position,
            revenuePerTick: template.revenuePerTick
        }, template.buildCost)

        if (result.success) {
            this.deductFunds(playerName, template.buildCost, `Built ${template.name}`)
        }

        return result
    }

    /**
     * Upgrade a business on a parcel
     */
    upgradeBusiness(
        playerName: string,
        parcelX: number,
        parcelZ: number,
        structureIndex: number
    ): { success: boolean; message: string } {
        const parcel = this.landManager.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (structureIndex < 0 || structureIndex >= parcel.structures.length) {
            return { success: false, message: 'Invalid structure index' }
        }

        const structure = parcel.structures[structureIndex]
        const upgradeCost = Math.floor(structure.revenuePerTick * 20 * structure.level)

        const account = this.getOrCreateAccount(playerName)
        if (account.balance < upgradeCost) {
            return { success: false, message: `Insufficient funds. Need ${upgradeCost}, have ${account.balance}` }
        }

        const result = this.landManager.upgradeStructure(parcelX, parcelZ, playerName, structureIndex, upgradeCost)
        if (result.success) {
            this.deductFunds(playerName, upgradeCost, `Upgraded ${structure.name}`)
        }

        return result
    }

    /**
     * Economy tick - generate revenue from all businesses
     */
    private tick(): void {
        let totalRevenue = 0

        for (const parcel of this.landManager['grid'].parcels.values()) {
            if (!parcel.owner) continue

            for (const structure of parcel.structures) {
                if (structure.revenuePerTick > 0) {
                    const account = this.accounts.get(parcel.owner!)
                    if (account) {
                        account.balance += structure.revenuePerTick
                        account.totalEarned += structure.revenuePerTick
                        account.income += structure.revenuePerTick
                        totalRevenue += structure.revenuePerTick
                    }
                }
            }
        }

        if (totalRevenue > 0) {
            console.log(`[Economy Tick] Total revenue distributed: ${totalRevenue}`)
        }
    }

    /**
     * Get leaderboard sorted by balance
     */
    getLeaderboard(limit: number = 10): PlayerAccount[] {
        return Array.from(this.accounts.values())
            .sort((a, b) => b.balance - a.balance)
            .slice(0, limit)
    }

    /**
     * Get available business templates
     */
    getBusinessTemplates(): BusinessTemplate[] {
        return BUSINESS_TEMPLATES
    }

    /**
     * Get economy statistics
     */
    getStats(): {
        totalPlayers: number
        totalBalance: number
        totalEarned: number
        totalSpent: number
    } {
        let totalBalance = 0
        let totalEarned = 0
        let totalSpent = 0

        for (const account of this.accounts.values()) {
            totalBalance += account.balance
            totalEarned += account.totalEarned
            totalSpent += account.totalSpent
        }

        return {
            totalPlayers: this.accounts.size,
            totalBalance,
            totalEarned,
            totalSpent
        }
    }

    /**
     * Serialize economy data for persistence
     */
    serialize(): string {
        const data = Array.from(this.accounts.values())
        return JSON.stringify(data, null, 2)
    }
}
