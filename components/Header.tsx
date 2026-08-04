'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { MapPin, LogIn, LogOut, Sparkles, Bike } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { getUserAvatarUrl } from '@/lib/userAvatar'

interface HeaderProps {
  user?: any
  onOpenTodayPick?: () => void
  userRegionName?: string | null
  onGetLocation?: () => void
}

export default function Header({
  onOpenTodayPick,
  userRegionName,
  onGetLocation,
}: HeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const avatarUrl = getUserAvatarUrl(user)
  const [savedRegionName, setSavedRegionName] = useState<string | null>(null)

  useEffect(() => {
    setSavedRegionName(localStorage.getItem('deliverypick-region-name'))
  }, [userRegionName])

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      alert(`로그아웃에 실패했습니다: ${error.message}`)
      return
    }
    alert('로그아웃되었습니다.')
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-white/60 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between gap-2">
        {/* 로고 */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="p-1.5 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors">
            <Bike className="w-7 h-7 text-blue-600" />
          </div>
          <span className="font-extrabold text-3xl sm:text-4xl tracking-tight text-slate-800 font-serif group-hover:text-blue-600 transition-colors">
            DeliveryPick
          </span>
        </Link>

        {/* 중앙: 위치 바 */}
        <div className="hidden sm:flex items-center gap-1.5 px-4 py-2 rounded-full bg-sky-50/80 border border-sky-100/80 text-base text-slate-700 min-w-0">
          <MapPin className="w-5 h-5 text-blue-600 shrink-0" />
          <span className="font-medium whitespace-nowrap">
            {userRegionName || savedRegionName || '위치 설정 안 됨'}
          </span>
          {onGetLocation && (
            <button
              onClick={onGetLocation}
              className="ml-1 text-sm text-blue-600 hover:underline font-semibold shrink-0"
            >
              [내 위치]
            </button>
          )}
        </div>

        {/* 우측: 상단 콤팩트 3D 파스텔 무지개 버튼 & 프로필 */}
        <div className="flex items-center gap-2.5">
          {onOpenTodayPick && (
            <button
              onClick={onOpenTodayPick}
              className="btn-top-compact-rainbow-3d"
              title="AI 오늘 뭐먹지? 맛집 룰렛"
            >
              <Sparkles className="w-4 h-4 text-purple-600 animate-pulse" />
              <span>AI 오늘 뭐먹지?</span>
            </button>
          )}

          {user ? (
            <>
              <Link
                href="/mypage"
                className="flex items-center gap-2 p-1 rounded-full hover:bg-slate-100/80 transition-all border border-slate-200/60"
                title="마이페이지"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="프로필"
                    referrerPolicy="no-referrer"
                    className="rounded-full object-cover w-10 h-10 border border-blue-200"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                    {user.email?.slice(0, 2).toUpperCase() || 'MY'}
                  </div>
                )}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 text-sm font-semibold transition-all"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">로그아웃</span>
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-medium transition-all shadow-sm"
              >
                <LogIn className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>로그인</span>
              </Link>
              <Link
                href="/signup"
                className="px-3 sm:px-4 py-2.5 rounded-full border border-blue-200 bg-white hover:bg-blue-50 text-blue-700 text-sm sm:text-base font-semibold transition-all"
              >
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
