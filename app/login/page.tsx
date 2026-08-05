'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { LogIn, Sparkles, Lock, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { getSocialAuthErrorMessage } from '@/lib/socialAuth'
import type { SocialProvider } from '@/lib/socialAuth'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGoogleNotice, setShowGoogleNotice] = useState(false)

  // 카카오 로그인 API 라우트(/api/auth/kakao/start·callback)가 실패 시 ?error=로 돌려주는 안내문을 보여준다.
  // useSearchParams 훅 대신 window.location으로 읽어 Suspense 경계 없이도 동작하게 한다.
  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get('error')
    if (error) alert(error)
  }, [])

  // 이메일 로그인
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        alert('로그인 실패: ' + error.message)
      } else {
        const next = new URLSearchParams(window.location.search).get('next')
        router.push(next?.startsWith('/') && !next.startsWith('//') ? next : '/')
      }
    } catch {
      alert('로그인 처리 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 소셜 로그인 (카카오 / 구글)
  const handleSocialLogin = async (provider: SocialProvider) => {
    if (provider === 'kakao') {
      window.location.assign('/api/auth/kakao/start')
      return
    }

    if (provider === 'google') {
      setShowGoogleNotice(true)
      return
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/signup?social=1`,
        },
      })
      if (error) alert(getSocialAuthErrorMessage(provider, error.message))
    } catch {
      alert('소셜 로그인 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-50 via-slate-50 to-sky-100 font-serif">
      <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border border-white/80 rounded-3xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-4xl mb-2 hover:scale-110 transition-transform">
            🛵
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">딜리버리픽 로그인</h1>
          <p className="text-xs text-slate-500 mt-1">
            나만의 배달 맛집을 기록하고 소중한 단골 집을 관리하세요.
          </p>
        </div>

        {/* 카카오 / 구글 소셜 로그인 */}
        <div className="space-y-2.5 mb-6">
          <button
            onClick={() => handleSocialLogin('kakao')}
            className="w-full py-3 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FADA0A] text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
          >
            <span>💬 카카오 1초 로그인 / 회원가입</span>
          </button>

          <button
            type="button"
            onClick={() => handleSocialLogin('google')}
            className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-not-allowed opacity-70"
          >
            <span>🌐 Google 계정으로 로그인 / 회원가입</span>
          </button>
          {showGoogleNotice && (
            <p className="text-center text-[11px] text-slate-400">서비스 준비중입니다</p>
          )}
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative px-3 bg-white text-[11px] text-slate-400">또는 이메일 로그인</span>
        </div>

        <form onSubmit={handleEmailLogin} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">이메일 주소</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@delivery.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {loading ? '로그인 처리 중...' : '이메일 로그인'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 font-bold hover:underline">
            회원가입 하기
          </Link>
        </div>
      </div>
    </div>
  )
}
