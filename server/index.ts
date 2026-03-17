import { WebSocketServer } from 'ws'
import { setupWSConnection } from 'y-websocket/bin/utils'

const PORT = Number(process.env.WS_PORT) || 1234

const wss = new WebSocketServer({ port: PORT })

wss.on('connection', (ws, req) => {
  setupWSConnection(ws, req)
})

wss.on('listening', () => {
  console.log(`[y-websocket] server running on port ${PORT}`)
})
