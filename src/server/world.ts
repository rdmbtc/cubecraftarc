/**
 * Game World Manager - Manages the Minecraft-based tycoon world
 * Handles world creation, player connections, and game state
 */

import { LandManager } from './land'
import { EconomyEngine, BUSINESS_TEMPLATES } from './economy'

export interface GameWorldConfig {
    worldName: string
    maxPlayers: number
    port: number
    gameMode: 'creative' | 'survival' | 'adventure'
    enablePvP: boolean
}

export interface PlayerState {
    name: string
    connected: boolean
    connectedAt: number
    lastActivity: number
    currentParcel: { x: number; z: number } | null
}

export class GameWorld {
    private config: GameWorldConfig
    public landManager: LandManager
    public economy: EconomyEngine
    private players: Map<string, PlayerState> = new Map()
    private chatHistory: Array<{ player: string; message: string; timestamp: number }> = []
    private maxChatHistory: number = 100
    private server: any = null

    constructor(config: Partial<GameWorldConfig> = {}) {
        this.config = {
            worldName: config.worldName || 'CubeCraft Arc Tycoon',
            maxPlayers: config.maxPlayers || 50,
            port: config.port || 25565,
            gameMode: config.gameMode || 'creative',
            enablePvP: config.enablePvP ?? false
        }

        this.landManager = new LandManager(32, 16)
        this.economy = new EconomyEngine(this.landManager)
    }

    /**
     * Initialize and start the game world server
     */
    async start(): Promise<void> {
        console.log(`Starting game world: ${this.config.worldName}`)
        console.log(`Max players: ${this.config.maxPlayers}`)
        console.log(`Port: ${this.config.port}`)

        // Start the economy engine
        this.economy.start()

        try {
            // Import and create flying-squid server
            const { createMCServer } = require('flying-squid/dist')

            this.server = createMCServer({
                'server-port': this.config.port,
                'max-players': this.config.maxPlayers,
                'game-mode': this.config.gameMode === 'creative' ? 1 : this.config.gameMode === 'survival' ? 0 : 2,
                'level-name': 'world',
                'online-mode': false,
                'motd': this.config.worldName,
                'pvp': this.config.enablePvP,
                'view-distance': 6,
                'world-generator': 'superflat',
                'version': '1.21.1'
            }) as any

            this.setupServerEvents()
            console.log(`Game world "${this.config.worldName}" started on port ${this.config.port}`)
        } catch (err) {
            console.warn('flying-squid not available, running in standalone mode (no Minecraft protocol)')
            console.log('WebSocket API is still available for web-based connections')
        }
    }

    /**
     * Set up server event handlers
     */
    private setupServerEvents(): void {
        if (!this.server) return

        this.server.on('playerJoin', (player: any) => {
            this.onPlayerJoin(player)
        })

        this.server.on('playerQuit', (player: any) => {
            this.onPlayerQuit(player)
        })

        // Register tycoon commands via flying-squid command system
        this.registerCommands()
    }

    /**
     * Register all tycoon commands with flying-squid
     */
    private registerCommands(): void {
        const serv = this.server
        if (!serv?.commands) return

        const getParcel = (player: any) => {
            let x = 0, z = 0
            if (player?.entity?.position) {
                const pos = player.entity.position
                x = Math.floor(pos.x / 16)
                z = Math.floor(pos.z / 16)
            }
            const state = this.players.get(player.username)
            if (state) state.currentParcel = { x, z }
            return { x, z }
        }

        // /tycoonhelp - show all tycoon commands
        serv.commands.add({
            base: 'tycoonhelp',
            info: 'Show CubeCraft Tycoon commands',
            usage: '/tycoonhelp',
            action(params: any, ctx: any) {
                const p = ctx.player
                if (!p) return
                const lines = [
                    '=== CubeCraft Arc Tycoon Commands ===',
                    '/claim - Claim parcel you stand on',
                    '/parcels - List your parcels',
                    '/build <type> - Build business (shop/farm/mine/factory/marketplace/tower)',
                    '/businesses - Show available business types',
                    '/upgrade <num> - Upgrade business',
                    '/balance - Check balance',
                    '/leaderboard - Top players',
                    '/market - Parcels for sale',
                    '/sell <price> - List parcel for sale',
                    '/buy - Buy parcel you stand on',
                    '/info - World information',
                ]
                lines.forEach(l => p.chat(l))
            }
        })

        // /claim
        serv.commands.add({
            base: 'claim',
            info: 'Claim the parcel you are standing on',
            usage: '/claim',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const { x, z } = getParcel(player)
                const result = this.landManager.claimParcel(x, z, player.username)
                player.chat(result.message)
                if (result.success) {
                    this.placeParcelMarkers(x, z, player.username)
                }
            }
        })

