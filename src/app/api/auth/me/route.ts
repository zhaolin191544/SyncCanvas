import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const payload = verifyToken(auth.slice(7))
  if (!payload) {
    return NextResponse.json({ error: 'Token无效' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, username: true },
  })
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 401 })
  }

  return NextResponse.json({ user })
}
