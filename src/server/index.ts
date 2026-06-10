/**
 * CubeCraft Arc Tycoon - Game Server Entry Point
 * Runs the Minecraft protocol server and WebSocket management API
 */

import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import http from 'http'
import { GameWorld } from './world'
import { BUSINESS_TEMPLATES } from './economy'

const MC_PORT = parseInt(process.env.MC_PORT || '25565')
const WS_PORT = parseInt(process.env.WS_PORT || '25566')
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '25567')

async function main() {
    console.log('========================================')
    console.log('  CubeCraft Arc Tycoon - Game Server')
    console.log('========================================')
    console.log()

    // Create the game world
    const world = new GameWorld({
        worldName: 'CubeCraft Arc Tycoon',
        maxPlayers: 50,
        port: MC_PORT,
        gameMode: 'creative',
        enablePvP: false
    })

    // Start the game world (flying-squid Minecraft server)
    await world.start()

    // Create HTTP API server
    const app = express()
    app.use(express.json())

    // Health check endpoint
    app.get('/health', (_req, res) => {
        res.json({ status: 'ok', timestamp: Date.now() })
    })

    // World state endpoint
    app.get('/api/world', (_req, res) => {
        res.json(world.getState())
    })

    // Player account endpoint
    app.get('/api/player/:name', (req, res) => {
        const account = world.economy.getAccount(req.params.name)
        if (!account) {
            res.status(404).json({ error: 'Player not found' })
            return
        }
        res.json(account)
    })

    // Leaderboard endpoint
    app.get('/api/leaderboard', (_req, res) => {
        const limit = parseInt(req.query.limit as string) || 10
        res.json(world.economy.getLeaderboard(limit))
    })

    // Business templates endpoint
    app.get('/api/businesses', (_req, res) => {
        res.json(BUSINESS_TEMPLATES)
    })

    // Land parcels endpoint
    app.get('/api/land/parcels', (_req, res) => {
        res.json(world.landManager.getStats())
    })

    // Parcels for sale endpoint
    app.get('/api/land/market', (_req, res) => {
        res.json(world.landManager.getParcelsForSale())
    })

    // Player parcels endpoint
    app.get('/api/land/player/:name', (req, res) => {
        res.json(world.landManager.getPlayerParcels(req.params.name))
    })

    // Chat history endpoint
    app.get('/api/chat', (_req, res) => {
        const limit = parseInt(req.query.limit as string) || 50
        res.json(world.getChatHistory(limit))
    })

    // Economy stats endpoint
    app.get('/api/economy', (_req, res) => {
        res.json(world.economy.getStats())
    })

    // Start HTTP API server
    const httpServer = http.createServer(app)
    httpServer.listen(HTTP_PORT, () => {
        console.log(`HTTP API server listening on port ${HTTP_PORT}`)
    })

    // Create WebSocket server for real-time updates
    const wss = new WebSocketServer({ port: WS_PORT })

    const clients = new Set<WebSocket>()

    wss.on('connection', (ws: WebSocket) => {
        clients.add(ws)
        console.log(`WebSocket client connected. Total: ${clients.size}`)

        // Send initial state
        ws.send(JSON.stringify({
            type: 'init',
            data: world.getState()
        }))

        ws.on('message', (data: Buffer) => {
            try {
                const message = JSON.parse(data.toString())
                handleWsMessage(ws, message)
            } catch (err) {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' }))
            }
        })

        ws.on('close', () => {
            clients.delete(ws)
            console.log(`WebSocket client disconnected. Total: ${clients.size}`)
        })
    })

    function handleWsMessage(ws: WebSocket, message: any): void {
        switch (message.type) {
            case 'getState':
                ws.send(JSON.stringify({ type: 'state', data: world.getState() }))
                break
            case 'getLeaderboard':
                ws.send(JSON.stringify({ type: 'leaderboard', data: world.economy.getLeaderboard(message.limit || 10) }))
                break
            case 'getParcels':
                ws.send(JSON.stringify({ type: 'parcels', data: world.landManager.getParcelsForSale() }))
                break
            case 'getPlayerParcels':
                ws.send(JSON.stringify({ type: 'playerParcels', data: world.landManager.getPlayerParcels(message.player) }))
                break
            case 'getAccount':
                const account = world.economy.getAccount(message.player)
                ws.send(JSON.stringify({ type: 'account', data: account || null }))
                break
            default:
                ws.send(JSON.stringify({ type: 'error', message: `Unknown message type: ${message.type}` }))
        }
    }

    console.log(`WebSocket server listening on port ${WS_PORT}`)
    console.log()
    console.log('=== Server Ready ===')
    console.log(`Minecraft Protocol: port ${MC_PORT}`)
    console.log(`WebSocket API: ws://localhost:${WS_PORT}`)
    console.log(`HTTP REST API: http://localhost:${HTTP_PORT}`)
    console.log()

    // Graceful shutdown
    const shutdown = async () => {
        console.log('Shutting down...')
        await world.stop()
        wss.close()
        httpServer.close()
        process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
}

main().catch(err => {
    console.error('Failed to start server:', err)
    process.exit(1)
})
