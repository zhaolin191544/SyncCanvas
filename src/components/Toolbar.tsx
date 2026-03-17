'use client'

import { useRef } from 'react'
import type { Tool } from '@/types/elements'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'
import { 
  MousePointer2, 
  Square, 
  Circle, 
  Minus, 
  ArrowUpRight, 
  Pencil, 
  Type, 
  Image as ImageIcon, 
  Eraser,
  Download
} from 'lucide-react'

interface ToolbarProps {
  currentTool: Tool
  onToolChange: (tool: Tool) => void
  onExport?: () => void
}

const tools: { tool: Tool; icon: any; labelKey: string; shortcut: string }[] = [
  { tool: 'select', icon: MousePointer2, labelKey: 'select', shortcut: 'V' },
  { tool: 'rectangle', icon: Square, labelKey: 'rectangle', shortcut: 'R' },
  { tool: 'ellipse', icon: Circle, labelKey: 'ellipse', shortcut: 'O' },
  { tool: 'line', icon: Minus, labelKey: 'line', shortcut: 'L' },
  { tool: 'arrow', icon: ArrowUpRight, labelKey: 'arrow', shortcut: 'A' },
  { tool: 'freehand', icon: Pencil, labelKey: 'freehand', shortcut: 'P' },
  { tool: 'text', icon: Type, labelKey: 'text', shortcut: 'T' },
  { tool: 'image', icon: ImageIcon, labelKey: 'image', shortcut: 'I' },
  { tool: 'eraser', icon: Eraser, labelKey: 'eraser', shortcut: 'E' },
]

export default function Toolbar({ currentTool, onToolChange, onExport }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { t } = useLanguage()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => window.dispatchEvent(new CustomEvent('add-image', { detail: { src: event.target?.result } }))
      reader.readAsDataURL(file)
    }
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-stone-200 p-1.5 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
      {tools.map(({ tool, icon: Icon, labelKey, shortcut }) => (
        <button
          key={tool}
          onClick={() => tool === 'image' ? (currentTool === 'image' ? fileInputRef.current?.click() : onToolChange('image')) : onToolChange(tool)}
          className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-200 group
            ${currentTool === tool
              ? 'bg-stone-900 text-white shadow-md scale-100'
              : 'text-stone-400 hover:text-stone-900 hover:bg-stone-50'
            }`}
        >
          <Icon size={18} strokeWidth={currentTool === tool ? 2 : 1.5} />
          
          <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-stone-900 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
            {(t.tools as any)[labelKey]} <span className="opacity-50 ml-1">{shortcut}</span>
          </div>

          {currentTool === tool && tool === 'image' && (
             <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-green-500 rounded-full border border-stone-900" />
          )}
        </button>
      ))}

      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {onExport && (
        <>
          <div className="w-px h-6 bg-stone-100 mx-1" />
          <button
            onClick={onExport}
            className="flex items-center justify-center w-10 h-10 rounded-xl text-stone-400 hover:text-stone-900 hover:bg-stone-50 transition-all group relative"
          >
            <Download size={18} strokeWidth={1.5} />
            <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-stone-900 text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-xl">
              Export
            </div>
          </button>
        </>
      )}
    </div>
  )
}
