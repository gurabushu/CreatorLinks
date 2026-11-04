'use client'

import { useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@creator-links/shared'

type User = { name: string; role: UserRole; isVerified: boolean }

type PreferredMode = 'ARTIST' | 'CLIENT' | 'HYBRID'
const PREFERRED_MODE_KEY = 'encorecue:preferredMode'
const MORE_OPEN_KEY = 'encorecue:sidebarMoreOpen'

const MODE_LABEL: Record<PreferredMode, string> = {
  ARTIST: '出演モード',
  CLIENT: '依頼モード',
  HYBRID: '両方モード',
}

// localStorage から読む都合でフックに切り出し。SSR では常に 'HYBRID' を返すため
// ハイドレーション前は 'HYBRID' を基準にレンダリングされる。
function usePreferredMode() {
  const [mode, setModeState] = useState<PreferredMode>('HYBRID')
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(PREFERRED_MODE_KEY)
      if (stored === 'ARTIST' || stored === 'CLIENT' || stored === 'HYBRID') {
        setModeState(stored)
      }
    } catch {
      // SSR / strict storage ポリシー下では無視
    }
  }, [])
  const setMode = (next: PreferredMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(PREFERRED_MODE_KEY, next)
    } catch {
      // 無視
    }
  }
  return { mode, setMode }
}

function useMoreOpen(initial: boolean) {
  const [open, setOpenState] = useState(initial)
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(MORE_OPEN_KEY)
      if (stored === 'true') setOpenState(true)
      if (stored === 'false') setOpenState(false)
    } catch {
      // 無視
    }
  }, [])
  const setOpen = (next: boolean) => {
    setOpenState(next)
    try {
      window.localStorage.setItem(MORE_OPEN_KEY, String(next))
    } catch {
      // 無視
    }
  }
  return { open, setOpen }
}

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
const ShieldIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)
const BellIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
)
const ChartIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
)
const UsersIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const SearchIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.5" y2="16.5" />
  </svg>
)
const HeartIcon = () => (
  <svg className={iconClass} {...iconProps}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
)

// ロール別の TOP5 固定順。href で参照するので label 変更に強い。
const PIN_HREFS: Record<PreferredMode, string[]> = {
  ARTIST: [
    '/dashboard',
    '/dashboard/matches',
    '/projects',
    '/dashboard/portfolio',
    '/dashboard/payouts',
  ],
  CLIENT: [
    '/dashboard',
    '/dashboard/matches',
    '/artists',
    '/projects/manage',
    '/dashboard/payouts',
  ],
  HYBRID: [
    '/dashboard',
    '/dashboard/matches',
    '/artists',
    '/projects',
    '/dashboard/portfolio',
  ],
}

function RoleTogglePill({
  mode,
  onChange,
}: {
  mode: PreferredMode
  onChange: (next: PreferredMode) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative px-3 pb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-full bg-zinc-50 hover:bg-zinc-100 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-purple-600 text-white font-medium text-[11px]">
          {MODE_LABEL[mode]}
        </span>
        <span className="text-zinc-500 text-[11px] pr-1">切替 ▾</span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            className="absolute left-3 right-3 mt-1 z-50 bg-white rounded-xl border border-zinc-200 shadow-lg overflow-hidden"
          >
            {(['ARTIST', 'CLIENT', 'HYBRID'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="menuitem"
                onClick={() => {
                  onChange(m)
                  setOpen(false)
                }}
                className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                  m === mode
                    ? 'bg-purple-50 text-purple-700 font-semibold'
                    : 'text-zinc-700 hover:bg-purple-50'
                }`}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NavLink({
  item,
  active,
  onClick,
}: {
  item: NavItem
  active: boolean
  onClick: () => void
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm mb-0.5 transition-colors duration-200 ${
        active
          ? 'bg-purple-100/70 text-purple-700 font-semibold'
          : 'text-gray-600 hover:bg-purple-50 hover:text-purple-700'
      }`}
    >
      <span className="shrink-0 text-current">{item.icon}</span>
      <span className="flex-1 truncate whitespace-nowrap">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="bg-zinc-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold min-w-[18px] text-center shadow-sm shadow-zinc-300/40">
          {item.badge > 99 ? '99+' : item.badge}
        </span>
      )}
    </Link>
  )
}

