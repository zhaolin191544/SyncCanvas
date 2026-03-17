'use client'

import { useEffect, useCallback, useRef } from 'react'
import * as Y from 'yjs'
import type { CanvasElement } from '@/types/elements'
import { useYjs } from './YjsProvider'
import type { RenderEngine } from '@/engine/RenderEngine'

function canvasElementToYMap(el: CanvasElement, ydoc: Y.Doc): Y.Map<unknown> {
  const yEl = new Y.Map<unknown>()
  for (const [key, value] of Object.entries(el)) {
    if (key === 'points' && Array.isArray(value)) {
      const yPoints = new Y.Array<Y.Array<number>>()
      for (const p of value) {
        const yPoint = new Y.Array<number>()
        yPoint.push(p)
        yPoints.push([yPoint])
      }
      yEl.set(key, yPoints)
    } else {
      yEl.set(key, value)
    }
  }
  return yEl
}

function yMapToCanvasElement(yEl: Y.Map<unknown>): CanvasElement {
  const obj: Record<string, unknown> = {}
  for (const [key, value] of yEl.entries()) {
    if (key === 'points' && value instanceof Y.Array) {
      const points: number[][] = []
      value.forEach((yPoint: Y.Array<number>) => {
        if (yPoint instanceof Y.Array) {
          points.push(yPoint.toArray())
        }
      })
      obj[key] = points
    } else {
      obj[key] = value
    }
  }
  return obj as unknown as CanvasElement
}

export function useYjsElements(engineRef: React.RefObject<RenderEngine | null>) {
  const { ydoc, yElements, userId } = useYjs()
  const isApplyingRemote = useRef(false)

  // Sync Yjs → Engine: listen for remote changes
  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return

    const observer = (events: Y.YMapEvent<Y.Map<unknown>>) => {
      if (isApplyingRemote.current) return
      isApplyingRemote.current = true

      events.changes.keys.forEach((change, key) => {
        if (change.action === 'add' || change.action === 'update') {
          const yEl = yElements.get(key)
          if (yEl) {
            const el = yMapToCanvasElement(yEl)
            engine.elements.set(key, el)
          }
        } else if (change.action === 'delete') {
          engine.elements.delete(key)
        }
      })

      engine.markDirty()
      isApplyingRemote.current = false
    }

    yElements.observe(observer)

    // Also listen for deep changes (property updates within elements)
    const deepObserver = (events: Y.YEvent<Y.Map<unknown>>[], transaction: Y.Transaction) => {
      if (transaction.local) return
      const engine = engineRef.current
      if (!engine) return

      // Re-sync all changed elements
      for (const event of events) {
        if (event.target instanceof Y.Map && event.target !== yElements) {
          const id = event.target.get('id') as string | undefined
          if (id) {
            const el = yMapToCanvasElement(event.target)
            engine.elements.set(id, el)
          }
        }
      }
      engine.markDirty()
    }

    yElements.observeDeep(deepObserver)

    // Initial sync: load existing elements from Yjs into engine
    yElements.forEach((yEl, key) => {
      const el = yMapToCanvasElement(yEl)
      engine.elements.set(key, el)
    })
    engine.markDirty()

    return () => {
      yElements.unobserve(observer)
      yElements.unobserveDeep(deepObserver)
    }
  }, [yElements, engineRef])

  // Engine → Yjs: add element
  const addElement = useCallback((el: CanvasElement) => {
    ydoc.transact(() => {
      const yEl = canvasElementToYMap(el, ydoc)
      yElements.set(el.id, yEl)
    }, userId)
  }, [ydoc, yElements, userId])

  // Engine → Yjs: update element properties
  const updateElement = useCallback((id: string, updates: Partial<CanvasElement>) => {
    const yEl = yElements.get(id)
    if (!yEl) return
    ydoc.transact(() => {
      for (const [key, value] of Object.entries(updates)) {
        if (key === 'points' && Array.isArray(value)) {
          const yPoints = new Y.Array<Y.Array<number>>()
          for (const p of value) {
            const yPoint = new Y.Array<number>()
            yPoint.push(p)
            yPoints.push([yPoint])
          }
          yEl.set(key, yPoints)
        } else {
          yEl.set(key, value)
        }
      }
    }, userId)
  }, [ydoc, yElements, userId])

  // Engine → Yjs: delete element
  const deleteElement = useCallback((id: string) => {
    ydoc.transact(() => {
      yElements.delete(id)
    }, userId)
  }, [ydoc, yElements, userId])

  // Engine → Yjs: batch delete
  const deleteElements = useCallback((ids: string[]) => {
    ydoc.transact(() => {
      for (const id of ids) {
        yElements.delete(id)
      }
    }, userId)
  }, [ydoc, yElements, userId])

  // Sync a full element from engine to Yjs (after move/resize)
  const syncElement = useCallback((id: string) => {
    const engine = engineRef.current
    if (!engine) return
    const el = engine.elements.get(id)
    if (!el) return

    const yEl = yElements.get(id)
    if (!yEl) {
      // Element doesn't exist in Yjs yet, add it
      addElement(el)
      return
    }

    ydoc.transact(() => {
      for (const [key, value] of Object.entries(el)) {
        if (key === 'points' && Array.isArray(value)) {
          const yPoints = new Y.Array<Y.Array<number>>()
          for (const p of value) {
            const yPoint = new Y.Array<number>()
            yPoint.push(p)
            yPoints.push([yPoint])
          }
          yEl.set(key, yPoints)
        } else {
          yEl.set(key, value)
        }
      }
    }, userId)
  }, [ydoc, yElements, userId, engineRef, addElement])

  // Sync all selected elements after a move/resize
  const syncSelectedElements = useCallback((selectedIds: Set<string>) => {
    for (const id of selectedIds) {
      syncElement(id)
    }
  }, [syncElement])

  return {
    addElement,
    updateElement,
    deleteElement,
    deleteElements,
    syncElement,
    syncSelectedElements,
  }
}
