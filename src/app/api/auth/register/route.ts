import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: '用户名和密码不能为空' }, { status: 400 })
    }
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: '用户名长度应为2-20个字符' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: '密码至少6个字符' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json({ error: '用户名已被使用' }, { status: 409 })
    }

    const passwordHash = await hashPassword(password)
    const user = await prisma.user.create({
      data: { username, passwordHash },
    })

    const token = signToken({ userId: user.id, username: user.username })

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username },
    })
  } catch {
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
