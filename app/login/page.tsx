'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { sanitizeNext, withNext } from '@/lib/nextPath'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = sanitizeNext(searchParams.get('next'))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 이미 로그인한 사용자도 동일한 next 규칙을 따른다
  useEffect(() => {
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      if (data.session) router.replace(next)
    })
    return () => {
      active = false
    }
  }, [next, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setLoading(true)
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)

    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.')
      return
    }

    router.replace(next)
  }

  return (
    <div className="min-h-screen bg-sky-50/60 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <header className="mb-8 text-center">
        <h1 className="font-serif text-5xl sm:text-6xl font-extrabold text-sky-600 tracking-tight">
          🛵 딜리버리픽
        </h1>
        <p className="font-serif text-sky-700 mt-2 text-base sm:text-lg">
          실패 없는 나만의 배달 맛집 수첩
        </p>
      </header>

      <main className="bg-white rounded-3xl shadow-xl border border-sky-100 overflow-hidden w-full max-w-4xl grid grid-cols-1 md:grid-cols-2">
        <section className="bg-gradient-to-br from-sky-100/70 via-sky-50 to-white p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-sky-100">
          <div className="flex flex-col items-center justify-center p-4 text-center select-none">
            <svg
              className="w-36 h-36 sm:w-44 sm:h-44 drop-shadow-md mb-3"
              viewBox="0 0 200 200"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="100" cy="100" r="90" fill="#E0F2FE" />
              <circle cx="100" cy="100" r="72" fill="#BAE6FD" opacity="0.4" />
              <path d="M50 125C50 90 70 70 100 70C130 70 150 90 150 125H50Z" fill="#0284C7" />
              <rect x="42" y="125" width="116" height="10" rx="5" fill="#0369A1" />
              <circle cx="100" cy="62" r="8" fill="#0369A1" />
              <path
                d="M100 88C95 83 88 86 88 91C88 96 100 104 100 104C100 104 112 96 112 91C112 86 105 83 100 88Z"
                fill="#F43F5E"
              />
            </svg>
          </div>
          <div className="text-center mt-4">
            <p className="font-serif text-lg font-bold text-slate-700 leading-snug">
              맛있는 음식은 삶의 질을 높입니다.
            </p>
            <p className="font-serif text-sm text-slate-500 mt-1">
              당신만의 맛집을 기록하고 관리하세요.
            </p>
          </div>
        </section>

        <section className="p-8 sm:p-10 flex flex-col justify-center bg-white">
          <h2 className="text-xl font-bold text-slate-800 mb-6 font-serif">로그인</h2>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">이메일</label>
              <input
                type="email"
                required
                placeholder="example@delivery.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">비밀번호</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 text-sm"
              />
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold rounded-xl transition shadow-md shadow-sky-100 text-sm disabled:opacity-50 mt-2"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <div className="text-center pt-3 text-xs text-slate-500">
              아직 계정이 없으신가요?{' '}
              <Link
                href={withNext('/signup', next)}
                className="font-bold text-sky-600 hover:text-sky-700 underline underline-offset-4 ml-1"
              >
                회원가입
              </Link>
            </div>

            <div className="text-center pt-1">
              <Link
                href="/"
                className="text-xs text-slate-500 hover:text-sky-600 underline underline-offset-4"
              >
                맛집 목록 둘러보기
              </Link>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sky-600 font-sans text-sm">
          불러오는 중...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
