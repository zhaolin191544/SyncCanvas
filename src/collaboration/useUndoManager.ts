'use client'

import { useEffect, useRef, useCallback } from 'react'
import * as Y from 'yjs'
import { useYjs } from './YjsProvider'
import type { RenderEngine } from '@/engine/RenderEngine'

export function useUndoManager(engineRef: React.RefObject<RenderEngine | null>) {
  const { ydoc, yElements, userId } = useYjs()
  const undoManagerRef = useRef<Y.UndoManager | null>(null)

  useEffect(() => {
    const undoManager = new Y.UndoManager(yElements, {
      trackedOrigins: new Set([userId]),
      captureTimeout: 500,
    })

    // After undo/redo, re-sync engine from Yjs state
    const afterOp = () => {
      const engine = engineRef.current
      if (!engine) return
      // Rebuild engine elements from Yjs
      engine.elements.clear()
      yElements.forEach((yEl, key) => {
        const obj: Record<string, unknown> = {}
        for (const [k, v] of yEl.entries()) {
          if (k === 'points' && v instanceof Y.Array) {
            const points: number[][] = []
            v.forEach((yPoint: Y.Array<number>) => {
              if (yPoint instanceof Y.Array) {
                points.push(yPoint.toArray())
              }
            })
            obj[k] = points
          } else {
            obj[k] = v
          }
        }
        engine.elements.set(key, obj as unknown as import('@/types/elements').CanvasElement)
      })
      engine.selection.clearSelection()
      engine.markDirty()
    }

    undoManager.on('stack-item-popped', afterOp)
    undoManagerRef.current = undoManager

    return () => {
      undoManager.off('stack-item-popped', afterOp)
      undoManager.destroy()
      undoManagerRef.current = null
    }
  }, [ydoc, yElements, userId, engineRef])

  const undo = useCallback(() => {
    undoManagerRef.current?.undo()
  }, [])

  const redo = useCallback(() => {
    undoManagerRef.current?.redo()
  }, [])

  const canUndo = useCallback(() => {
    return (undoManagerRef.current?.undoStack.length ?? 0) > 0
  }, [])

  const canRedo = useCallback(() => {
    return (undoManagerRef.current?.redoStack.length ?? 0) > 0
  }, [])

  return { undo, redo, canUndo, canRedo }
}
