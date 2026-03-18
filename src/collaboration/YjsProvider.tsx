'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import * as Y from 'yjs'
import { IndexeddbPersistence } from 'y-indexeddb'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { SupabaseProvider } from './SupabaseProvider'
import { useAuth } from '@/contexts/AuthContext'
import { getUserColor } from '@/utils/colors'

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

interface YjsContextValue {
  ydoc: Y.Doc
  yElements: Y.Map<Y.Map<unknown>>
  yOrder: Y.Array<string>
  yMetadata: Y.Map<unknown>
  provider: SupabaseProvider | null
  awareness: any | null
  connectionStatus: ConnectionStatus
  userId: string
  userName: string
  userColor: string
}

const YjsContext = createContext<YjsContextValue | null>(null)

interface YjsProviderProps {
  roomId: string
  children: ReactNode
}

let supabaseClient: SupabaseClient | null = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    console.error('Supabase URL or Key is missing. Collaboration will not work.');
  }
  supabaseClient = createClient(url || 'https://placeholder.supabase.co', key || 'placeholder');
  return supabaseClient;
}

export function YjsProviderComponent({ roomId, children }: YjsProviderProps) {
  const { user, token } = useAuth()
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const ydocRef = useRef<Y.Doc | null>(null)
  const providerRef = useRef<SupabaseProvider | null>(null)
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

    // Supabase Realtime Provider
    const supabase = getSupabase()
    const provider = new SupabaseProvider(ydoc, supabase, {
      channel: `room:${roomId}`,
      roomId: roomId
    })
    providerRef.current = provider

    // Set awareness local state with authenticated user info
    provider.awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
    })

    // Connection status tracking
    const updateStatus = (statusInfo: any) => {
      if (statusInfo && statusInfo[0] && statusInfo[0].status) {
        setConnectionStatus(statusInfo[0].status as ConnectionStatus)
      } else if (provider.connected) {
        setConnectionStatus('connected')
      }
      // Don't set 'disconnected' on initial null call — let it stay 'connecting'
    }

    provider.on('status', updateStatus)

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
  }, [roomId, token, userId, userName, userColor])

  if (!ready || !ydocRef.current) return null

  const ydoc = ydocRef.current
  const value: YjsContextValue = {
    ydoc,
    yElements: ydoc.getMap('elements') as Y.Map<Y.Map<unknown>>,
    yOrder: ydoc.getArray('elementOrder'),
    yMetadata: ydoc.getMap('metadata'),
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
