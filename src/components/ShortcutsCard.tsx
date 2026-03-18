'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Command, 
  Keyboard, 
  MousePointer2, 
  Move, 
  Type, 
  ZoomIn, 
  Scissors,
  Square,
  Circle,
  Minus,
  ArrowUpRight,
  Pencil,
  Image as ImageIcon,
  RotateCw,
  Undo2,
  Copy,
  Trash2,
  Plus
} from 'lucide-react'

export default function ShortcutsCard() {
  const [collapsed, setCollapsed] = useState(true)
  const { t } = useLanguage()

  const shortcuts = [
    { key: 'V', desc: t.tools.select, icon: MousePointer2 },
    { key: 'R', desc: t.tools.rectangle, icon: Square },
    { key: 'O', desc: t.tools.ellipse, icon: Circle },
    { key: 'L', desc: t.tools.line, icon: Minus },
    { key: 'A', desc: t.tools.arrow, icon: ArrowUpRight },
    { key: 'P', desc: t.tools.freehand, icon: Pencil },
    { key: 'T', desc: t.tools.text, icon: Type },
    { key: 'I', desc: t.tools.image, icon: ImageIcon },
    { key: 'E', desc: t.tools.eraser, icon: Scissors },
    { key: 'Del', desc: t.deleteSelection, icon: Trash2 },
    { key: 'Ctrl+Z', desc: t.undo, icon: Undo2 },
    { key: 'Ctrl+D', desc: t.duplicate, icon: Copy },
    { key: 'DblClick', desc: t.addText, icon: Plus },
    { key: 'Wheel', desc: t.zoom, icon: ZoomIn },
    { key: 'MiddleDrag', desc: t.pan, icon: Move },
  ]

  return (
    <div className="absolute left-6 top-44 z-50">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[10px] font-bold tracking-widest uppercase transition-all duration-300 shadow-sm border
          ${collapsed 
            ? 'bg-white text-stone-500 border-stone-200 hover:border-stone-400' 
            : 'bg-stone-900 text-white border-stone-900'
          }`}
      >
        <Keyboard size={14} />
        {collapsed ? t.shortcuts : t.cancel}
      </motion.button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-3 w-64 rounded-3xl bg-white text-stone-900 shadow-2xl border border-stone-200 overflow-hidden"
          >
            <div className="px-6 py-4 text-[10px] font-bold text-stone-400 border-b border-stone-50 uppercase tracking-widest flex items-center justify-between">
              {t.shortcuts}
              <Command size={12} />
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {shortcuts.map(({ key, desc, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 hover:bg-stone-50 rounded-xl transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-lg bg-stone-50 flex items-center justify-center text-stone-400 group-hover:text-stone-900 transition-colors">
                      {Icon && <Icon size={12} />}
                    </div>
                    <span className="text-[10px] font-medium text-stone-500 group-hover:text-stone-900">{desc}</span>
                  </div>
                  <kbd className="px-1.5 py-0.5 text-[9px] font-bold bg-stone-100 text-stone-500 rounded border border-stone-200 min-w-[20px] text-center uppercase">
                    {key}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
