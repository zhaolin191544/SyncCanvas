'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { generateId } from '@/utils/id'
import AuthForm from '@/components/AuthForm'

export default function Home() {
  const router = useRouter()
  const { user, loading, logout, token } = useAuth()
  const [roomId, setRoomId] = useState('')
  const [roomPassword, setRoomPassword] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showCreate, setShowCreate] = useState(false)

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createPassword.trim()) {
      setError('Please set a room password')
      return
    }
    setError('')
    setBusy(true)
    try {
      const id = generateId()
      const res = await fetch(`/api/rooms/${id}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: createPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/board/${id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create')
      setBusy(false)
    }
  }

  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomId.trim() || !roomPassword.trim()) {
      setError('Please enter Room ID and password')
      return
    }
    setError('')
    setBusy(true)
    try {
      const checkRes = await fetch(`/api/rooms/${roomId.trim()}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const checkData = await checkRes.json()

      if (!checkData.exists) {
        router.push(`/board/${roomId.trim()}`)
        return
      }

      if (checkData.isMember) {
        router.push(`/board/${roomId.trim()}`)
        return
      }

      const res = await fetch(`/api/rooms/${roomId.trim()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: roomPassword }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push(`/board/${roomId.trim()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join')
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
          <span className="text-sm text-gray-400">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <main className="flex flex-col items-center gap-6 max-w-md w-full">
        {/* Logo & Title */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z" />
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
              <path d="M2 2l7.586 7.586" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">SyncCanvas</h1>
          <p className="text-gray-500 text-center text-sm">Real-time collaborative whiteboard for teams</p>
        </div>

        {!user ? (
          <AuthForm />
        ) : (
          <>
            {/* User card */}
            <div className="flex items-center justify-between w-full bg-white rounded-2xl px-4 py-3 border border-gray-200/80 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-sm font-semibold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-900">{user.username}</span>
              </div>
              <button
                onClick={logout}
                className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                Log out
              </button>
            </div>

            {/* Create room */}
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium text-base shadow-md shadow-blue-200 hover:shadow-lg hover:shadow-blue-300 transition-all active:scale-[0.98]"
              >
                Create New Board
              </button>
            ) : (
              <form onSubmit={createRoom} className="w-full space-y-3">
                <input
                  type="text"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Set room password"
                  className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-shadow"
                  required
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreate(false); setCreatePassword(''); setError('') }}
                    className="flex-1 h-12 rounded-2xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={busy}
                    className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium hover:shadow-md disabled:opacity-50 transition-all"
                  >
                    {busy ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">or join a room</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Join room */}
            <form onSubmit={joinRoom} className="w-full space-y-3">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Room ID"
                className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-shadow"
                required
              />
              <input
                type="password"
                value={roomPassword}
                onChange={(e) => setRoomPassword(e.target.value)}
                placeholder="Room password"
                className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-base outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white transition-shadow"
                required
              />
              <button
                type="submit"
                disabled={busy || !roomId.trim() || !roomPassword.trim()}
                className="w-full h-12 rounded-2xl bg-gray-900 text-white font-medium text-base hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? 'Joining...' : 'Join Room'}
              </button>
            </form>

            {error && (
              <div className="w-full text-red-500 text-sm bg-red-50 px-4 py-2.5 rounded-xl border border-red-100">{error}</div>
            )}

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-3 w-full mt-2">
              {[
                { label: 'Draw Shapes', desc: 'Rectangles, ellipses, arrows' },
                { label: 'Freehand', desc: 'Pen tool drawing' },
                { label: 'Collaborate', desc: 'Real-time sync' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 border border-gray-100 shadow-sm">
                  <span className="text-xs font-medium text-gray-700">{label}</span>
                  <span className="text-[10px] text-gray-400 text-center">{desc}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
