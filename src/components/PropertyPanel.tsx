'use client'

import { useState } from 'react'
import type { CanvasElement } from '@/types/elements'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion } from 'framer-motion'
import { 
  Lock, 
  Unlock, 
  Settings2, 
  Maximize, 
  Move,
} from 'lucide-react'

interface PropertyPanelProps {
  selectedElements: CanvasElement[]
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
  version: number
}

export default function PropertyPanel({ selectedElements, onUpdate, version }: PropertyPanelProps) {
  const { t } = useLanguage()
  if (selectedElements.length === 0) return null

  const el = selectedElements[0]
  const multi = selectedElements.length > 1
  const isImage = el.type === 'image'

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="absolute top-24 right-6 z-40 w-64 rounded-3xl bg-white border border-stone-200 shadow-[0_12px_40px_rgba(0,0,0,0.08)] overflow-hidden font-sans"
    >
      <div className="px-5 py-4 border-b border-stone-50 flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          {multi ? `${selectedElements.length} ${t.selected}` : el.type}
        </h3>
        {!multi && (
          <button 
            onClick={() => onUpdate(el.id, { locked: !el.locked })}
            className={`p-1.5 rounded-lg transition-all ${el.locked ? 'bg-stone-900 text-white' : 'text-stone-300 hover:text-stone-900 hover:bg-stone-50'}`}
          >
            {el.locked ? <Lock size={12}/> : <Unlock size={12}/>}
          </button>
        )}
      </div>

      <div className="p-5 space-y-6">
        {/* Stroke & Fill */}
        {!isImage && (
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[9px] font-bold text-stone-400 uppercase">{t.stroke}</label>
              <ColorInput value={el.strokeColor} onChange={(v) => selectedElements.forEach(e => onUpdate(e.id, { strokeColor: v }))} />
            </div>
            {el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freehand' && (
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-stone-400 uppercase">{t.fill}</label>
                <ColorInput value={el.fillColor} onChange={(v) => selectedElements.forEach(e => onUpdate(e.id, { fillColor: v }))} />
              </div>
            )}
          </div>
        )}

        {/* Sliders */}
        <div className="space-y-4">
          <PropertySlider label="Rotation" value={Math.round((el.rotation * 180) / Math.PI)} min={-180} max={180} onChange={(v: number) => selectedElements.forEach(e => onUpdate(e.id, { rotation: (v * Math.PI) / 180 }))} suffix="°" />
          {!isImage && (
            <PropertySlider label={t.width} value={el.strokeWidth} min={0} max={20} onChange={(v: number) => selectedElements.forEach(e => onUpdate(e.id, { strokeWidth: v }))} suffix="px" />
          )}
          <PropertySlider label={t.opacity} value={Math.round(el.opacity * 100)} min={0} max={100} onChange={(v: number) => selectedElements.forEach(e => onUpdate(e.id, { opacity: v / 100 }))} suffix="%" />
        </div>

        {/* Text Size */}
        {el.type === 'text' && !multi && (
          <div className="space-y-2 pt-2 border-t border-stone-50">
            <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{t.size}</label>
            <input type="number" value={el.fontSize || 16} onChange={(e) => onUpdate(el.id, { fontSize: Number(e.target.value) })} onKeyDown={(e) => e.stopPropagation()} className="w-full bg-stone-50 border border-stone-100 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-stone-900" />
          </div>
        )}

        {/* Position & Size - Editable */}
        {!multi && (
          <div className="pt-4 border-t border-stone-50 grid grid-cols-2 gap-3">
            <EditableStatItem label="X" value={Math.round(el.x)} onChange={(v) => onUpdate(el.id, { x: v })} />
            <EditableStatItem label="Y" value={Math.round(el.y)} onChange={(v) => onUpdate(el.id, { y: v })} />
            {el.type !== 'freehand' && (
              <>
                <EditableStatItem label="W" value={Math.round(Math.abs(el.width))} onChange={(v) => onUpdate(el.id, { width: Math.abs(v) })} />
                <EditableStatItem label="H" value={Math.round(Math.abs(el.height))} onChange={(v) => onUpdate(el.id, { height: Math.abs(v) })} />
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  )
}

interface PropertySliderProps {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  suffix: string
}

function PropertySlider({ label, value, min, max, onChange, suffix }: PropertySliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">{label}</label>
        <span className="text-[9px] font-bold text-stone-900">{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full h-1 bg-stone-100 rounded-lg appearance-none cursor-pointer accent-stone-900" />
    </div>
  )
}

function EditableStatItem({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9px] font-bold text-stone-300 w-3">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
        onKeyDown={(e) => e.stopPropagation()}
        className="w-full bg-stone-50 border border-stone-100 rounded-lg px-2 py-1 text-[10px] font-medium text-stone-600 font-mono outline-none focus:border-stone-900 transition-colors"
      />
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full h-8 rounded-lg border border-stone-200 overflow-hidden group">
      <input type="color" value={value === 'transparent' ? '#ffffff' : value} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 w-full h-full cursor-pointer opacity-0" />
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-white">
        <div className="w-4 h-4 rounded-full border border-stone-100 shadow-sm" style={{ backgroundColor: value === 'transparent' ? 'white' : value }} />
        {value === 'transparent' && <div className="absolute w-full h-px bg-red-400 rotate-45 scale-x-50" />}
      </div>
    </div>
  )
}
