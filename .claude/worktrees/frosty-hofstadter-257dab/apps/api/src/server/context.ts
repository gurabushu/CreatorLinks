import type { PrismaClient } from '@prisma/client'
import { prisma } from '../db'
import * as jose from 'jose'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: 'GENERAL' | 'PRO' | 'ADMIN'
}

export interface Session {
  user: SessionUser
}

export interface Context {
  prisma: PrismaClient
  session: Session | null
}

// NextAuth v5 の JWT を jose で検証
async function verifyNextAuthJwt(token: string): Promise<Session | null> {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) return null

  try {
    // NextAuth v5 は JWE (暗号化 JWT) を使用
    const secretKey = new TextEncoder().encode(secret)
    const { payload } = await jose.jwtDecrypt(token, secretKey)

    const id = payload['id'] as string | undefined
    const email = payload['email'] as string | undefined
    const name = payload['name'] as string | undefined
    const role = payload['role'] as string | undefined

    if (!id || !email) return null

    return {
      user: {
        id,
        email,
        name: name ?? '',
        role: (role as SessionUser['role']) ?? 'GENERAL',
      },
    }
  } catch {
    // トークンが不正 or 期限切れ
    return null
  }
}

// tRPC コンテキスト生成関数
export async function createContext(authHeader: string | null): Promise<Context> {
  let session: Session | null = null

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    session = await verifyNextAuthJwt(token)
  }

  return { prisma, session }
}
