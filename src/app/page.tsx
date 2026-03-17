'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useLanguage } from '@/contexts/LanguageContext'
import { generateId } from '@/utils/id'
import AuthForm from '@/components/AuthForm'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  LogOut, 
  LayoutDashboard, 
  ArrowRight, 
  Globe, 
  ChevronRight,
  Clock,
  User as UserIcon,
  Monitor,
  PenTool,
  ArrowUpRight,
  Search
} from 'lucide-react'

interface Room {
  id: string
  name: string | null
  createdAt: string
  creator: { username: string }
}

export default function Home() {
  const router = useRouter()
  const { user, loading, logout, token } = useAuth()
  const { t, language, setLanguage } = useLanguage()
  const [showCreate, setShowCreate] = useState(false)
  const [createdRooms, setCreatedRooms] = useState<Room[]>([])
  const [joinedRooms, setJoinedRooms] = useState<Room[]>([])
  const [loadingRooms, setLoadingRooms] = useState(false)
  const [createPassword, setCreatePassword] = useState('')
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user && token) {
      fetchRooms()
    }
  }, [user, token])

  const fetchRooms = async () => {
    setLoadingRooms(true)
    try {
      const res = await fetch('/api/user/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setCreatedRooms(data.createdRooms)
        setJoinedRooms(data.joinedRooms)
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err)
    } finally {
      setLoadingRooms(false)
    }
  }

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createPassword.trim()) return
    setBusy(true)
    try {
      const id = generateId()
      const res = await fetch(`/api/rooms/${id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: createPassword }),
      })
      if (res.ok) router.push(`/board/${id}`)
    } catch (err) {
      setError('Failed to create')
    } finally {
      setBusy(false)
    }
  }

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomId.trim() || !roomPassword.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/rooms/${roomId.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: roomPassword }),
      })
      if (res.ok) router.push(`/board/${roomId.trim()}`)
      else setError('Invalid Room ID or Password')
    } catch (err) {
      setError('Failed to join')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf9]">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-800 rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafaf9] p-4 font-serif">
        <main className="flex flex-col items-center gap-12 max-w-md w-full">
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-center"
            >
              <div className="w-12 h-12 rounded-full border border-stone-200 flex items-center justify-center text-stone-800 italic text-2xl">S</div>
            </motion.div>
            <div className="space-y-2">
              <h1 className="text-3xl font-medium tracking-tight text-stone-900">SyncCanvas</h1>
              <p className="text-stone-500 font-sans text-sm">Quietly elegant collaboration for creative minds.</p>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="w-full"
          >
            <AuthForm />
          </motion.div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] text-stone-900 flex font-sans selection:bg-stone-200">
      {/* Navigation - Minimalist Studio Style */}
      <aside className="w-64 border-r border-stone-200 flex flex-col bg-white">
        <div className="p-8 pb-12">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-8 h-8 rounded-full border border-stone-800 flex items-center justify-center text-stone-800 font-serif italic">S</div>
            <span className="font-semibold text-lg tracking-tight">SyncCanvas</span>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-stone-900 bg-stone-100 rounded-lg transition-colors">
              <LayoutDashboard size={16} strokeWidth={1.5} />
              {t.dashboard}
            </button>
            <button 
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-stone-500 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-all"
            >
              <Globe size={16} strokeWidth={1.5} />
              {language === 'zh' ? 'English' : '中文'}
            </button>
          </nav>
        </div>

        <div className="mt-auto p-6">
          <div className="flex items-center gap-3 p-3 border border-stone-100 rounded-xl bg-stone-50/50">
            <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center text-xs font-medium text-stone-600">
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user.username}</p>
              <p className="text-[10px] text-stone-400">Personal Account</p>
            </div>
            <button 
              onClick={logout} 
              className="p-1.5 text-stone-400 hover:text-stone-900 transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-white/50">
        <div className="max-w-5xl mx-auto p-12">
          <header className="flex items-end justify-between mb-16">
            <div className="space-y-1">
              <h2 className="text-4xl font-serif italic text-stone-900">{t.myBoards}</h2>
              <p className="text-stone-400 text-sm">Where your thoughts take shape.</p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-full text-sm font-medium transition-all shadow-sm"
            >
              <Plus size={18} />
              {t.createBoard}
            </button>
          </header>

          <AnimatePresence>
            {showCreate && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/10 backdrop-blur-sm"
              >
                <motion.div 
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                  className="bg-white border border-stone-200 rounded-3xl p-10 w-full max-w-sm shadow-xl"
                >
                  <h3 className="text-xl font-serif italic mb-6">{t.createBoard}</h3>
                  <form onSubmit={createRoom} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">{t.password}</label>
                      <input
                        type="password"
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder={t.setRoomPassword}
                        className="w-full h-12 bg-stone-50 border-b border-stone-200 px-1 text-sm outline-none focus:border-stone-900 transition-all"
                        required
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3 pt-4">
                      <button
                        type="button"
                        onClick={() => setShowCreate(false)}
                        className="flex-1 h-11 text-sm font-medium text-stone-500 hover:text-stone-900 transition-all"
                      >
                        {t.cancel}
                      </button>
                      <button
                        type="submit"
                        disabled={busy}
                        className="flex-1 h-11 bg-stone-900 text-white text-sm font-medium rounded-full hover:bg-stone-800 transition-all"
                      >
                        {t.create}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-20">
            {/* Quick Join */}
            <div className="bg-stone-50/50 p-8 rounded-[2rem] border border-stone-100 hover:border-stone-200 transition-all group flex flex-col justify-between min-h-[240px]">
              <div>
                <h3 className="text-lg font-serif italic text-stone-900 mb-1">{t.joinBoard}</h3>
                <p className="text-xs text-stone-400 mb-6">Enter details to collaborate.</p>
              </div>
              <form onSubmit={joinRoom} className="space-y-3">
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder={t.roomID}
                  className="w-full h-10 bg-transparent border-b border-stone-200 text-xs outline-none focus:border-stone-800 transition-all"
                />
                <input
                  type="password"
                  value={roomPassword}
                  onChange={(e) => setRoomPassword(e.target.value)}
                  placeholder={t.password}
                  className="w-full h-10 bg-transparent border-b border-stone-200 text-xs outline-none focus:border-stone-800 transition-all"
                />
                <button
                  type="submit"
                  className="w-full h-10 bg-white border border-stone-200 text-stone-900 text-[10px] font-bold uppercase tracking-widest rounded-full hover:bg-stone-900 hover:text-white transition-all mt-4"
                >
                  {t.join}
                </button>
              </form>
            </div>

            {/* Created Rooms */}
            {createdRooms.map((room) => (
              <motion.div
                key={room.id}
                whileHover={{ y: -4 }}
                onClick={() => router.push(`/board/${room.id}`)}
                className="group bg-white p-8 rounded-[2rem] border border-stone-200 hover:border-stone-900 transition-all cursor-pointer flex flex-col justify-between min-h-[240px] shadow-sm hover:shadow-md"
              >
                <div>
                  <div className="w-10 h-10 rounded-full border border-stone-100 flex items-center justify-center text-stone-400 mb-6 group-hover:bg-stone-900 group-hover:text-white transition-colors">
                    <Monitor size={18} strokeWidth={1.5} />
                  </div>
                  <h3 className="text-lg font-medium text-stone-900 truncate tracking-tight">{room.id}</h3>
                  <div className="flex items-center gap-2 mt-2 text-stone-400 text-[10px] font-medium uppercase tracking-wider">
                    <Clock size={12} />
                    {new Date(room.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="pt-6 border-t border-stone-50 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">{t.owner}</span>
                  <div className="w-7 h-7 rounded-full border border-stone-200 flex items-center justify-center text-[10px] font-bold text-stone-600">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {joinedRooms.length > 0 && (
            <div className="space-y-10">
              <h3 className="text-xl font-serif italic text-stone-400">{t.joinedRecently}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {joinedRooms.map((room) => (
                  <motion.div
                    key={room.id}
                    whileHover={{ y: -4 }}
                    onClick={() => router.push(`/board/${room.id}`)}
                    className="group bg-white p-8 rounded-[2rem] border border-stone-100 hover:border-stone-900 transition-all cursor-pointer flex flex-col justify-between min-h-[240px]"
                  >
                    <div>
                      <div className="w-10 h-10 rounded-full border border-stone-50 flex items-center justify-center text-stone-300 mb-6 group-hover:bg-stone-100 group-hover:text-stone-900 transition-colors">
                        <UserIcon size={18} strokeWidth={1.5} />
                      </div>
                      <h3 className="text-lg font-medium text-stone-900 truncate tracking-tight">{room.id}</h3>
                      <p className="text-[10px] font-medium text-stone-400 mt-2 uppercase tracking-widest italic">By {room.creator.username}</p>
                    </div>
                    <div className="pt-6 border-t border-stone-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-stone-200 uppercase tracking-widest">{t.collaborator}</span>
                      <ArrowUpRight size={14} className="text-stone-200 group-hover:text-stone-900 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
