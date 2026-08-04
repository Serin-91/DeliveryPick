'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Heart, HelpCircle, User } from 'lucide-react'
import { useState } from 'react'
import HelpModal from './HelpModal'

interface BottomNavProps {
  onOpenHelp?: () => void
}

export default function BottomNav({ onOpenHelp }: BottomNavProps) {
  const pathname = usePathname()
  const [localHelpOpen, setLocalHelpOpen] = useState(false)

  return (
    <>
    <nav className="bottom-glass-nav" aria-label="글로벌 네비게이션">
      <Link
        href="/"
        className={`nav-item ${pathname === '/' ? 'active' : ''}`}
      >
        <Home className="w-5 h-5" />
        <span>홈</span>
      </Link>

      <Link
        href="/mypage?tab=bookmarks"
        className={`nav-item ${pathname === '/mypage' ? 'active' : ''}`}
      >
        <Heart className="w-5 h-5 text-rose-500" />
        <span>즐겨찾기</span>
      </Link>

      <button onClick={onOpenHelp || (() => setLocalHelpOpen(true))} className="nav-item" type="button">
        <HelpCircle className="w-5 h-5 text-amber-500" />
        <span>도움말</span>
      </button>

      <Link
        href="/mypage"
        className={`nav-item ${pathname === '/mypage' ? 'active' : ''}`}
      >
        <User className="w-5 h-5" />
        <span>마이페이지</span>
      </Link>
    </nav>
    {!onOpenHelp && <HelpModal isOpen={localHelpOpen} onClose={() => setLocalHelpOpen(false)} />}
    </>
  )
}
