/**
 * Land Manager - Manages the land parcel grid system
 * Players can claim, build on, and trade land parcels
 */

export interface LandParcel {
    x: number
    z: number
    owner: string | null
    structures: Structure[]
    claimedAt: number | null
    value: number
    forSale: boolean
    salePrice: number
}

export interface Structure {
    type: string
    name: string
    level: number
    position: { x: number; y: number; z: number }
    placedAt: number
    revenuePerTick: number
}

export interface LandGrid {
    parcels: Map<string, LandParcel>
    gridSize: number
    parcelSize: number
    originX: number
    originZ: number
}

export class LandManager {
    private grid: LandGrid
    private defaultParcelValue: number = 100

    constructor(gridSize: number = 32, parcelSize: number = 16) {
        this.grid = {
            parcels: new Map(),
            gridSize,
            parcelSize,
            originX: 0,
            originZ: 0
        }
        this.initializeParcels()
    }

    private initializeParcels(): void {
        const half = Math.floor(this.grid.gridSize / 2)
        for (let x = -half; x < half; x++) {
            for (let z = -half; z < half; z++) {
                const key = this.getKey(x, z)
                this.grid.parcels.set(key, {
                    x,
                    z,
                    owner: null,
                    structures: [],
                    claimedAt: null,
                    value: this.defaultParcelValue,
                    forSale: false,
                    salePrice: 0
                })
            }
        }
        console.log(`Initialized ${this.grid.parcels.size} land parcels`)
    }

    private getKey(x: number, z: number): string {
        return `${x},${z}`
    }

    getParcel(x: number, z: number): LandParcel | undefined {
        return this.grid.parcels.get(this.getKey(x, z))
    }

    /**
     * Convert world coordinates to parcel coordinates
     */
    worldToParcel(worldX: number, worldZ: number): { parcelX: number; parcelZ: number } {
        const parcelX = Math.floor(worldX / this.grid.parcelSize)
        const parcelZ = Math.floor(worldZ / this.grid.parcelSize)
        return { parcelX, parcelZ }
    }

    /**
     * Claim a parcel for a player
     */
    claimParcel(parcelX: number, parcelZ: number, playerName: string): { success: boolean; message: string } {
        const parcel = this.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (parcel.owner !== null) {
            return { success: false, message: `Parcel already owned by ${parcel.owner}` }
        }

        parcel.owner = playerName
        parcel.claimedAt = Date.now()
        return { success: true, message: `Parcel (${parcelX}, ${parcelZ}) claimed by ${playerName}` }
    }

    /**
     * Release a parcel back to the market
     */
    releaseParcel(parcelX: number, parcelZ: number, playerName: string): { success: boolean; message: string } {
        const parcel = this.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (parcel.owner !== playerName) {
            return { success: false, message: 'You do not own this parcel' }
        }

        parcel.owner = null
        parcel.claimedAt = null
        parcel.structures = []
        parcel.forSale = false
        parcel.salePrice = 0
        return { success: true, message: `Parcel (${parcelX}, ${parcelZ}) released` }
    }

    /**
     * Build a structure on a parcel
     */
    buildStructure(
        parcelX: number,
        parcelZ: number,
        playerName: string,
        structure: { type: string; name: string; position: { x: number; y: number; z: number }; revenuePerTick: number },
        buildCost: number
    ): { success: boolean; message: string; cost?: number } {
        const parcel = this.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (parcel.owner !== playerName) {
            return { success: false, message: 'You do not own this parcel' }
        }

        const existingStructure = parcel.structures.find(
            s => s.position.x === structure.position.x &&
                 s.position.y === structure.position.y &&
                 s.position.z === structure.position.z
        )
        if (existingStructure) {
            return { success: false, message: 'There is already a structure at this position' }
        }

        parcel.structures.push({
            type: structure.type,
            name: structure.name,
            level: 1,
            position: structure.position,
            placedAt: Date.now(),
            revenuePerTick: structure.revenuePerTick
        })

        // Increase parcel value when structures are built
        parcel.value += buildCost * 0.5

        return { success: true, message: `Built ${structure.name} on parcel (${parcelX}, ${parcelZ})`, cost: buildCost }
    }

