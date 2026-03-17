import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(
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

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { id: true, name: true, creatorId: true, createdAt: true },
  })

  if (!room) {
    return NextResponse.json({ exists: false })
  }

  const isMember = room.creatorId === payload.userId || await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: payload.userId } },
  }) !== null

  return NextResponse.json({
    exists: true,
    room,
    isMember,
  })
}
