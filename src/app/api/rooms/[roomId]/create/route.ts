import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params

  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  const payload = verifyToken(auth.slice(7))
  if (!payload) {
    return NextResponse.json({ error: 'Token无效' }, { status: 401 })
  }

  const { password, name } = await request.json()
  if (!password) {
    return NextResponse.json({ error: '请设置房间密码' }, { status: 400 })
  }

  const existing = await prisma.room.findUnique({ where: { id: roomId } })
  if (existing) {
    return NextResponse.json({ error: '房间已存在' }, { status: 409 })
  }

  const room = await prisma.room.create({
    data: {
      id: roomId,
      name: name || null,
      password,
      creatorId: payload.userId,
      members: {
        create: { userId: payload.userId },
      },
    },
  })

  return NextResponse.json({
    room: { id: room.id, name: room.name, creatorId: room.creatorId },
  })
}
