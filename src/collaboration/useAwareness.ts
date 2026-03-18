'use client'

import { useEffect, useCallback, useRef, useState } from 'react'
import { useYjs } from './YjsProvider'

export interface RemoteUser {
  id: string
  name: string
  color: string
  cursor?: { x: number; y: number }
  selection?: string[]
  camera?: { x: number; y: number; zoom: number }
}

export function useAwareness() {
  const { awareness, userId } = useYjs()
  const [remoteUsers, setRemoteUsers] = useState<RemoteUser[]>([])
  const throttleRef = useRef<number>(0)
  const cameraThrottleRef = useRef<number>(0)

  useEffect(() => {
    if (!awareness) return

    const updateRemoteUsers = () => {
      const states = awareness.getStates()
      const userMap = new Map<string, RemoteUser>()

      states.forEach((state: Record<string, any>, clientId: number) => {
        if (clientId === awareness.clientID) return
        if (!state.user?.id) return
        
        const existing = userMap.get(state.user.id)
        if (!existing || state.cursor || state.camera) {
          userMap.set(state.user.id, {
            id: state.user.id,
            name: state.user.name,
            color: state.user.color,
            cursor: state.cursor,
            selection: state.selection,
            camera: state.camera,
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

  // Broadcast local camera state (throttled to 100ms)
  const updateCamera = useCallback((camera: { x: number; y: number; zoom: number }) => {
    if (!awareness) return
    const now = Date.now()
    if (now - cameraThrottleRef.current < 100) return
    cameraThrottleRef.current = now
    awareness.setLocalStateField('camera', camera)
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
    updateCamera,
    updateSelection,
    clearCursor,
  }
}
