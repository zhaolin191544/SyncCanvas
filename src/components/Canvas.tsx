'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import type { CanvasElement, Point } from '@/types/elements'
import { measureText } from '@/engine/elements/Text'

interface CanvasProps {
  onSelectionChange?: (ids: Set<string>) => void
  onToolChange?: (tool: string) => void
  currentTool?: string
  changeTool?: (tool: string) => void
}

export default function CanvasComponent() {
  const [editingText, setEditingText] = useState<{ element: CanvasElement; screenPos: Point } | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { canvasRef, engineRef, inputRef, currentTool, changeTool, selectedIds } = useCanvas({
    onTextEdit: (element, screenPos) => {
      setEditingText({ element, screenPos })
    },
  })

  // Keyboard shortcuts for tool switching
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingText) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const keyMap: Record<string, string> = {
        v: 'select',
        r: 'rectangle',
        o: 'ellipse',
        l: 'line',
        a: 'arrow',
        p: 'freehand',
        t: 'text',
      }

      const tool = keyMap[e.key.toLowerCase()]
      if (tool && !e.ctrlKey && !e.metaKey) {
        changeTool(tool as any)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [changeTool, editingText])

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
      }
      engineRef.current.markDirty()
    }
    setEditingText(null)
  }, [editingText])

  const handleTextKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleTextBlur()
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleTextBlur()
    }
  }, [handleTextBlur])

  return (
    <div className="relative w-full h-full overflow-hidden bg-gray-50">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

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

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 z-10 rounded-lg bg-white px-3 py-1.5 text-sm text-gray-500 shadow border border-gray-200">
        {Math.round((engineRef.current?.camera.zoom || 1) * 100)}%
      </div>
    </div>
  )
}

// Export the hook data for parent usage
export { useCanvas }
