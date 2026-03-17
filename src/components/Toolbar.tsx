'use client'

import type { Tool } from '@/types/elements'

interface ToolbarProps {
  currentTool: Tool
  onToolChange: (tool: Tool) => void
  onExport?: () => void
}

const tools: { tool: Tool; label: string; shortcut: string }[] = [
  { tool: 'select', label: 'Select', shortcut: 'V' },
  { tool: 'rectangle', label: 'Rectangle', shortcut: 'R' },
  { tool: 'ellipse', label: 'Ellipse', shortcut: 'O' },
  { tool: 'line', label: 'Line', shortcut: 'L' },
  { tool: 'arrow', label: 'Arrow', shortcut: 'A' },
  { tool: 'freehand', label: 'Pencil', shortcut: 'P' },
  { tool: 'text', label: 'Text', shortcut: 'T' },
  { tool: 'eraser', label: 'Eraser', shortcut: 'E' },
]

function ToolIcon({ tool }: { tool: Tool }) {
  const s = 18
  switch (tool) {
    case 'select':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
          <path d="M13 13l6 6" />
        </svg>
      )
    case 'rectangle':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
        </svg>
      )
    case 'ellipse':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <ellipse cx="12" cy="12" rx="10" ry="8" />
        </svg>
      )
    case 'line':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="5" y1="19" x2="19" y2="5" />
        </svg>
      )
    case 'arrow':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="19" x2="19" y2="5" />
          <polyline points="10 5 19 5 19 14" />
        </svg>
      )
    case 'freehand':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 19l7-7 3 3-7 7-3-3z" />
          <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
          <path d="M2 2l7.586 7.586" />
          <circle cx="11" cy="11" r="2" />
        </svg>
      )
    case 'text':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9.5" y1="20" x2="14.5" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      )
    case 'eraser':
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.8L14.2 2c.8-.8 2-.8 2.8 0L21.8 6.8c.8.8.8 2 0 2.8L10 21" />
          <path d="M6 11l7 7" />
        </svg>
      )
    default:
      return null
  }
}

export default function Toolbar({ currentTool, onToolChange, onExport }: ToolbarProps) {
  return (
    <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 flex items-center gap-0.5 rounded-2xl bg-white/95 backdrop-blur-sm px-1.5 py-1.5 shadow-lg shadow-black/5 border border-gray-200/80">
      {tools.map(({ tool, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => onToolChange(tool)}
          className={`relative flex items-center justify-center w-9 h-9 rounded-xl text-base transition-all duration-150
            ${currentTool === tool
              ? 'bg-blue-500 text-white shadow-sm shadow-blue-200'
              : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
            }`}
          title={`${label} (${shortcut})`}
        >
          <ToolIcon tool={tool} />
        </button>
      ))}

      {onExport && (
        <>
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <button
            onClick={onExport}
            className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-150"
            title="Export PNG"
          >
            <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        </>
      )}
    </div>
  )
}
