// lib/pusher-client.ts — クライアントサイド Pusher
// NEXT_PUBLIC_PUSHER_KEY が設定されていない場合は null

import Pusher from 'pusher-js'

let _pusherClient: Pusher | null = null

export function getPusherClient(): Pusher | null {
  if (typeof window === 'undefined') return null
  if (!process.env.NEXT_PUBLIC_PUSHER_KEY) return null

  if (!_pusherClient) {
    _pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'ap3',
      authEndpoint: '/api/pusher/auth',
    })
  }

  return _pusherClient
}

export const isPusherEnabled = () =>
  typeof window !== 'undefined' && Boolean(process.env.NEXT_PUBLIC_PUSHER_KEY)
