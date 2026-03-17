'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'
import { IndexeddbPersistence } from 'y-indexeddb'
import { useAuth } from '@/contexts/AuthContext'
import { getUserColor } from '@/utils/colors'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface YjsContextValue {
  ydoc: Y.Doc
  yElements: Y.Map<Y.Map<unknown>>
  yOrder: Y.Array<string>
  provider: WebsocketProvider | null
  awareness: WebsocketProvider['awareness'] | null
  connectionStatus: ConnectionStatus
  userId: string
  userName: string
  userColor: string
}

const YjsContext = createContext<YjsContextValue | null>(null)

interface YjsProviderProps {
  roomId: string
  children: ReactNode
  wsUrl?: string
}

export function YjsProviderComponent({ roomId, children, wsUrl }: YjsProviderProps) {
  const { user, token } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<WebsocketProvider | null>(null)
  const persistenceRef = useRef<IndexeddbPersistence | null>(null)
  const [ready, setReady] = useState(false)

  const userId = user?.id || 'anonymous'
  const userName = user?.username || 'Anonymous'
  const userColorIndex = Math.abs(userId.charCodeAt(0) + userId.charCodeAt(1)) % 8
  const userColor = getUserColor(userColorIndex)

  useEffect(() => {
    if (!token) return

    const ydoc = new Y.Doc()
    ydocRef.current = ydoc

    // IndexedDB persistence for offline support
    const persistence = new IndexeddbPersistence(`sync-canvas-${roomId}`, ydoc)
    persistenceRef.current = persistence

    // WebSocket provider with auth token
    const serverUrl = wsUrl || process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:1234'
    const provider = new WebsocketProvider(serverUrl, roomId, ydoc, {
      connect: true,
      params: { token },
    })
    providerRef.current = provider

    // Set awareness local state with authenticated user info
    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
    })

    // Connection status tracking
    provider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') {
        setConnectionStatus('connected')
      } else if (status === 'disconnected') {
        setConnectionStatus('disconnected')
      } else {
        setConnectionStatus('connecting')
      }
    })

    provider.on('sync', (synced: boolean) => {
      if (synced) setConnectionStatus('connected')
    })

    provider.on('connection-close', () => {
      setConnectionStatus('disconnected')
    })

    setReady(true)

    return () => {
      provider.destroy()
      persistence.destroy()
      ydoc.destroy()
      ydocRef.current = null
      providerRef.current = null
      persistenceRef.current = null
      setReady(false)
    }
  }, [roomId, wsUrl, token, userId, userName, userColor])

  if (!ready || !ydocRef.current) return null

  const ydoc = ydocRef.current
  const value: YjsContextValue = {
    ydoc,
    yElements: ydoc.getMap('elements') as Y.Map<Y.Map<unknown>>,
    yOrder: ydoc.getArray('elementOrder'),
    provider: providerRef.current,
    awareness: providerRef.current?.awareness || null,
    connectionStatus,
    userId,
    userName,
    userColor,
  }

  return <YjsContext.Provider value={value}>{children}</YjsContext.Provider>
}

export function useYjs(): YjsContextValue {
  const ctx = useContext(YjsContext)
  if (!ctx) throw new Error('useYjs must be used within YjsProvider')
  return ctx
}
