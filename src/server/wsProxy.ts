/**
 * WebSocket → Minecraft Protocol Proxy
 * Allows web browsers to connect to the Minecraft server via WebSocket
 */

import { WebSocketServer, WebSocket as WS } from 'ws'
import net from 'net'

const MC_HOST = '127.0.0.1'
const MC_PORT = parseInt(process.env.MC_PORT || '25565')
const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '25568')

export function startWsProxy(port = WS_PROXY_PORT): void {
    const wss = new WebSocketServer({ port })

    wss.on('connection', (ws: WS) => {
        console.log(`[WSProxy] Browser connected`)

        // Connect to the local Minecraft server
        const mcSocket = net.createConnection({ host: MC_HOST, port: MC_PORT }, () => {
            console.log(`[WSProxy] Connected to MC server on port ${MC_PORT}`)
        })

        // Browser → MC server
        ws.on('message', (data: Buffer) => {
            if (mcSocket.writable) {
                mcSocket.write(data)
            }
        })

        // MC server → Browser
        mcSocket.on('data', (data: Buffer) => {
            if (ws.readyState === WS.OPEN) {
                ws.send(data)
            }
        })

        // Cleanup on disconnect
        ws.on('close', () => {
            console.log(`[WSProxy] Browser disconnected`)
            mcSocket.destroy()
        })

        mcSocket.on('close', () => {
            console.log(`[WSProxy] MC connection closed`)
            if (ws.readyState === WS.OPEN) {
                ws.close()
            }
        })

        mcSocket.on('error', (err) => {
            console.error(`[WSProxy] MC socket error:`, err.message)
            if (ws.readyState === WS.OPEN) {
                ws.close()
            }
        })

        ws.on('error', (err) => {
            console.error(`[WSProxy] WS error:`, err.message)
            mcSocket.destroy()
        })
    })

    console.log(`[WSProxy] WebSocket→MC proxy listening on port ${port}`)
    console.log(`[WSProxy] Web clients should connect to: ws://<host>:${port}`)
}

// Run standalone if executed directly
if (require.main === module) {
    startWsProxy()
}
