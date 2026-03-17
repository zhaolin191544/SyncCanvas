'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { useYjs } from '@/collaboration/YjsProvider'
import { useYjsElements } from '@/collaboration/useYjsElements'
import { useAwareness } from '@/collaboration/useAwareness'
import { useUndoManager } from '@/collaboration/useUndoManager'
import Toolbar from '@/components/Toolbar'
import PropertyPanel from '@/components/PropertyPanel'
import ShortcutsCard from '@/components/ShortcutsCard'
import UserPresence from '@/components/UserPresence'
import ConnectionStatusComponent from '@/components/ConnectionStatus'
import MiniMap from '@/components/MiniMap'
import type { CanvasElement, Point, Tool } from '@/types/elements'
import { measureText } from '@/engine/elements/Text'
import { exportToPng } from '@/utils/exportPng'

interface BoardContentProps {
  roomId: string
}

export default function BoardContent({ roomId }: BoardContentProps) {
  const [editingText, setEditingText] = useState<{ element: CanvasElement; screenPos: Point } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [propVersion, setPropVersion] = useState(0)
  const [eraserSize, setEraserSize] = useState(20)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { connectionStatus, userName, userColor } = useYjs()

  const { canvasRef, engineRef, inputRef, currentTool, changeTool, selectedIds } = useCanvas({
    onTextEdit: (element, screenPos) => {
      setEditingText({ element, screenPos })
    },
    onCursorMove: (worldX, worldY) => {
      updateCursor(worldX, worldY)
    },
    onCursorLeave: () => {
      clearCursor()
    },
    onElementCreated: (element) => {
      addElement(element)
    },
    onElementsDeleted: (ids) => {
      deleteElements(ids)
    },
    onElementsMoved: (ids) => {
      syncSelectedElements(ids)
    },
    onSelectionChange: (ids) => {
      updateSelection(Array.from(ids))
    },
    onUndo: () => {
      undo()
    },
    onRedo: () => {
      redo()
    },
    onDuplicate: (elements) => {
      for (const el of elements) addElement(el)
    },
  })

  const { addElement, updateElement, deleteElements, syncSelectedElements, syncElement } = useYjsElements(engineRef)
  const { remoteUsers, updateCursor, updateSelection, clearCursor } = useAwareness()
  const { undo, redo } = useUndoManager(engineRef)

  // Sync remote users to engine for rendering
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setRemoteUsers(remoteUsers)
    }
  }, [remoteUsers, engineRef])

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingText) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const keyMap: Record<string, Tool> = {
        v: 'select',
        r: 'rectangle',
        o: 'ellipse',
        l: 'line',
        a: 'arrow',
        p: 'freehand',
        t: 'text',
        e: 'eraser',
      }

      const tool = keyMap[e.key.toLowerCase()]
      if (tool && !e.ctrlKey && !e.metaKey) {
        changeTool(tool)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [changeTool, editingText])

  // Update zoom display
  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) {
        setZoomLevel(Math.round(engineRef.current.camera.zoom * 100))
      }
    }, 100)
    return () => clearInterval(interval)
  }, [])

  // Focus textarea when editing text
  useEffect(() => {
    if (editingText && textareaRef.current) {
      textareaRef.current.value = editingText.element.text || ''
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [editingText])

  const handleTextBlur = useCallback(() => {
    if (!editingText || !engineRef.current || !textareaRef.current) return
    const text = textareaRef.current.value
    const el = engineRef.current.elements.get(editingText.element.id)
    if (el) {
      el.text = text
      if (text && engineRef.current.ctx) {
        const size = measureText(engineRef.current.ctx, text, el.fontSize || 16)
        el.width = size.width
        el.height = size.height
      }
      if (!text) {
        engineRef.current.removeElement(el.id)
        deleteElements([el.id])
      } else {
        syncElement(el.id)
      }
      engineRef.current.markDirty()
    }
    setEditingText(null)
  }, [editingText, deleteElements, syncElement])

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') handleTextBlur()
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextBlur()
    }
  }, [handleTextBlur])

  const handleExport = useCallback(() => {
    if (engineRef.current) {
      exportToPng(engineRef.current.elements)
    }
  }, [engineRef])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Toolbar */}
      <Toolbar currentTool={currentTool} onToolChange={changeTool} onExport={handleExport} />

      {/* Eraser size control */}
      {currentTool === 'eraser' && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 rounded-xl bg-white/95 backdrop-blur-sm px-3 py-1.5 shadow-lg shadow-black/5 border border-gray-200/80">
          <span className="text-xs text-gray-500">Size</span>
          <input
            type="range"
            min="5"
            max="80"
            value={eraserSize}
            onChange={(e) => {
              const size = Number(e.target.value)
              setEraserSize(size)
              if (inputRef.current) {
                inputRef.current.eraserSize = size
              }
            }}
            className="w-24 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-400"
          />
          <span className="text-xs text-gray-400 min-w-[24px]">{eraserSize}</span>
        </div>
      )}

      {/* Shortcuts card */}
      <ShortcutsCard />

      {/* Property Panel */}
      <PropertyPanel
        selectedElements={Array.from(selectedIds).map(id => engineRef.current?.elements.get(id)).filter(Boolean) as CanvasElement[]}
        onUpdate={(id, updates) => {
          const engine = engineRef.current
          if (!engine) return
          const el = engine.elements.get(id)
          if (!el) return
          Object.assign(el, updates)
          engine.markDirty()
          updateElement(id, updates)
          setPropVersion(v => v + 1)
        }}
        version={propVersion}
      />

      {/* User presence */}
      <UserPresence
        localUser={{ name: userName, color: userColor }}
        remoteUsers={remoteUsers}
      />

      {/* MiniMap */}
      <MiniMap engineRef={engineRef} canvasRef={canvasRef} />

      {/* Text editing overlay */}
      {editingText && (
        <textarea
          ref={textareaRef}
          className="absolute z-20 border-2 border-blue-500 bg-transparent outline-none resize-none font-sans"
          style={{
            left: editingText.screenPos.x,
            top: editingText.screenPos.y,
            fontSize: `${(editingText.element.fontSize || 16) * (engineRef.current?.camera.zoom || 1)}px`,
            color: editingText.element.strokeColor,
            minWidth: '60px',
            minHeight: '24px',
          }}
          onBlur={handleTextBlur}
          onKeyDown={handleTextKeyDown}
        />
      )}

      {/* Status bar */}
      <div className="absolute bottom-4 left-4 z-10 flex items-center gap-2">
        <ConnectionStatusComponent status={connectionStatus} />
        <div className="rounded-lg bg-white/90 backdrop-blur-sm px-3 py-1.5 text-xs text-gray-500 shadow-sm border border-gray-200/80">
          {selectedIds.size > 0
            ? `${selectedIds.size} selected`
            : currentTool === 'select' ? 'Ready' : `Drawing: ${currentTool}`
          }
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-0.5">
        <button
          className="rounded-l-lg bg-white/90 backdrop-blur-sm px-2.5 py-1.5 text-sm text-gray-500 shadow-sm border border-gray-200/80 hover:bg-gray-50 transition-colors"
          onClick={() => {
            if (engineRef.current && canvasRef.current) {
              engineRef.current.camera.zoomAtPoint(
                canvasRef.current.clientWidth / 2,
                canvasRef.current.clientHeight / 2,
                300,
              )
              engineRef.current.markDirty()
            }
          }}
        >
          -
        </button>
        <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm text-gray-600 shadow-sm border-y border-gray-200/80 min-w-[52px] text-center font-medium">
          {zoomLevel}%
        </div>
        <button
          className="rounded-r-lg bg-white/90 backdrop-blur-sm px-2.5 py-1.5 text-sm text-gray-500 shadow-sm border border-gray-200/80 hover:bg-gray-50 transition-colors"
          onClick={() => {
            if (engineRef.current && canvasRef.current) {
              engineRef.current.camera.zoomAtPoint(
                canvasRef.current.clientWidth / 2,
                canvasRef.current.clientHeight / 2,
                -300,
              )
              engineRef.current.markDirty()
            }
          }}
        >
          +
        </button>
      </div>

      {/* Room ID display */}
      <div className="absolute top-4 right-4 z-10 rounded-xl bg-white/80 backdrop-blur-sm px-3 py-2 text-xs text-gray-400 shadow-sm border border-gray-200/80 leading-relaxed">
        <div className="font-medium text-gray-500">Room: {roomId.slice(0, 8)}...</div>
        <div>Scroll: Zoom | Middle-click: Pan</div>
        <div>Double-click: Add text</div>
      </div>
    </div>
  )
}
