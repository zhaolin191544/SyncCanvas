'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { RenderEngine } from '@/engine/RenderEngine'
import { InputHandler, type InputHandlerCallbacks } from '@/engine/InputHandler'
import type { Tool, CanvasElement, Point } from '@/types/elements'

export function useCanvas(callbacks?: InputHandlerCallbacks) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<RenderEngine | null>(null)
  const inputRef = useRef<InputHandler | null>(null)
  const callbacksRef = useRef(callbacks)
  const [currentTool, setCurrentTool] = useState<Tool>('select')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Keep callbacks ref up to date so InputHandler always calls the latest
  callbacksRef.current = callbacks

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const engine = new RenderEngine(canvas)
    engineRef.current = engine

    const inputCallbacks: InputHandlerCallbacks = {
      onSelectionChange: (ids) => {
        setSelectedIds(new Set(ids))
        callbacksRef.current?.onSelectionChange?.(ids)
      },
      onElementsChange: () => {
        callbacksRef.current?.onElementsChange?.()
      },
      onToolReset: () => {
        callbacksRef.current?.onToolReset?.()
      },
      onTextEdit: (element, screenPos) => {
        callbacksRef.current?.onTextEdit?.(element, screenPos)
      },
      onCursorMove: (worldX, worldY) => {
        callbacksRef.current?.onCursorMove?.(worldX, worldY)
      },
      onCursorLeave: () => {
        callbacksRef.current?.onCursorLeave?.()
      },
      onElementCreated: (element) => {
        callbacksRef.current?.onElementCreated?.(element)
      },
      onElementsDeleted: (ids) => {
        callbacksRef.current?.onElementsDeleted?.(ids)
      },
      onElementsMoved: (ids) => {
        callbacksRef.current?.onElementsMoved?.(ids)
      },
      onUndo: () => {
        callbacksRef.current?.onUndo?.()
      },
      onRedo: () => {
        callbacksRef.current?.onRedo?.()
      },
      onDuplicate: (elements) => {
        callbacksRef.current?.onDuplicate?.(elements)
      },
    }

    const input = new InputHandler(engine, inputCallbacks)
    inputRef.current = input

    // Resize handler
    const handleResize = () => {
      const parent = canvas.parentElement
      if (parent) {
        engine.resize(parent.clientWidth, parent.clientHeight)
      }
    }

    // Event handlers
    const onMouseDown = (e: MouseEvent) => input.handleMouseDown(e)
    const onMouseMove = (e: MouseEvent) => input.handleMouseMove(e)
    const onMouseUp = (e: MouseEvent) => input.handleMouseUp(e)
    const onWheel = (e: WheelEvent) => input.handleWheel(e)
    const onDblClick = (e: MouseEvent) => input.handleDoubleClick(e)
    const onKeyDown = (e: KeyboardEvent) => input.handleKeyDown(e)
    const onMouseLeave = (e: MouseEvent) => input.handleMouseLeave(e)

    canvas.addEventListener('mousedown', onMouseDown)
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('mouseleave', onMouseLeave)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('dblclick', onDblClick)
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', handleResize)

    // Prevent context menu
    canvas.addEventListener('contextmenu', (e) => e.preventDefault())

    handleResize()
    engine.start()

    return () => {
      engine.stop()
      input.destroy()
      canvas.removeEventListener('mousedown', onMouseDown)
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('mouseleave', onMouseLeave)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('dblclick', onDblClick)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const changeTool = useCallback((tool: Tool) => {
    setCurrentTool(tool)
    inputRef.current?.setTool(tool)
    engineRef.current?.selection.clearSelection()
    if (tool !== 'eraser' && engineRef.current) {
      engineRef.current.eraserCursor = null
    }
    engineRef.current?.markDirty()
    setSelectedIds(new Set())
  }, [])

  return {
    canvasRef,
    engineRef,
    inputRef,
    currentTool,
    changeTool,
    selectedIds,
  }
}