    /**
     * Upgrade a structure on a parcel
     */
    upgradeStructure(
        parcelX: number,
        parcelZ: number,
        playerName: string,
        structureIndex: number,
        upgradeCost: number
    ): { success: boolean; message: string; cost?: number } {
        const parcel = this.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (parcel.owner !== playerName) {
            return { success: false, message: 'You do not own this parcel' }
        }
        if (structureIndex < 0 || structureIndex >= parcel.structures.length) {
            return { success: false, message: 'Invalid structure index' }
        }

        const structure = parcel.structures[structureIndex]
        structure.level += 1
        structure.revenuePerTick *= 1.5
        parcel.value += upgradeCost * 0.3

        return { success: true, message: `Upgraded ${structure.name} to level ${structure.level}`, cost: upgradeCost }
    }

    /**
     * List a parcel for sale
     */
    listForSale(parcelX: number, parcelZ: number, playerName: string, price: number): { success: boolean; message: string } {
        const parcel = this.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (parcel.owner !== playerName) {
            return { success: false, message: 'You do not own this parcel' }
        }

        parcel.forSale = true
        parcel.salePrice = price
        return { success: true, message: `Parcel (${parcelX}, ${parcelZ}) listed for sale at ${price}` }
    }

    /**
     * Buy a parcel that is for sale
     */
    buyParcel(parcelX: number, parcelZ: number, buyerName: string): { success: boolean; message: string; price?: number } {
        const parcel = this.getParcel(parcelX, parcelZ)
        if (!parcel) {
            return { success: false, message: 'Parcel does not exist' }
        }
        if (!parcel.forSale) {
            return { success: false, message: 'Parcel is not for sale' }
        }
        if (parcel.owner === buyerName) {
            return { success: false, message: 'You already own this parcel' }
        }

        const price = parcel.salePrice
        const previousOwner = parcel.owner
        parcel.owner = buyerName
        parcel.claimedAt = Date.now()
        parcel.forSale = false
        parcel.salePrice = 0

        return { success: true, message: `${buyerName} bought parcel (${parcelX}, ${parcelZ}) from ${previousOwner} for ${price}`, price }
    }

    /**
     * Get all parcels owned by a player
     */
    getPlayerParcels(playerName: string): LandParcel[] {
        const result: LandParcel[] = []
        for (const parcel of this.grid.parcels.values()) {
            if (parcel.owner === playerName) {
                result.push(parcel)
            }
        }
        return result
    }

    /**
     * Get parcels for sale
     */
    getParcelsForSale(): LandParcel[] {
        const result: LandParcel[] = []
        for (const parcel of this.grid.parcels.values()) {
            if (parcel.forSale) {
                result.push(parcel)
            }
        }
        return result
    }

    /**
     * Get statistics about the land grid
     */
    getStats(): { total: number; claimed: number; unclaimed: number; forSale: number } {
        let claimed = 0
        let forSale = 0
        for (const parcel of this.grid.parcels.values()) {
            if (parcel.owner) claimed++
            if (parcel.forSale) forSale++
        }
        return {
            total: this.grid.parcels.size,
            claimed,
            unclaimed: this.grid.parcels.size - claimed,
            forSale
        }
    }

    /**
     * Serialize land data for persistence
     */
    serialize(): string {
        const data: any[] = []
        for (const [key, parcel] of this.grid.parcels) {
            if (parcel.owner) {
                data.push({ key, ...parcel })
            }
        }
        return JSON.stringify(data, null, 2)
    }

    /**
     * Get the grid info
     */
    getGridInfo(): { gridSize: number; parcelSize: number } {
        return {
            gridSize: this.grid.gridSize,
            parcelSize: this.grid.parcelSize
        }
    }
}
