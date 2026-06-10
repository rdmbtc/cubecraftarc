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

        this.server.on('playerChat', (player: any, message: string) => {
            this.onPlayerChat(player, message)
        })

        this.server.on('playerQuit', (player: any) => {
            this.onPlayerQuit(player)
        })
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
        this.sendChat(playerName, `Welcome to ${this.config.worldName}!`)
        this.sendChat(playerName, `Your starting balance: ${account.balance} coins`)
        this.sendChat(playerName, `Type /help for commands`)
    }

    /**
     * Handle player chat
     */
    private onPlayerChat(player: any, message: string): void {
        const playerName = player.username
        console.log(`[Chat] ${playerName}: ${message}`)

        // Store in chat history
        this.chatHistory.push({
            player: playerName,
            message,
            timestamp: Date.now()
        })
        if (this.chatHistory.length > this.maxChatHistory) {
            this.chatHistory.shift()
        }

        // Handle commands
        if (message.startsWith('/')) {
            this.handleCommand(playerName, message)
            return
        }

        // Broadcast regular chat
        this.broadcastChat(`<${playerName}> ${message}`)
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
     * Handle player commands
     */
    private handleCommand(playerName: string, message: string): void {
        const parts = message.trim().split(/\s+/)
        const command = parts[0].toLowerCase()
        const args = parts.slice(1)

        switch (command) {
            case '/help':
                this.sendHelp(playerName)
                break
            case '/balance':
            case '/bal':
                this.sendBalance(playerName)
                break
            case '/claim':
                this.handleClaim(playerName)
                break
            case '/parcels':
                this.handleParcels(playerName)
                break
            case '/build':
                this.handleBuild(playerName, args)
                break
            case '/businesses':
                this.sendBusinessList(playerName)
                break
            case '/upgrade':
                this.handleUpgrade(playerName, args)
                break
            case '/leaderboard':
            case '/top':
                this.sendLeaderboard(playerName)
                break
            case '/sell':
                this.handleSell(playerName, args)
                break
            case '/buy':
                this.handleBuy(playerName, args)
                break
            case '/market':
                this.sendMarket(playerName)
                break
            case '/release':
                this.handleRelease(playerName)
                break
            case '/transfer':
                this.handleTransfer(playerName, args)
                break
            case '/info':
                this.sendWorldInfo(playerName)
                break
            default:
                this.sendChat(playerName, `Unknown command: ${command}. Type /help for available commands.`)
        }
    }

    /**
     * Send help message
     */
    private sendHelp(playerName: string): void {
        const help = [
            '=== CubeCraft Arc Tycoon Commands ===',
            '/help - Show this help message',
            '/balance - Check your balance',
            '/claim - Claim the parcel you are standing on',
            '/parcels - List your owned parcels',
            '/build <type> - Build a business on current parcel',
            '/businesses - List available business types',
            '/upgrade <index> - Upgrade a structure on current parcel',
            '/sell <price> - List current parcel for sale',
            '/buy - Buy the parcel you are standing on',
            '/market - View parcels for sale',
            '/release - Release current parcel',
            '/transfer <player> <amount> - Transfer coins to another player',
            '/leaderboard - View top players',
            '/info - View world information'
        ]
        help.forEach(line => this.sendChat(playerName, line))
    }

    /**
     * Send balance info
     */
    private sendBalance(playerName: string): void {
        const account = this.economy.getOrCreateAccount(playerName)
        this.sendChat(playerName, `Balance: ${account.balance} coins | Income: ${account.income}/tick | Total earned: ${account.totalEarned}`)
    }

    /**
     * Handle claim command
     */
    private handleClaim(playerName: string): void {
        const state = this.players.get(playerName)
        if (!state?.currentParcel) {
            // Default to origin parcel for demo
            state && (state.currentParcel = { x: 0, z: 0 })
        }

        const { x, z } = state?.currentParcel || { x: 0, z: 0 }
        const result = this.landManager.claimParcel(x, z, playerName)
        this.sendChat(playerName, result.message)
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
        const { x, z } = state?.currentParcel || { x: 0, z: 0 }

        const result = this.economy.buildBusiness(playerName, x, z, businessType)
        this.sendChat(playerName, result.message)
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
