import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payload = verifyToken(auth.slice(7))
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  const userId = payload.userId

  // Fetch rooms created by the user
  const createdRooms = await prisma.room.findMany({
    where: { creatorId: userId },
    orderBy: { createdAt: 'desc' },
    include: {
      creator: { select: { username: true } }
    }
  })

  // Fetch rooms the user is a member of (excluding created ones if they are also members)
  const joinedMemberships = await prisma.roomMember.findMany({
    where: { 
      userId,
      room: {
        NOT: { creatorId: userId }
      }
    },
    include: {
      room: {
        include: {
          creator: { select: { username: true } }
        }
      }
    },
    orderBy: { joinedAt: 'desc' }
  })

  const joinedRooms = joinedMemberships.map(m => m.room)

  return NextResponse.json({ createdRooms, joinedRooms })
}
