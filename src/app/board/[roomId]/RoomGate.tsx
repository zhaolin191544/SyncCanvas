'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

type GateState = 'loading' | 'authorized' | 'need-password' | 'need-create'

interface RoomGateProps {
  roomId: string
  children: ReactNode
}

export default function RoomGate({ roomId, children }: RoomGateProps) {
  const { user, token, loading: authLoading } = useAuth()
  const router = useRouter()
  const [state, setState] = useState<GateState>('loading')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user || !token) {
      router.replace('/')
      return
    }

    fetch(`/api/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (!data.exists) {
          setState('need-create')
        } else if (data.isMember) {
          setState('authorized')
        } else {
          setState('need-password')
        }
      })
      .catch(() => setState('need-create'))
  }, [roomId, user, token, authLoading, router])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState('authorized')
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败')
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) return
    setError('')
    setBusy(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setState('authorized')
    } catch (err) {
      setError(err instanceof Error ? err.message : '加入失败')
    } finally {
      setBusy(false)
    }
  }

  if (authLoading || state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-gray-400">加载中...</div>
      </div>
    )
  }

  if (state === 'authorized') {
    return <>{children}</>
  }

  const isCreate = state === 'need-create'

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">
            {isCreate ? '创建房间' : '加入房间'}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            {isCreate
              ? '该房间尚未创建，你将成为管理员。请设置房间密码。'
              : '请输入房间密码以加入。'}
          </p>
          <p className="text-xs text-gray-400 mb-4 font-mono">Room: {roomId}</p>

          <form onSubmit={isCreate ? handleCreate : handleJoin} className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isCreate ? '设置房间密码' : '输入房间密码'}
              className="w-full h-11 rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
              autoFocus
            />

            {error && (
              <div className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/')}
                className="flex-1 h-11 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                返回首页
              </button>
              <button
                type="submit"
                disabled={busy || !password.trim()}
                className="flex-1 h-11 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {busy ? '处理中...' : isCreate ? '创建' : '加入'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
