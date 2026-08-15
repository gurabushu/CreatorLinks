'use client'

import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@creator-links/shared'

type User = { name: string; role: UserRole }

type NavItem = {
  href: string
  label: string
  icon: ReactNode
  matchExact?: boolean
  badge?: number
}

const iconClass = 'w-5 h-5'
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const HomeIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1z" />
  </svg>
)
const UserIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)
const GalleryIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="1.5" />
    <path d="M21 15l-5-5-8 8" />
  </svg>
)
const InboxIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2h-16a2 2 0 0 1-2-2v-6z" />
  </svg>
)
const ClipboardIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <rect x="8" y="3" width="8" height="4" rx="1" />
    <path d="M8 5H6a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
  </svg>
)
const WalletIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M3 7a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2H5a2 2 0 0 0 0 4h15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <circle cx="16" cy="11" r="1" />
  </svg>
)
const CalendarIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
)
const MicIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="8" y1="23" x2="16" y2="23" />
  </svg>
)
const MegaphoneIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M3 11v2a2 2 0 0 0 2 2h2l6 4V5L7 9H5a2 2 0 0 0-2 2z" />
    <path d="M17 8a5 5 0 0 1 0 8" />
  </svg>
)
const LifeBuoyIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="4" />
    <path d="M4.93 4.93l4.24 4.24" />
    <path d="M14.83 14.83l4.24 4.24" />
    <path d="M14.83 9.17l4.24-4.24" />
    <path d="M4.93 19.07l4.24-4.24" />
  </svg>
)
const CogIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
  </svg>
)

function SidebarNav({
  user,
  items,
  isActive,
  onNavigate,
  collapsible = false,
}: {
  user: User
  items: NavItem[]
  isActive: (item: NavItem) => boolean
  onNavigate: () => void
  collapsible?: boolean
}) {
  // collapsible=true のときは通常アイコンだけ表示し、親 <aside class="group"> の hover / focus-within で展開
  const hideWhenCollapsed = collapsible ? 'hidden group-hover:block group-focus-within:block' : ''
  const hideInlineWhenCollapsed = collapsible ? 'hidden group-hover:inline group-focus-within:inline' : ''

  return (
    <>
      <div className={`px-4 pt-4 pb-3 border-b border-purple-100/60 ${hideWhenCollapsed}`}>
        <p className="text-[10px] text-purple-400/80 uppercase tracking-wider">Signed in as</p>
        <p className="font-semibold text-gray-800 truncate">{user.name}</p>
        {user.role === 'PRO' && (
          <span className="mt-1 inline-block bg-amber-50 text-amber-600 text-[10px] px-2 py-0.5 rounded-full font-semibold ring-1 ring-amber-200/60">
            PRO
          </span>
        )}
      </div>

      <nav className="p-2 flex-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsible ? item.label : undefined}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-colors duration-200 ${
              isActive(item)
                ? 'bg-purple-100/70 text-purple-700 font-semibold'
                : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <span className="shrink-0 text-current">{item.icon}</span>
            <span className={`flex-1 truncate whitespace-nowrap ${hideInlineWhenCollapsed}`}>
              {item.label}
            </span>
            {item.badge != null && item.badge > 0 && (
              <span className="bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center shadow-sm shadow-pink-300/40">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {user.role !== 'PRO' && (
        <div className={`p-3 border-t border-purple-100/60 ${hideWhenCollapsed}`}>
          {/* PRO 新規受付は一時停止中。CTA は残しつつ操作不可 (準備中) */}
          <div
            aria-disabled="true"
            className="block text-center bg-gray-200 text-gray-500 text-sm font-semibold px-3 py-2.5 rounded-xl cursor-not-allowed select-none"
          >
            準備中
          </div>
        </div>
      )}
    </>
  )
}

export function SidebarShell({
  user,
  unreadCount,
  announcementUnread,
  children,
}: {
  user: User
  unreadCount: number
  announcementUnread: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const items: NavItem[] = [
    { href: '/dashboard', label: 'マイページ', icon: <HomeIcon />, matchExact: true },
    { href: '/dashboard/profile', label: 'プロフィール', icon: <UserIcon /> },
    { href: '/dashboard/portfolio', label: 'ポートフォリオ', icon: <GalleryIcon /> },
    { href: '/dashboard/matches', label: '応募案件', icon: <InboxIcon />, badge: unreadCount },
    { href: '/projects/manage', label: '案件管理', icon: <ClipboardIcon /> },
    { href: '/dashboard/payouts', label: '入金設定', icon: <WalletIcon /> },
    { href: '/events', label: 'イベント', icon: <MicIcon /> },
    { href: '/dashboard/calendar', label: 'カレンダー', icon: <CalendarIcon /> },
    { href: '/dashboard/account', label: 'アカウント設定', icon: <CogIcon /> },
    { href: '/announcements', label: 'お知らせ', icon: <MegaphoneIcon />, badge: announcementUnread },
    { href: '/support', label: 'サポート・お問い合わせ', icon: <LifeBuoyIcon /> },
    // ADMIN 専用: お知らせ配信管理
    ...(user.role === 'ADMIN'
      ? [{ href: '/admin/announcements', label: 'お知らせ配信 (Admin)', icon: <MegaphoneIcon /> } as NavItem]
      : []),
  ]

  const isActive = (item: NavItem) =>
    item.matchExact ? pathname === item.href : pathname.startsWith(item.href)

  const close = () => setMobileOpen(false)

  return (
    <div>
      <div className="md:hidden sticky top-14 sm:top-16 z-30 bg-white/90 backdrop-blur border-b border-purple-100/60 flex items-center h-11 px-4">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="メニューを開く"
          className="text-gray-600 hover:text-purple-600 flex items-center gap-2 text-sm transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>メニュー</span>
        </button>
      </div>

      {mobileOpen && (
        <>
          <button
            type="button"
            aria-label="メニューを閉じる"
            onClick={close}
            className="md:hidden fixed inset-0 bg-black/40 z-40"
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-white via-purple-50/30 to-white border-r border-purple-100/60 z-50 flex flex-col overflow-y-auto shadow-lg shadow-purple-200/30">
            <div className="px-4 py-3 border-b border-purple-100/60 flex items-center justify-between">
              <p className="font-semibold text-purple-600">メニュー</p>
              <button
                type="button"
                onClick={close}
                aria-label="閉じる"
                className="text-gray-400 hover:text-purple-500 transition-colors"
              >
                ✕
              </button>
            </div>
            <SidebarNav user={user} items={items} isActive={isActive} onNavigate={close} />
          </aside>
        </>
      )}

      <aside
        className="peer group hidden md:flex md:flex-col md:fixed md:left-0 md:top-20 lg:top-24 md:bottom-0 md:w-14 hover:md:w-60 focus-within:md:w-60 transition-[width] duration-300 ease-out md:overflow-y-auto md:overflow-x-hidden md:border-r md:border-purple-100/60 bg-gradient-to-b from-white via-purple-50/30 to-white z-30 hover:shadow-md hover:shadow-purple-200/40"
      >
        <SidebarNav user={user} items={items} isActive={isActive} onNavigate={close} collapsible />
      </aside>

      <div className="md:ml-14 peer-hover:md:ml-60 peer-focus-within:md:ml-60 transition-[margin-left] duration-300 ease-out min-w-0">{children}</div>
    </div>
  )
}
