require('dotenv').config()

const http = require('http')
const url = require('url')
const { WebSocketServer, WebSocket } = require('ws')
const Y = require('yjs')
const syncProtocol = require('y-protocols/dist/sync.cjs')
const awarenessProtocol = require('y-protocols/dist/awareness.cjs')
const encoding = require('lib0/dist/encoding.cjs')
const decoding = require('lib0/dist/decoding.cjs')
const jwt = require('jsonwebtoken')

const PORT = Number(process.env.WS_PORT) || 1234
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key'

const MSG_SYNC = 0
const MSG_AWARENESS = 1

const rooms = new Map()

function getRoom(roomName) {
  if (rooms.has(roomName)) return rooms.get(roomName)

  const doc = new Y.Doc()
  const awareness = new awarenessProtocol.Awareness(doc)
  const conns = new Map() // ws -> Set of controlled clientIDs

  const room = { doc, awareness, conns, name: roomName }
  rooms.set(roomName, room)

  // Broadcast awareness changes to all clients — once per room
  awareness.on('update', ({ added, updated, removed }, origin) => {
    const changedClients = added.concat(updated, removed)
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MSG_AWARENESS)
    encoding.writeVarUint8Array(
      encoder,
      awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
    )
    const msg = encoding.toUint8Array(encoder)
    room.conns.forEach((_, conn) => {
      if (conn.readyState === WebSocket.OPEN) {
        conn.send(msg)
      }
    })

    // Track which clientIDs belong to which connection (origin = ws)
    if (origin !== null && room.conns.has(origin)) {
      const controlledIds = room.conns.get(origin)
      added.forEach((id) => controlledIds.add(id))
      removed.forEach((id) => controlledIds.delete(id))
    }
  })

  // Broadcast doc updates to all other clients — once per room
  doc.on('update', (update, origin) => {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MSG_SYNC)
    syncProtocol.writeUpdate(encoder, update)
    const msg = encoding.toUint8Array(encoder)
    room.conns.forEach((_, conn) => {
      if (conn !== origin && conn.readyState === WebSocket.OPEN) {
        conn.send(msg)
      }
    })
  })

  return room
}

function handleConnection(ws, roomName) {
  const room = getRoom(roomName)
  const controlledIds = new Set()
  room.conns.set(ws, controlledIds)

  // Send sync step 1
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MSG_SYNC)
    syncProtocol.writeSyncStep1(encoder, room.doc)
    ws.send(encoding.toUint8Array(encoder))
  }

  // Send sync step 2 (full doc state)
  {
    const encoder = encoding.createEncoder()
    encoding.writeVarUint(encoder, MSG_SYNC)
    syncProtocol.writeSyncStep2(encoder, room.doc)
    ws.send(encoding.toUint8Array(encoder))
  }

  // Send current awareness states
  {
    const states = room.awareness.getStates()
    if (states.size > 0) {
      const encoder = encoding.createEncoder()
      encoding.writeVarUint(encoder, MSG_AWARENESS)
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(room.awareness, Array.from(states.keys()))
      )
      ws.send(encoding.toUint8Array(encoder))
    }
  }

  ws.on('message', (data) => {
    try {
      const msg = new Uint8Array(data)
      const decoder = decoding.createDecoder(msg)
      const msgType = decoding.readVarUint(decoder)

      switch (msgType) {
        case MSG_SYNC: {
          const encoder = encoding.createEncoder()
          encoding.writeVarUint(encoder, MSG_SYNC)
          syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws)

          // If we have a response, send it back
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder))
          }
          break
        }
        case MSG_AWARENESS: {
          const update = decoding.readVarUint8Array(decoder)
          awarenessProtocol.applyAwarenessUpdate(room.awareness, update, ws)
          break
        }
      }
    } catch (err) {
      console.error('[ws] message error:', err.message)
    }
  })

  ws.on('close', () => {
    const controlledIds = room.conns.get(ws)
    room.conns.delete(ws)

    // Remove awareness states for this connection's clients
    if (controlledIds && controlledIds.size > 0) {
      awarenessProtocol.removeAwarenessStates(room.awareness, Array.from(controlledIds), null)
    }

    if (room.conns.size === 0) {
      // Clean up empty rooms after a delay to allow reconnects
      setTimeout(() => {
        if (room.conns.size === 0) {
          room.awareness.destroy()
          room.doc.destroy()
          rooms.delete(roomName)
          console.log(`[ws] room destroyed: ${roomName}`)
        }
      }, 30000)
    }
    console.log(`[ws] client disconnected from room: ${roomName} (${room.conns.size} remaining)`)
  })
}

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({
    status: 'ok',
    rooms: rooms.size,
    connections: Array.from(rooms.values()).reduce((sum, r) => sum + r.conns.size, 0),
  }))
})

const wss = new WebSocketServer({ server })

wss.on('connection', (ws, req) => {
  // Parse URL to extract room name and token
  const parsed = url.parse(req.url || '', true)
  const pathname = parsed.pathname || '/'
  const roomName = pathname.slice(1) || 'default'
  const token = parsed.query.token

  // Verify JWT token
  if (!token) {
    console.log(`[ws] rejected: no token provided for room ${roomName}`)
    ws.close(4001, 'Authentication required')
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    console.log(`[ws] ${payload.username} connected to room: ${roomName}`)
    handleConnection(ws, roomName)
  } catch (err) {
    console.log(`[ws] rejected: invalid token for room ${roomName}`)
    ws.close(4001, 'Invalid token')
  }
})

server.listen(PORT, () => {
  console.log(`[y-websocket] server running on port ${PORT}`)
})
