/**
 * WebSocket → Minecraft Protocol Proxy
 * Bridges browser WebSocket connections to the local MC server
 */

import { WebSocketServer, WebSocket as WS } from 'ws'
import net from 'net'

const MC_HOST = '127.0.0.1'
const MC_PORT = parseInt(process.env.MC_PORT || '25565')
const WS_PROXY_PORT = parseInt(process.env.WS_PROXY_PORT || '25568')

export function startWsProxy(port = WS_PROXY_PORT): void {
    const wss = new WebSocketServer({ port })

    wss.on('connection', (ws: WS, req) => {
        const clientAddr = req.socket.remoteAddress
        console.log(`[WSProxy] Browser connected from ${clientAddr}`)

        // Connect to the local Minecraft server
        const mcSocket = net.createConnection({ host: MC_HOST, port: MC_PORT }, () => {
            console.log(`[WSProxy] TCP→MC connected`)
        })

        let bytesUp = 0
        let bytesDown = 0

        // Browser → MC server
        ws.on('message', (data: Buffer) => {
            const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as any)
            bytesUp += buf.length
            if (mcSocket.writable) mcSocket.write(buf)
        })

        // MC server → Browser
        mcSocket.on('data', (data: Buffer) => {
            bytesDown += data.length
            if (ws.readyState === WS.OPEN) ws.send(data)
        })

        ws.on('close', (code) => {
            console.log(`[WSProxy] Browser disconnected (code: ${code}) up=${bytesUp} down=${bytesDown}`)
            mcSocket.destroy()
        })

        mcSocket.on('close', () => {
            if (ws.readyState === WS.OPEN) ws.close()
        })

        mcSocket.on('error', (err) => {
            console.error(`[WSProxy] MC error:`, err.message)
            if (ws.readyState === WS.OPEN) ws.close()
        })

        ws.on('error', (err) => {
            console.error(`[WSProxy] WS error:`, err.message)
            mcSocket.destroy()
        })
    })

    console.log(`[WSProxy] WebSocket→MC proxy on port ${port}`)
}

if (require.main === module) {
    startWsProxy()
}
