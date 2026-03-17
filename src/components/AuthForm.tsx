'use client'

import { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { motion } from 'framer-motion'
import { ArrowRight, Loader2 } from 'lucide-react'

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, register } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isLogin) await login(username, password)
      else await register(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <form onSubmit={handleSubmit} className="space-y-8 p-10 bg-white border border-stone-200 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)]">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-serif italic text-stone-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p className="text-xs text-stone-400 font-medium">Join our minimalist creative space.</p>
        </div>

        <div className="space-y-5">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-12 bg-stone-50 border border-stone-100 rounded-2xl px-4 text-sm text-stone-900 outline-none focus:border-stone-900 transition-all"
              placeholder="Your unique name"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 bg-stone-50 border border-stone-100 rounded-2xl px-4 text-sm text-stone-900 outline-none focus:border-stone-900 transition-all"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-[10px] font-bold bg-red-50 p-3 rounded-xl border border-red-100 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-stone-900 text-white rounded-full font-medium text-sm flex items-center justify-center gap-2 hover:bg-stone-800 transition-all shadow-sm disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : (
            <>
              {isLogin ? 'Sign In' : 'Sign Up'}
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-[10px] font-bold text-stone-400 hover:text-stone-900 transition-colors uppercase tracking-widest"
          >
            {isLogin ? "Need an account? Sign Up" : "Have an account? Sign In"}
          </button>
        </div>
      </form>
    </div>
  )
}
