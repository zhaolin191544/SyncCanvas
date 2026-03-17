'use client'

import { useState } from 'react'
import type { CanvasElement } from '@/types/elements'

interface PropertyPanelProps {
  selectedElements: CanvasElement[]
  onUpdate: (id: string, updates: Partial<CanvasElement>) => void
  version: number  // increment to force re-render
}

export default function PropertyPanel({ selectedElements, onUpdate, version }: PropertyPanelProps) {
  if (selectedElements.length === 0) return null

  const el = selectedElements[0]
  const multi = selectedElements.length > 1

  return (
    <div className="absolute top-56 right-4 z-10 w-56 rounded-xl bg-white shadow-lg border border-gray-200 overflow-hidden">
      <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-100">
        {multi ? `${selectedElements.length} 个元素` : el.type}
      </div>

      <div className="p-3 space-y-3">
        {/* Stroke Color */}
        <PropertyRow label="描边颜色">
          <ColorInput
            value={el.strokeColor}
            onChange={(v) => {
              for (const e of selectedElements) onUpdate(e.id, { strokeColor: v })
            }}
          />
        </PropertyRow>

        {/* Fill Color */}
        {el.type !== 'line' && el.type !== 'arrow' && el.type !== 'freehand' && (
          <PropertyRow label="填充颜色">
            <ColorInput
              value={el.fillColor}
              onChange={(v) => {
                for (const e of selectedElements) onUpdate(e.id, { fillColor: v })
              }}
            />
          </PropertyRow>
        )}

        {/* Stroke Width */}
        <PropertyRow label="线宽">
          <input
            type="range"
            min="1"
            max="20"
            value={el.strokeWidth}
            onChange={(e) => {
              const v = Number(e.target.value)
              for (const sel of selectedElements) onUpdate(sel.id, { strokeWidth: v })
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs text-gray-400 min-w-[24px] text-right">{el.strokeWidth}</span>
        </PropertyRow>

        {/* Opacity */}
        <PropertyRow label="透明度">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(el.opacity * 100)}
            onChange={(e) => {
              const v = Number(e.target.value) / 100
              for (const sel of selectedElements) onUpdate(sel.id, { opacity: v })
            }}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <span className="text-xs text-gray-400 min-w-[30px] text-right">{Math.round(el.opacity * 100)}%</span>
        </PropertyRow>

        {/* Font Size (text only) */}
        {el.type === 'text' && !multi && (
          <PropertyRow label="字号">
            <input
              type="number"
              min="8"
              max="144"
              value={el.fontSize || 16}
              onChange={(e) => {
                onUpdate(el.id, { fontSize: Number(e.target.value) })
              }}
              className="w-16 px-2 py-1 text-xs border border-gray-200 rounded-md outline-none focus:border-blue-500"
            />
          </PropertyRow>
        )}

        {/* Position */}
        {!multi && (
          <PropertyRow label="位置">
            <span className="text-xs text-gray-400">
              {Math.round(el.x)}, {Math.round(el.y)}
            </span>
          </PropertyRow>
        )}

        {/* Size */}
        {!multi && el.type !== 'freehand' && (
          <PropertyRow label="尺寸">
            <span className="text-xs text-gray-400">
              {Math.round(Math.abs(el.width))} × {Math.round(Math.abs(el.height))}
            </span>
          </PropertyRow>
        )}
      </div>
    </div>
  )
}

function PropertyRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 min-w-[52px] shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 flex-1">
        {children}
      </div>
    </div>
  )
}

function ColorInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={value === 'transparent' ? '#ffffff' : value}
        onChange={(e) => onChange(e.target.value)}
        className="w-7 h-7 rounded border border-gray-200 cursor-pointer p-0.5"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[72px] px-1.5 py-1 text-xs border border-gray-200 rounded-md outline-none focus:border-blue-500 font-mono"
      />
    </div>
  )
}
