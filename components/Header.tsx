'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LogOut, LogIn, UserPlus } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import TodayPickModal from '@/components/TodayPickModal'
import LoginRequiredModal from '@/components/LoginRequiredModal'

type GateTarget = 'register'

const GATE_MESSAGE: Record<GateTarget, string> = {
  register: '맛집을 등록하려면 로그인이 필요합니다.',
}

const GATE_NEXT: Record<GateTarget, string> = {
  register: '/register',
}

export default function Header({ user }: { user: User | null }) {
  const router = useRouter()
  const [pickOpen, setPickOpen] = useState(false)
  const [gate, setGate] = useState<GateTarget | null>(null)

  const nickname = user
    ? (user.user_metadata?.nickname as string) || user.email?.split('@')[0] || '회원'
    : ''

  const handleLogout = async () => {
    await supabase.auth.signOut()
    // 로그아웃해도 공개 목록은 계속 볼 수 있어야 하므로 /login이 아닌 /로 이동
    router.replace('/')
    router.refresh()
  }

  const handlePickClick = () => {
    setPickOpen(true)
  }

  const handleRegisterClick = () => {
    if (!user) {
      setGate('register')
      return
    }
    router.push('/register')
  }

  return (
    <>
      <header className="bg-sky-100/80 backdrop-blur-md border-b border-sky-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
          <div
            className="cursor-pointer flex items-baseline gap-2 shrink-0"
            onClick={() => router.push('/')}
          >
            <h1 className="text-xl sm:text-2xl font-bold text-sky-900 tracking-wide">
              <span aria-hidden="true">🛵</span> 딜리버리픽
            </h1>
            <span className="text-[11px] sm:text-xs text-sky-600 font-sans font-medium inline">
              수도권 배달맛집 Beta
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap justify-end">
            {user && (
              <span className="text-xs font-sans text-sky-800 bg-sky-200/60 px-3 py-1.5 rounded-full font-medium hidden lg:inline-block">
                👤 {nickname}님의 배달노트
              </span>
            )}

            {/* 🌈 오늘 뭐 먹지? — 비회원도 이용 가능 */}
            <button
              type="button"
              onClick={handlePickClick}
              className="animate-rainbow text-white px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-sans font-extrabold shadow-md hover:scale-105 active:scale-95 transition-transform flex items-center gap-1.5 border border-white/40 whitespace-nowrap"
            >
              <span aria-hidden="true">🎲</span>
              <span className="hidden sm:inline">오늘 뭐 먹지?</span>
              <span className="sr-only sm:hidden">오늘 뭐 먹지?</span>
            </button>

            {/* 맛집 등록 — 비회원도 보이지만 클릭 시 로그인 안내 */}
            <button
              type="button"
              onClick={handleRegisterClick}
              className="flex items-center gap-1 bg-sky-500 hover:bg-sky-600 text-white px-2.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-sans transition shadow-sm font-medium whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">맛집 등록</span>
              <span className="sr-only sm:hidden">맛집 등록</span>
            </button>

            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                title="로그아웃"
                aria-label="로그아웃"
                className="p-2 text-sky-700 hover:text-sky-900 hover:bg-sky-200/50 rounded-xl transition shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-1 px-2.5 sm:px-3.5 py-2 border border-sky-300 text-sky-800 hover:text-sky-900 hover:bg-white rounded-xl text-xs sm:text-sm font-sans font-semibold transition whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 sm:hidden" aria-hidden="true" />
                  <span>로그인</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/signup')}
                  className="flex items-center gap-1 px-2.5 sm:px-3.5 py-2 border border-sky-300 text-sky-800 hover:bg-white rounded-xl text-xs sm:text-sm font-sans font-semibold transition whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 sm:hidden" aria-hidden="true" />
                  <span>회원가입</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {pickOpen && <TodayPickModal onClose={() => setPickOpen(false)} />}

      {gate && (
        <LoginRequiredModal
          description={GATE_MESSAGE[gate]}
          next={GATE_NEXT[gate]}
          onClose={() => setGate(null)}
        />
      )}
    </>
  )
}
