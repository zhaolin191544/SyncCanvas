'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'
import { Command, Keyboard, X, MousePointer2, Move, Type, ZoomIn, Scissors } from 'lucide-react'

export default function ShortcutsCard() {
  const [collapsed, setCollapsed] = useState(true)
  const { t } = useLanguage()

  const shortcuts = [
    { key: 'V', desc: t.tools.select, icon: MousePointer2 },
    { key: 'R', desc: t.tools.rectangle, icon: null },
    { key: 'O', desc: t.tools.ellipse, icon: null },
    { key: 'L', desc: t.tools.line, icon: null },
    { key: 'A', desc: t.tools.arrow, icon: null },
    { key: 'P', desc: t.tools.freehand, icon: null },
    { key: 'T', desc: t.tools.text, icon: Type },
    { key: 'E', desc: t.tools.eraser, icon: Scissors },
    { key: 'Del', desc: 'Delete Selection', icon: null },
    { key: 'Ctrl+Z', desc: 'Undo', icon: null },
    { key: 'Ctrl+D', desc: 'Duplicate', icon: null },
    { key: 'DblClick', desc: 'Add Text', icon: null },
    { key: 'Wheel', desc: 'Zoom', icon: ZoomIn },
    { key: 'MiddleDrag', desc: 'Pan', icon: Move },
  ]

  return (
    <div className="absolute left-6 top-24 z-50">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setCollapsed(!collapsed)}
        className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-[10px] font-black tracking-widest uppercase transition-all duration-300 shadow-2xl border backdrop-blur-2xl
          ${collapsed 
            ? 'bg-[#1a1a1a]/80 text-gray-400 border-white/5 hover:text-white' 
            : 'bg-white text-black border-white'
          }`}
      >
        <Keyboard size={16} />
        {collapsed ? t.shortcuts : 'Close'}
      </motion.button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="mt-4 w-64 rounded-[2rem] bg-[#1a1a1a]/90 backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 overflow-hidden"
          >
            <div className="px-6 py-4 text-[10px] font-black text-gray-500 bg-white/[0.02] border-b border-white/5 uppercase tracking-[0.2em] flex items-center justify-between">
              {t.shortcuts}
              <Command size={12} className="text-blue-500" />
            </div>
            <div className="p-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {shortcuts.map(({ key, desc, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between px-3 py-2 hover:bg-white/[0.03] rounded-xl transition-colors group">
                  <div className="flex items-center gap-2">
                    {Icon && <Icon size={12} className="text-gray-600 group-hover:text-blue-500 transition-colors" />}
                    <span className="text-[10px] text-gray-400 font-bold group-hover:text-gray-200 transition-colors">{desc}</span>
                  </div>
                  <kbd className="px-2 py-0.5 text-[9px] font-black bg-white/5 text-blue-400 rounded-lg border border-white/5 min-w-[20px] text-center">
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
