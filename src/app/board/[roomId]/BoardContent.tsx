'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useCanvas } from '@/hooks/useCanvas'
import { useYjs } from '@/collaboration/YjsProvider'
import { useYjsElements } from '@/collaboration/useYjsElements'
import { useAwareness } from '@/collaboration/useAwareness'
import { useUndoManager } from '@/collaboration/useUndoManager'
import { useLanguage } from '@/contexts/LanguageContext'
import Toolbar from '@/components/Toolbar'
import PropertyPanel from '@/components/PropertyPanel'
import ShortcutsCard from '@/components/ShortcutsCard'
import UserPresence from '@/components/UserPresence'
import ConnectionStatusComponent from '@/components/ConnectionStatus'
import MiniMap from '@/components/MiniMap'
import ElementList from '@/components/ElementList'
import type { CanvasElement, Point, Tool } from '@/types/elements'
import { measureText } from '@/engine/elements/Text'
import { exportToPng } from '@/utils/exportPng'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Maximize2, 
  Minimize2, 
  Layers, 
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Radio,
  Eye,
  Share2
} from 'lucide-react'

interface BoardContentProps {
  roomId: string
}

export default function BoardContent({ roomId }: BoardContentProps) {
  const [editingText, setEditingText] = useState<{ element: CanvasElement; screenPos: Point } | null>(null)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [propVersion, setPropVersion] = useState(0)
  const [eraserSize, setEraserSize] = useState(20)
  const [isPresenting, setIsPresenting] = useState(false)
  const [showElementList, setShowElementList] = useState(false)
  const [followingUserId, setFollowingUserId] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { t } = useLanguage()

  const { connectionStatus, userName, userColor, yMetadata, userId: localUserId } = useYjs()

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
  const { remoteUsers, updateCursor, updateCamera, updateSelection, clearCursor } = useAwareness()
  const { undo, redo } = useUndoManager(engineRef)

  // Spotlight Logic
  useEffect(() => {
    const handleMetadataChange = () => {
      const sid = yMetadata.get('spotlightUserId') as string | null
      setFollowingUserId(sid === localUserId ? null : sid)
    }
    yMetadata.observe(handleMetadataChange)
    handleMetadataChange()
    return () => yMetadata.unobserve(handleMetadataChange)
  }, [yMetadata, localUserId])

  useEffect(() => {
    if (!followingUserId) return
    const user = remoteUsers.find(u => u.id === followingUserId)
    if (user?.camera && engineRef.current) {
      engineRef.current.camera.setState(user.camera)
      engineRef.current.markDirty()
    }
  }, [followingUserId, remoteUsers, engineRef])

  useEffect(() => {
    const engine = engineRef.current
    if (!engine) return
    const interval = setInterval(() => {
      if (yMetadata.get('spotlightUserId') === localUserId) {
        updateCamera(engine.camera.getState())
      }
    }, 100)
    return () => clearInterval(interval)
  }, [engineRef, yMetadata, localUserId, updateCamera])

  const startSpotlight = () => yMetadata.set('spotlightUserId', localUserId)
  const stopSpotlight = () => yMetadata.get('spotlightUserId') === localUserId && yMetadata.set('spotlightUserId', null)

  useEffect(() => {
    const handleAddImage = (e: any) => {
      const { src } = e.detail
      if (!engineRef.current || !src) return
      const engine = engineRef.current
      const center = engine.camera.screenToWorld(engine.canvas.clientWidth / 2, engine.canvas.clientHeight / 2)
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        const maxWidth = 800 / engine.camera.zoom
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth }
        const newEl: CanvasElement = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'image', x: center.x - width / 2, y: center.y - height / 2,
          width, height, rotation: 0, strokeColor: '#000000', fillColor: 'transparent',
          strokeWidth: 0, opacity: 1, src, visible: true, locked: false, name: '',
          createdBy: userName, createdAt: Date.now(), zIndex: engine.getNextZIndex(),
        }
        addElement(newEl); engine.addElement(newEl); engine.markDirty()
      }
      img.src = src
    }
    window.addEventListener('add-image', handleAddImage)
    return () => window.removeEventListener('add-image', handleAddImage)
  }, [engineRef, userName, addElement])

  useEffect(() => {
    if (engineRef.current) engineRef.current.setRemoteUsers(remoteUsers)
  }, [remoteUsers, engineRef])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (editingText || document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return
      const keyMap: Record<string, Tool> = { v:'select', r:'rectangle', o:'ellipse', l:'line', a:'arrow', p:'freehand', t:'text', e:'eraser' }
      const tool = keyMap[e.key.toLowerCase()]
      if (tool && !e.ctrlKey && !e.metaKey) changeTool(tool)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [changeTool, editingText])

  useEffect(() => {
    const interval = setInterval(() => {
      if (engineRef.current) setZoomLevel(Math.round(engineRef.current.camera.zoom * 100))
    }, 100)
    return () => clearInterval(interval)
  }, [])

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
        el.width = size.width; el.height = size.height
      }
      if (!text) { engineRef.current.removeElement(el.id); deleteElements([el.id]) }
      else syncElement(el.id)
      engineRef.current.markDirty()
    }
    setEditingText(null)
  }, [editingText, deleteElements, syncElement])

  const handleExport = useCallback(() => {
    if (engineRef.current) {
      exportToPng(engineRef.current.elements)
    }
  }, [engineRef])

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#fdfdfc] flex text-stone-900 font-sans selection:bg-stone-200">
      {/* Designer Grid Background */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      <div className="relative flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />

        {/* Presenter Mode Indicator */}
        <AnimatePresence>
          {followingUserId && (
            <motion.div initial={{ y:-20, opacity:0 }} animate={{ y:20, opacity:1 }} exit={{ y:-20, opacity:0 }} className="absolute top-0 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 shadow-xl">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Watching {remoteUsers.find(u => u.id === followingUserId)?.name}
              <button onClick={() => setFollowingUserId(null)} className="ml-2 hover:text-stone-400"><Minimize2 size={10}/></button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Toolbar - Professional Designer Style */}
        <AnimatePresence>
          {!isPresenting && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-40">
              <Toolbar currentTool={currentTool} onToolChange={changeTool} onExport={handleExport} />
            </div>
          )}
        </AnimatePresence>

        {/* Floating Sidebar Toggles */}
        <div className="absolute top-6 left-6 z-50 flex flex-col gap-2">
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setIsPresenting(!isPresenting)} className={`p-3 rounded-2xl shadow-sm border transition-all ${isPresenting ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}>
            {isPresenting ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
          </motion.button>
          {!isPresenting && (
            <>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => setShowElementList(!showElementList)} className={`p-3 rounded-2xl shadow-sm border transition-all ${showElementList ? 'bg-stone-900 text-white border-stone-900' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}>
                <Layers size={18}/>
              </motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => yMetadata.get('spotlightUserId') === localUserId ? stopSpotlight() : startSpotlight()} className={`p-3 rounded-2xl shadow-sm border transition-all ${yMetadata.get('spotlightUserId') === localUserId ? 'bg-orange-500 text-white border-orange-500 shadow-orange-100' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}>
                <Radio size={18}/>
              </motion.button>
            </>
          )}
        </div>

        {/* Shortcuts & Presence */}
        {!isPresenting && <ShortcutsCard />}
        <UserPresence localUser={{ name: userName, color: userColor }} remoteUsers={remoteUsers} />

        {/* MiniMap & Connection */}
        <div className="absolute bottom-6 left-6 z-40 flex items-center gap-4">
          <ConnectionStatusComponent status={connectionStatus} />
          <MiniMap engineRef={engineRef} canvasRef={canvasRef} />
        </div>

        {/* Zoom Controls - Minimalist */}
        <div className="absolute bottom-6 right-6 z-40 flex items-center bg-white/80 backdrop-blur-sm rounded-2xl p-1 shadow-sm border border-stone-200/50">
          <button className="p-2 text-stone-400 hover:text-stone-900" onClick={() => engineRef.current?.camera.zoomAtPoint(window.innerWidth/2, window.innerHeight/2, 300)}><ZoomOut size={16}/></button>
          <span className="text-[10px] font-bold w-12 text-center text-stone-600">{zoomLevel}%</span>
          <button className="p-2 text-stone-400 hover:text-stone-900" onClick={() => engineRef.current?.camera.zoomAtPoint(window.innerWidth/2, window.innerHeight/2, -300)}><ZoomIn size={16}/></button>
        </div>

        {/* Top Right Header */}
        <div className="absolute top-6 right-6 z-40 flex items-center gap-3">
          <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-2xl border border-stone-200/50 shadow-sm flex items-center gap-3">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest border-r border-stone-100 pr-3">Room</span>
            <span className="text-xs font-medium text-stone-600 font-mono tracking-tight">{roomId.slice(0, 8)}</span>
          </div>
          <button className="p-2.5 bg-stone-900 text-white rounded-2xl hover:bg-stone-800 transition-all shadow-sm"><Share2 size={16}/></button>
        </div>

        {/* Text Area Overlay */}
        <AnimatePresence>
          {editingText && (
            <div className="absolute z-[100]" style={{ left: editingText.screenPos.x, top: editingText.screenPos.y }}>
              <textarea ref={textareaRef} className="bg-white border-2 border-stone-900 text-stone-900 outline-none resize-none font-sans rounded-lg p-2 shadow-2xl transition-all" style={{ fontSize: `${(editingText.element.fontSize || 16) * (engineRef.current?.camera.zoom || 1)}px`, color: editingText.element.strokeColor, minWidth: '120px', minHeight: '40px' }} onBlur={handleTextBlur} onKeyDown={(e) => { if(e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) { e.preventDefault(); handleTextBlur(); } }} />
            </div>
          )}
        </AnimatePresence>

        {!isPresenting && (
          <PropertyPanel selectedElements={Array.from(selectedIds).map(id => engineRef.current?.elements.get(id)).filter(Boolean) as CanvasElement[]} onUpdate={(id, updates) => { if(!engineRef.current) return; const el = engineRef.current.elements.get(id); if(!el) return; Object.assign(el, updates); engineRef.current.markDirty(); updateElement(id, updates); setPropVersion(v => v + 1) }} version={propVersion} />
        )}
      </div>

      {/* Sidebar - Element List */}
      <AnimatePresence>
        {!isPresenting && showElementList && (
          <ElementList 
            elements={Array.from(engineRef.current?.elements.values() || [])} 
            selectedIds={selectedIds} 
            onSelect={(id, multi) => { 
              if(!engineRef.current) return; 
              if(multi) engineRef.current.selection.toggle(id); 
              else { 
                engineRef.current.selection.clearSelection(); 
                engineRef.current.selection.select(id) 
              }; 
              updateSelection(Array.from(engineRef.current.selection.selectedIds)); 
              engineRef.current.markDirty() 
            }} 
            onUpdate={(id, updates) => { 
              updateElement(id, updates); 
              if(engineRef.current) { 
                const el = engineRef.current.elements.get(id); 
                if(el) { Object.assign(el, updates); engineRef.current.markDirty() } 
              } 
            }} 
            onDelete={(id) => { 
              deleteElements([id]); 
              if(engineRef.current) { 
                engineRef.current.removeElement(id); 
                engineRef.current.markDirty() 
              } 
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}