        // /parcels
        serv.commands.add({
            base: 'parcels',
            info: 'List your owned parcels',
            usage: '/parcels',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const parcels = this.landManager.getPlayerParcels(player.username)
                if (parcels.length === 0) {
                    player.chat('No parcels owned. Use /claim to claim one.')
                    return
                }
                player.chat(`=== Your Parcels (${parcels.length}) ===`)
                parcels.forEach((p: any, i: number) => {
                    player.chat(`${i + 1}. (${p.x}, ${p.z}) | Value: ${p.value} | Buildings: ${p.structures.length}`)
                })
            }
        })

        // /build
        serv.commands.add({
            base: 'build',
            info: 'Build a business on your parcel',
            usage: '/build <shop|farm|mine|factory|marketplace|tower>',
            onlyPlayer: true,
            parse: (str: string) => {
                if (!str) return false
                return str.trim().toLowerCase()
            },
            action: (businessType: string, ctx: any) => {
                const player = ctx.player
                const { x, z } = getParcel(player)

                // Auto-claim if not owned
                const parcel = this.landManager.getParcel(x, z)
                if (parcel && !parcel.owner) {
                    this.landManager.claimParcel(x, z, player.username)
                    player.chat(`Auto-claimed parcel (${x}, ${z})`)
                }

                const result = this.economy.buildBusiness(player.username, x, z, businessType)
                player.chat(result.message)
                if (result.success) {
                    this.placeBuildingBlocks(x, z, businessType, player.username)
                }
            }
        })

        // /businesses
        serv.commands.add({
            base: 'businesses',
            info: 'Show available business types',
            usage: '/businesses',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                player.chat('=== Available Businesses ===')
                BUSINESS_TEMPLATES.forEach(b => {
                    player.chat(`${b.type} - ${b.name} (${b.buildCost} coins, +${b.revenuePerTick}/tick)`)
                })
            }
        })

        // /upgrade
        serv.commands.add({
            base: 'upgrade',
            info: 'Upgrade a business on your parcel',
            usage: '/upgrade <number>',
            onlyPlayer: true,
            parse: (str: string) => {
                const num = parseInt(str)
                if (isNaN(num) || num < 1) return false
                return num - 1
            },
            action: (index: number, ctx: any) => {
                const player = ctx.player
                const { x, z } = getParcel(player)
                const result = this.economy.upgradeBusiness(player.username, x, z, index)
                player.chat(result.message)
            }
        })

        // /balance
        serv.commands.add({
            base: 'balance',
            aliases: ['bal'],
            info: 'Check your coin balance',
            usage: '/balance',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const account = this.economy.getOrCreateAccount(player.username)
                player.chat(`Balance: ${account.balance} coins | Income: +${account.income}/tick | Earned: ${account.totalEarned}`)
            }
        })

        // /leaderboard
        serv.commands.add({
            base: 'leaderboard',
            aliases: ['top'],
            info: 'View top players',
            usage: '/leaderboard',
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const lb = this.economy.getLeaderboard(10)
                if (player) {
                    player.chat('=== Leaderboard ===')
                    lb.forEach((a: any, i: number) => {
                        player.chat(`${i + 1}. ${a.name}: ${a.balance} coins`)
                    })
                }
            }
        })

        // /market
        serv.commands.add({
            base: 'market',
            info: 'View parcels for sale',
            usage: '/market',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const forSale = this.landManager.getParcelsForSale()
                if (forSale.length === 0) {
                    player.chat('No parcels for sale.')
                    return
                }
                player.chat('=== Market ===')
                forSale.slice(0, 10).forEach((p: any) => {
                    player.chat(`(${p.x}, ${p.z}) - ${p.salePrice} coins | Buildings: ${p.structures.length}`)
                })
            }
        })

        // /sell
        serv.commands.add({
            base: 'sell',
            info: 'List your parcel for sale',
            usage: '/sell <price>',
            onlyPlayer: true,
            parse: (str: string) => {
                const price = parseInt(str)
                if (isNaN(price) || price <= 0) return false
                return price
            },
            action: (price: number, ctx: any) => {
                const player = ctx.player
                const { x, z } = getParcel(player)
                const result = this.landManager.listForSale(x, z, player.username, price)
                player.chat(result.message)
            }
        })

        // /buy
        serv.commands.add({
            base: 'buy',
            info: 'Buy the parcel you are standing on',
            usage: '/buy',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const { x, z } = getParcel(player)
                const parcel = this.landManager.getParcel(x, z)
                if (!parcel) { player.chat('Parcel does not exist'); return }
                if (!parcel.forSale) { player.chat('Not for sale'); return }
                const account = this.economy.getOrCreateAccount(player.username)
                if (account.balance < parcel.salePrice) {
                    player.chat(`Need ${parcel.salePrice} coins, have ${account.balance}`)
                    return
                }
                const result = this.landManager.buyParcel(x, z, player.username)
                if (result.success && result.price) {
                    this.economy.deductFunds(player.username, result.price, `Bought parcel (${x},${z})`)
                    if (parcel.owner) {
                        this.economy.addFunds(parcel.owner, result.price, `Sold parcel (${x},${z})`)
                    }
                }
                player.chat(result.message)
            }
        })

        // /info
        serv.commands.add({
            base: 'info',
            info: 'World information',
            usage: '/info',
            onlyPlayer: true,
            action: (params: any, ctx: any) => {
                const player = ctx.player
                const land = this.landManager.getStats()
                const eco = this.economy.getStats()
                const grid = this.landManager.getGridInfo()
                player.chat('=== CubeCraft Arc Tycoon ===')
                player.chat(`Grid: ${grid.gridSize}x${grid.gridSize} (${grid.parcelSize}x${grid.parcelSize} per parcel)`)
                player.chat(`Land: ${land.claimed}/${land.total} claimed (${land.forSale} for sale)`)
                player.chat(`Players: ${eco.totalPlayers} | Economy: ${eco.totalBalance} coins`)
            }
        })

        // /tycoongive - give coins (admin)
        serv.commands.add({
            base: 'tycoongive',
            info: 'Give coins to a player (admin)',
            usage: '/tycoongive <player> <amount>',
            op: true,
            parse: (str: string) => {
                const parts = str.split(/\s+/)
                if (parts.length < 2) return false
                const amount = parseInt(parts[1])
                if (isNaN(amount)) return false
                return { player: parts[0], amount }
            },
            action: (args: any, ctx: any) => {
                this.economy.addFunds(args.player, args.amount, 'Admin give')
                if (ctx.player) ctx.player.chat(`Gave ${args.amount} coins to ${args.player}`)
            }
        })

        console.log('Tycoon commands registered')
    }

    /**
     * Handle player join
     */
    private onPlayerJoin(player: any): void {
        const playerName = player.username
        console.log(`Player joined: ${playerName}`)

        // Register player state
        this.players.set(playerName, {
            name: playerName,
            connected: true,
            connectedAt: Date.now(),
            lastActivity: Date.now(),
            currentParcel: null
        })

        // Register in economy
        const account = this.economy.registerPlayer(playerName)

        // Send welcome message
        this.sendChat(playerName, `=== Welcome to ${this.config.worldName}! ===`)
        this.sendChat(playerName, `Your starting balance: ${account.balance} coins`)
        this.sendChat(playerName, ` `)
        this.sendChat(playerName, `HOW TO PLAY:`)
        this.sendChat(playerName, `1. Walk around to find free land`)
        this.sendChat(playerName, `2. /claim - claim the parcel you're on`)
        this.sendChat(playerName, `3. /build shop - build a business (earns coins!)`)
        this.sendChat(playerName, `4. /businesses - see all building types`)
        this.sendChat(playerName, `5. /upgrade 1 - upgrade your business for more income`)
        this.sendChat(playerName, ` `)
        this.sendChat(playerName, `Economy: coins auto-collect every minute from your businesses`)
        this.sendChat(playerName, `Land: /parcels, /market, /sell <price>, /buy`)
        this.sendChat(playerName, `Type /help for all commands`)

        // Auto-claim starting parcel and build a starter shop
        setTimeout(() => {
            this.autoClaimStart(playerName)
        }, 3000)
    }

    /**
     * Auto-claim a starting parcel and build a starter shop
     */
    private autoClaimStart(playerName: string): void {
        // Find an unclaimed parcel near spawn
        let claimed = false
        for (let r = 0; r < 5 && !claimed; r++) {
            for (let dx = -r; dx <= r && !claimed; dx++) {
                for (let dz = -r; dz <= r && !claimed; dz++) {
                    if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue // only perimeter
                    const parcel = this.landManager.getParcel(dx, dz)
                    if (parcel && !parcel.owner) {
                        this.landManager.claimParcel(dx, dz, playerName)
                        this.sendChat(playerName, `Starter parcel claimed at (${dx}, ${dz})!`)
                        this.placeParcelMarkers(dx, dz, playerName)

                        // Build a free starter shop
                        const result = this.economy.buildBusiness(playerName, dx, dz, 'shop')
                        if (result.success) {
                            this.sendChat(playerName, `Free starter Shop built! It earns 2 coins/tick.`)
                            this.placeBuildingBlocks(dx, dz, 'shop', playerName)
                        }
                        claimed = true
                    }
                }
            }
        }
    }

    /**
     * Handle player quit
     */
    private onPlayerQuit(player: any): void {
        const playerName = player.username
        console.log(`Player quit: ${playerName}`)

        const state = this.players.get(playerName)
        if (state) {
            state.connected = false
        }
    }

    /**
     * Place corner markers for a claimed parcel
     */
    private placeParcelMarkers(parcelX: number, parcelZ: number, playerName: string): void {
        const serv = this.server
        if (!serv) return

        const player = Object.values(serv.players || {}).find((p: any) => p.username === playerName) as any
        if (!player?.world) return

        const Vec3 = require('vec3').Vec3
        const world = player.world
        const baseX = parcelX * 16
        const baseZ = parcelZ * 16
        const y = 64

        try {
            // Place corner markers (glowstone defaultState)
            const mcData = require('prismarine-registry')(serv.version)
            const glowstone = mcData.blocksByName.glowstone.defaultState
            const stoneSlab = mcData.blocksByName.stone_slab.defaultState + 8 // top variant
            const oakSign = mcData.blocksByName.oak_sign.defaultState

            const corners = [
                { x: baseX, z: baseZ },
                { x: baseX + 15, z: baseZ },
                { x: baseX, z: baseZ + 15 },
                { x: baseX + 15, z: baseZ + 15 },
            ]
            for (const c of corners) {
                serv.setBlock(world, new Vec3(c.x, y, c.z), glowstone)
                serv.setBlock(world, new Vec3(c.x, y + 1, c.z), stoneSlab)
            }

            // Place a sign at the entrance
            serv.setBlock(world, new Vec3(baseX + 8, y, baseZ), oakSign)

            console.log(`Placed parcel markers for ${playerName} at (${parcelX}, ${parcelZ})`)
        } catch (err) {
            console.warn(`Failed to place parcel markers: ${err}`)
        }
    }

    /**
     * Handle parcels command
     */
    private handleParcels(playerName: string): void {
        const parcels = this.landManager.getPlayerParcels(playerName)
        if (parcels.length === 0) {
            this.sendChat(playerName, 'You do not own any parcels. Use /claim to claim one.')
            return
        }
        this.sendChat(playerName, `=== Your Parcels (${parcels.length}) ===`)
        parcels.forEach((p, i) => {
            const structures = p.structures.length
            this.sendChat(playerName, `${i + 1}. Parcel (${p.x}, ${p.z}) | Value: ${p.value} | Structures: ${structures}`)
        })
    }

    /**
     * Handle build command
     */
    private handleBuild(playerName: string, args: string[]): void {
        if (args.length < 1) {
            this.sendChat(playerName, 'Usage: /build <type>. Use /businesses to see available types.')
            return
        }

        const businessType = args[0].toLowerCase()
        const state = this.players.get(playerName)

        // Auto-detect parcel from player position if available
        let x = 0, z = 0
        if (this.server?.players) {
            const player = Object.values(this.server.players).find((p: any) => p.username === playerName) as any
            if (player?.entity?.position) {
                const pos = player.entity.position
                x = Math.floor(pos.x / 16)
                z = Math.floor(pos.z / 16)
                if (state) state.currentParcel = { x, z }
            } else if (state?.currentParcel) {
                x = state.currentParcel.x
                z = state.currentParcel.z
            }
        } else if (state?.currentParcel) {
            x = state.currentParcel.x
            z = state.currentParcel.z
        }

        // Auto-claim if not owned
        const parcel = this.landManager.getParcel(x, z)
        if (parcel && !parcel.owner) {
            this.landManager.claimParcel(x, z, playerName)
            this.sendChat(playerName, `Auto-claimed parcel (${x}, ${z})`)
        }

        const result = this.economy.buildBusiness(playerName, x, z, businessType)
        this.sendChat(playerName, result.message)

        // Place blocks in the world if build succeeded
        if (result.success) {
            this.placeBuildingBlocks(x, z, businessType, playerName)
        }
    }

    /**
     * Place actual Minecraft blocks for a business building
     */
    private placeBuildingBlocks(parcelX: number, parcelZ: number, businessType: string, playerName: string): void {
        const serv = this.server
        if (!serv) return

        const player = Object.values(serv.players || {}).find((p: any) => p.username === playerName) as any
        if (!player?.world) return

        const Vec3 = require('vec3').Vec3
        const mcData = require('prismarine-registry')(serv.version)
        const world = player.world

        // Building templates using block names
        const baseX = parcelX * 16 + 2
        const baseZ = parcelZ * 16 + 2
        const baseY = 64

        const buildings: Record<string, { w: number; d: number; h: number; wall: string; floor: string; roof: string }> = {
            shop:        { w: 5, d: 5, h: 4, wall: 'oak_planks',      floor: 'oak_planks',    roof: 'oak_planks' },
            farm:        { w: 7, d: 7, h: 3, wall: 'dirt',            floor: 'farmland',      roof: 'grass_block' },
            mine:        { w: 5, d: 5, h: 5, wall: 'cobblestone',     floor: 'cobblestone',   roof: 'cobblestone' },
            factory:     { w: 7, d: 5, h: 5, wall: 'iron_block',      floor: 'iron_block',    roof: 'iron_block' },
            marketplace: { w: 9, d: 7, h: 5, wall: 'oak_planks',      floor: 'oak_planks',    roof: 'spruce_planks' },
            tower:       { w: 5, d: 5, h:10, wall: 'stone_bricks',    floor: 'stone_bricks',  roof: 'quartz_block' },
        }

        const b = buildings[businessType] || buildings.shop
        const getBlock = (name: string) => {
            const block = mcData.blocksByName[name]
            return block ? block.defaultState : 0
        }

        const wallId = getBlock(b.wall)
        const floorId = getBlock(b.floor)
        const roofId = getBlock(b.roof)
        const airId = 0
        const glowstoneId = getBlock('glowstone')
        const doorId = getBlock('oak_door')

        try {
            // Floor
            for (let dx = 0; dx < b.w; dx++) {
                for (let dz = 0; dz < b.d; dz++) {
                    serv.setBlock(world, new Vec3(baseX + dx, baseY, baseZ + dz), floorId)
                }
            }

            // Walls
            for (let dy = 1; dy < b.h; dy++) {
                for (let dx = 0; dx < b.w; dx++) {
                    serv.setBlock(world, new Vec3(baseX + dx, baseY + dy, baseZ), wallId)
                    serv.setBlock(world, new Vec3(baseX + dx, baseY + dy, baseZ + b.d - 1), wallId)
                }
                for (let dz = 0; dz < b.d; dz++) {
                    serv.setBlock(world, new Vec3(baseX, baseY + dy, baseZ + dz), wallId)
                    serv.setBlock(world, new Vec3(baseX + b.w - 1, baseY + dy, baseZ + dz), wallId)
                }
            }

            // Roof
            for (let dx = 0; dx < b.w; dx++) {
                for (let dz = 0; dz < b.d; dz++) {
                    serv.setBlock(world, new Vec3(baseX + dx, baseY + b.h, baseZ + dz), roofId)
                }
            }

            // Door (clear front wall center)
            const doorX = baseX + Math.floor(b.w / 2)
            serv.setBlock(world, new Vec3(doorX, baseY + 1, baseZ), airId)
            serv.setBlock(world, new Vec3(doorX, baseY + 2, baseZ), airId)

            // Interior: clear inside
            for (let dy = 1; dy < b.h; dy++) {
                for (let dx = 1; dx < b.w - 1; dx++) {
                    for (let dz = 1; dz < b.d - 1; dz++) {
                        serv.setBlock(world, new Vec3(baseX + dx, baseY + dy, baseZ + dz), airId)
                    }
                }
            }

            // Interior lighting (glowstone in center ceiling)
            serv.setBlock(world, new Vec3(baseX + Math.floor(b.w / 2), baseY + b.h - 1, baseZ + Math.floor(b.d / 2)), glowstoneId)

            // Force chunk update for all nearby players
            const chunkX = Math.floor(baseX / 16)
            const chunkZ = Math.floor(baseZ / 16)
            for (let cx = chunkX - 1; cx <= chunkX + 1; cx++) {
                for (let cz = chunkZ - 1; cz <= chunkZ + 1; cz++) {
                    world.getColumn(cx, cz).then((column: any) => {
                        player.sendChunk(cx, cz, column)
                    }).catch(() => {})
                }
            }

            console.log(`Placed ${businessType} building at (${baseX}, ${baseY}, ${baseZ}) for ${playerName}`)
        } catch (err) {
            console.warn(`Failed to place building blocks: ${err}`)
        }
    }

    /**
     * Send business list
     */
    private sendBusinessList(playerName: string): void {
        this.sendChat(playerName, '=== Available Businesses ===')
        BUSINESS_TEMPLATES.forEach(b => {
            this.sendChat(playerName, `${b.type} - ${b.name} (${b.buildCost} coins, ${b.revenuePerTick}/tick)`)
        })
    }

    /**
     * Handle upgrade command
     */
    private handleUpgrade(playerName: string, args: string[]): void {
        if (args.length < 1) {
            this.sendChat(playerName, 'Usage: /upgrade <structure-index>')
            return
        }

        const index = parseInt(args[0]) - 1
        const state = this.players.get(playerName)
        const { x, z } = state?.currentParcel || { x: 0, z: 0 }

        const result = this.economy.upgradeBusiness(playerName, x, z, index)
        this.sendChat(playerName, result.message)
    }

    /**
     * Send leaderboard
     */
    private sendLeaderboard(playerName: string): void {
        const leaderboard = this.economy.getLeaderboard(10)
        this.sendChat(playerName, '=== Leaderboard ===')
        leaderboard.forEach((account, i) => {
            this.sendChat(playerName, `${i + 1}. ${account.name}: ${account.balance} coins`)
        })
    }

    /**
     * Handle sell command
     */
    private handleSell(playerName: string, args: string[]): void {
        if (args.length < 1) {
            this.sendChat(playerName, 'Usage: /sell <price>')
            return
        }

        const price = parseInt(args[0])
        if (isNaN(price) || price <= 0) {
            this.sendChat(playerName, 'Invalid price. Must be a positive number.')
            return
        }

        const state = this.players.get(playerName)
        const { x, z } = state?.currentParcel || { x: 0, z: 0 }

        const result = this.landManager.listForSale(x, z, playerName, price)
        this.sendChat(playerName, result.message)
    }

    /**
     * Handle buy command
     */
    private handleBuy(playerName: string): void {
        const state = this.players.get(playerName)
        const { x, z } = state?.currentParcel || { x: 0, z: 0 }

        const parcel = this.landManager.getParcel(x, z)
        if (!parcel) {
            this.sendChat(playerName, 'Parcel does not exist')
            return
        }
        if (!parcel.forSale) {
            this.sendChat(playerName, 'This parcel is not for sale')
            return
        }

        const account = this.economy.getOrCreateAccount(playerName)
        if (account.balance < parcel.salePrice) {
            this.sendChat(playerName, `Insufficient funds. Need ${parcel.salePrice}, have ${account.balance}`)
            return
        }

        const result = this.landManager.buyParcel(x, z, playerName)
        if (result.success && result.price) {
            this.economy.deductFunds(playerName, result.price, `Bought parcel (${x}, ${z})`)
            if (parcel.owner) {
                this.economy.addFunds(parcel.owner, result.price, `Sold parcel (${x}, ${z})`)
            }
        }
        this.sendChat(playerName, result.message)
    }

    /**
     * Send market info
     */
    private sendMarket(playerName: string): void {
        const forSale = this.landManager.getParcelsForSale()
        if (forSale.length === 0) {
            this.sendChat(playerName, 'No parcels currently for sale.')
            return
        }
        this.sendChat(playerName, '=== Market - Parcels For Sale ===')
        forSale.slice(0, 10).forEach(p => {
            this.sendChat(playerName, `Parcel (${p.x}, ${p.z}) - ${p.salePrice} coins | Structures: ${p.structures.length}`)
        })
    }

    /**
     * Handle release command
     */
    private handleRelease(playerName: string): void {
        const state = this.players.get(playerName)
        const { x, z } = state?.currentParcel || { x: 0, z: 0 }
        const result = this.landManager.releaseParcel(x, z, playerName)
        this.sendChat(playerName, result.message)
    }

    /**
     * Handle transfer command
     */
    private handleTransfer(playerName: string, args: string[]): void {
        if (args.length < 2) {
            this.sendChat(playerName, 'Usage: /transfer <player> <amount>')
            return
        }

        const targetPlayer = args[0]
        const amount = parseInt(args[1])
        if (isNaN(amount) || amount <= 0) {
            this.sendChat(playerName, 'Invalid amount.')
            return
        }

        const result = this.economy.transfer(playerName, targetPlayer, amount)
        this.sendChat(playerName, result.message)
        if (result.success) {
            this.sendChat(targetPlayer, `${playerName} sent you ${amount} coins!`)
        }
    }

    /**
     * Send world info
     */
    private sendWorldInfo(playerName: string): void {
        const landStats = this.landManager.getStats()
        const economyStats = this.economy.getStats()
        const gridInfo = this.landManager.getGridInfo()

        this.sendChat(playerName, '=== World Information ===')
        this.sendChat(playerName, `World: ${this.config.worldName}`)
        this.sendChat(playerName, `Grid: ${gridInfo.gridSize}x${gridInfo.gridSize} (${gridInfo.parcelSize}x${gridInfo.parcelSize} per parcel)`)
        this.sendChat(playerName, `Land: ${landStats.claimed}/${landStats.total} claimed (${landStats.forSale} for sale)`)
        this.sendChat(playerName, `Players: ${economyStats.totalPlayers} | Total economy: ${economyStats.totalBalance} coins`)
    }

    /**
     * Send a chat message to a specific player
     */
    private sendChat(playerName: string, message: string): void {
        if (this.server?.players) {
            const player = Object.values(this.server.players).find((p: any) => p.username === playerName) as any
            if (player) {
                player.chat(message)
                return
            }
        }
        console.log(`[Chat -> ${playerName}] ${message}`)
    }

    /**
     * Broadcast a chat message to all players
     */
    private broadcastChat(message: string): void {
        if (this.server?.players) {
            for (const player of Object.values(this.server.players) as any[]) {
                player.chat(message)
            }
        }
        console.log(`[Broadcast] ${message}`)
    }

    /**
     * Get connected player count
     */
    getPlayerCount(): number {
        let count = 0
        for (const state of this.players.values()) {
            if (state.connected) count++
        }
        return count
    }

    /**
     * Get chat history
     */
    getChatHistory(limit: number = 50): Array<{ player: string; message: string; timestamp: number }> {
        return this.chatHistory.slice(-limit)
    }

    /**
     * Get world state snapshot
     */
    getState(): {
        config: GameWorldConfig
        players: number
        landStats: ReturnType<LandManager['getStats']>
        economyStats: ReturnType<EconomyEngine['getStats']>
    } {
        return {
            config: this.config,
            players: this.getPlayerCount(),
            landStats: this.landManager.getStats(),
            economyStats: this.economy.getStats()
        }
    }

    /**
     * Stop the game world
     */
    async stop(): Promise<void> {
        this.economy.stop()
        if (this.server?.quit) {
            await this.server.quit()
        }
        console.log('Game world stopped')
    }
}
