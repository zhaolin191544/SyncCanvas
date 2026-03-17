'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useYjs } from './YjsProvider'

export interface RemoteUser {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  selection?: string[]
}

export function useAwareness() {
  const { awareness, userId } = useYjs()
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const throttleRef = useRef<number>(0)

  useEffect(() => {
    if (!awareness) return

    const updateRemoteUsers = () => {
      const states = awareness.getStates()
      // Deduplicate by user.id to prevent refresh from adding duplicate users
      const userMap = new Map<string, RemoteUser>()

      states.forEach((state, clientId) => {
        if (clientId === awareness.clientID) return
        if (!state.user?.id) return
        // If duplicate user.id, keep the one with cursor data (more recent)
        const existing = userMap.get(state.user.id)
        if (!existing || state.cursor) {
          userMap.set(state.user.id, {
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
            cursor: state.cursor,
            selection: state.selection,
          })
        }
      })

      setRemoteUsers(Array.from(userMap.values()))
    }

    awareness.on('change', updateRemoteUsers)
    updateRemoteUsers()

    return () => {
      awareness.off('change', updateRemoteUsers)
    }
  }, [awareness])

  // Broadcast local cursor position (throttled to 50ms)
  const updateCursor = useCallback((x: number, y: number) => {
    if (!awareness) return
    const now = Date.now()
    if (now - throttleRef.current < 50) return
    throttleRef.current = now
    awareness.setLocalStateField('cursor', { x, y })
  }, [awareness])

  // Broadcast local selection
  const updateSelection = useCallback((selectedIds: string[]) => {
    if (!awareness) return
    awareness.setLocalStateField('selection', selectedIds)
  }, [awareness])

  // Clear cursor when mouse leaves canvas
  const clearCursor = useCallback(() => {
    if (!awareness) return
    awareness.setLocalStateField('cursor', null)
  }, [awareness])

  return {
    remoteUsers,
    updateCursor,
    updateSelection,
    clearCursor,
  }
}
