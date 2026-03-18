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

  const { password } = await request.json()

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) {
    return NextResponse.json({ error: '房间不存在' }, { status: 404 })
  }

  if (room.password !== password) {
    return NextResponse.json({ error: '密码错误' }, { status: 403 })
  }

  await prisma.roomMember.upsert({
    where: { roomId_userId: { roomId, userId: payload.userId } },
    update: {},
    create: { roomId, userId: payload.userId },
  })

  return NextResponse.json({ success: true })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params

  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = verifyToken(auth.slice(7))
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  await prisma.roomMember.deleteMany({
    where: { roomId, userId: payload.userId }
  })

  return NextResponse.json({ success: true })
}
