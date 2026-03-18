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

export async function PATCH(
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

  const { name } = await request.json()
  
  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (room.creatorId !== payload.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await prisma.room.update({
    where: { id: roomId },
    data: { name },
    select: { id: true, name: true }
  })

  return NextResponse.json(updated)
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

  const room = await prisma.room.findUnique({ where: { id: roomId } })
  if (!room) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (room.creatorId !== payload.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Delete memberships first due to lack of cascade in some setups (Prisma handles it if defined, but being explicit is safe)
  await prisma.roomMember.deleteMany({ where: { roomId } })
  await prisma.room.delete({ where: { id: roomId } })

  return NextResponse.json({ success: true })
}
