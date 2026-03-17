'use client'

import { CanvasElement } from '@/types/elements'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Square, 
  Circle, 
  Minus, 
  ArrowUpRight, 
  Pencil, 
  Type, 
  Image as ImageIcon,
  Eye,
  EyeOff,
  Trash2,
  Layers as LayersIcon
} from 'lucide-react'

interface ElementListProps {
  elements: CanvasElement[]
  selectedIds: Set<string>
  onSelect: (id: string, multi: boolean) => void
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
  onDelete: (id: string) => void
}

const TypeIcon = ({ type, size = 14 }: { type: string, size?: number }) => {
  switch (type) {
    case 'rectangle': return <Square size={size} strokeWidth={1.5} />
    case 'ellipse': return <Circle size={size} strokeWidth={1.5} />
    case 'line': return <Minus size={size} strokeWidth={1.5} />
    case 'arrow': return <ArrowUpRight size={size} strokeWidth={1.5} />
    case 'freehand': return <Pencil size={size} strokeWidth={1.5} />
    case 'text': return <Type size={size} strokeWidth={1.5} />
    case 'image': return <ImageIcon size={size} strokeWidth={1.5} />
    default: return <LayersIcon size={size} strokeWidth={1.5} />
  }
}

export default function ElementList({ elements, selectedIds, onSelect, onUpdate, onDelete }: ElementListProps) {
  const { t } = useLanguage()
  const sortedElements = [...elements].sort((a, b) => b.zIndex - a.zIndex)

  return (
    <motion.div 
      initial={{ x: 300 }} animate={{ x: 0 }} exit={{ x: 300 }}
      className="flex flex-col h-[calc(100vh-48px)] bg-white/90 backdrop-blur-xl w-72 m-6 rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-stone-200"
    >
      <div className="p-6 border-b border-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-stone-900 tracking-tight">{t.layers}</span>
          <span className="text-[10px] text-stone-400 font-medium">({elements.length})</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-auto p-2 space-y-0.5 custom-scrollbar">
        {sortedElements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <LayersIcon size={20} className="text-stone-200 mb-2" />
            <p className="text-[10px] text-stone-300 font-medium uppercase tracking-widest">{t.noElements}</p>
          </div>
        ) : (
          <AnimatePresence>
            {sortedElements.map((el) => {
              const isSelected = selectedIds.has(el.id)
              return (
                <motion.div
                  key={el.id} layout
                  onClick={(e) => onSelect(el.id, e.shiftKey || e.ctrlKey || e.metaKey)}
                  className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all
                    ${isSelected ? 'bg-stone-900 text-white shadow-sm' : 'hover:bg-stone-50 text-stone-600'}`}
                >
                  <div className={`shrink-0 ${isSelected ? 'text-stone-400' : 'text-stone-300 group-hover:text-stone-500'}`}>
                    <TypeIcon type={el.type} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <input
                      className={`w-full bg-transparent border-none outline-none text-xs font-medium truncate
                        ${isSelected ? 'text-white' : 'text-stone-700'}`}
                      value={el.name || (t.tools as any)[el.type] || el.type}
                      onChange={(e) => onUpdate(el.id, { name: e.target.value })}
                      onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate(el.id, { visible: el.visible === false }) }}
                      className={`p-1 rounded-md transition-colors ${isSelected ? 'hover:bg-white/10' : 'hover:bg-white'}`}
                    >
                      {el.visible === false ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDelete(el.id) }}
                      className={`p-1 rounded-md transition-colors ${isSelected ? 'hover:bg-red-400/20 text-red-300' : 'hover:bg-red-50 text-stone-300 hover:text-red-500'}`}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