function SidebarNav({
  user,
  items,
  isActive,
  onNavigate,
  mode,
  setMode,
}: {
  user: User
  items: NavItem[]
  isActive: (item: NavItem) => boolean
  onNavigate: () => void
  mode: PreferredMode
  setMode: (next: PreferredMode) => void
}) {
  const { open: moreOpen, setOpen: setMoreOpen } = useMoreOpen(false)

  const pinnedHrefs = PIN_HREFS[mode]
  const pinned = pinnedHrefs
    .map((h) => items.find((i) => i.href === h))
    .filter((v): v is NavItem => v !== undefined)
  const pinnedSet = new Set(pinned.map((i) => i.href))
  const rest = items.filter((i) => !pinnedSet.has(i.href))

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Signed in as</p>
        <p className="font-semibold text-zinc-800 truncate">{user.name}</p>
      </div>

      <RoleTogglePill mode={mode} onChange={setMode} />

      <nav className="px-2 flex-1">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-3 pb-1">
          よく使う
        </p>
        {pinned.map((item) => (
          <NavLink key={item.href} item={item} active={isActive(item)} onClick={onNavigate} />
        ))}

        <div className="my-2 mx-3 border-t border-zinc-200" />

        <button
          type="button"
          onClick={() => setMoreOpen(!moreOpen)}
          className="w-full flex items-center justify-between px-3 pb-1 text-[10px] font-bold text-zinc-500 uppercase tracking-wider hover:text-purple-600 transition-colors"
          aria-expanded={moreOpen}
        >
          <span>もっと見る</span>
          <span className="text-[10px]">{moreOpen ? '▾' : '▸'}</span>
        </button>
        {moreOpen &&
          rest.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item)} onClick={onNavigate} />
          ))}
      </nav>
    </>
  )
}

export function SidebarShell({
  user,
  unreadCount,
  announcementUnread,
  notificationUnread,
  children,
}: {
  user: User
  unreadCount: number
  announcementUnread: number
  notificationUnread: number
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { mode, setMode } = usePreferredMode()

  const items: NavItem[] = [
    { href: '/dashboard', label: 'ダッシュボード', icon: <HomeIcon />, matchExact: true },
    { href: '/dashboard/matches', label: '応募案件', icon: <InboxIcon />, badge: unreadCount },
    { href: '/artists', label: 'クリエイター', icon: <MicIcon /> },
    { href: '/projects', label: '案件を探す', icon: <SearchIcon /> },
    { href: '/projects/manage', label: '案件管理', icon: <ClipboardIcon /> },
    { href: '/dashboard/portfolio', label: 'ポートフォリオ', icon: <GalleryIcon /> },
    { href: '/dashboard/payouts', label: '入金設定', icon: <WalletIcon /> },
    { href: '/dashboard/notifications', label: '通知', icon: <BellIcon />, badge: notificationUnread },
    { href: '/dashboard/profile', label: 'プロフィール', icon: <UserIcon /> },
    // 2026-10-17 fee-only pivot: CRM と分析は全ユーザー解放
    { href: '/dashboard/crm', label: '顧客一覧 (CRM)', icon: <UsersIcon /> },
    { href: '/dashboard/analytics', label: 'プロフィール分析', icon: <ChartIcon /> },
    { href: '/events', label: 'イベント', icon: <MegaphoneIcon /> },
    { href: '/dashboard/following', label: 'フォロー中', icon: <HeartIcon /> },
    { href: '/dashboard/calendar', label: 'カレンダー', icon: <CalendarIcon /> },
    { href: '/dashboard/account', label: 'アカウント設定', icon: <CogIcon /> },
    { href: '/announcements', label: 'お知らせ', icon: <MegaphoneIcon />, badge: announcementUnread },
    { href: '/support', label: 'サポート・お問い合わせ', icon: <LifeBuoyIcon /> },
    // ADMIN 専用。/admin は matchExact にしないと /admin/* と両方 highlight してしまう
    ...(user.role === 'ADMIN'
      ? [
          { href: '/admin', label: '管理ダッシュボード (Admin)', icon: <ShieldIcon />, matchExact: true } as NavItem,
          { href: '/admin/support', label: 'サポート受信箱 (Admin)', icon: <LifeBuoyIcon /> } as NavItem,
          { href: '/admin/payments', label: '決済管理 (Admin)', icon: <WalletIcon /> } as NavItem,
          { href: '/admin/announcements', label: 'お知らせ配信 (Admin)', icon: <MegaphoneIcon /> } as NavItem,
          { href: '/admin/reservations', label: '事前登録 (Admin)', icon: <UserIcon /> } as NavItem,
        ]
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
            className="md:hidden fixed inset-0 bg-gray-900 z-40"
          />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-purple-100 z-50 flex flex-col overflow-y-auto shadow-lg">
            <div className="px-4 py-3 border-b border-purple-100 flex items-center justify-between">
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
            <SidebarNav
              user={user}
              items={items}
              isActive={isActive}
              onNavigate={close}
              mode={mode}
              setMode={setMode}
            />
          </aside>
        </>
      )}

      <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-20 lg:top-24 md:bottom-0 md:w-60 md:border-r md:border-purple-100/60 bg-white md:overflow-y-auto md:overflow-x-hidden z-30">
        <SidebarNav
          user={user}
          items={items}
          isActive={isActive}
          onNavigate={close}
          mode={mode}
          setMode={setMode}
        />
      </aside>

      <div className="md:ml-60 min-w-0">{children}</div>
    </div>
  )
}
