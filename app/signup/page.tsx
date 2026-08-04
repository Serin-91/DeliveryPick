'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { sanitizeNext, withNext } from '@/lib/nextPath'
import { getSocialAuthErrorMessage } from '@/lib/socialAuth'
import type { SocialProvider } from '@/lib/socialAuth'
import { getUserAvatarUrl } from '@/lib/userAvatar'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = sanitizeNext(searchParams.get('next'))
  const isSocialNicknameSetup = searchParams.get('social') === '1'
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [emailError, setEmailError] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  const [nicknameSuccess, setNicknameSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingNickname, setCheckingNickname] = useState(false)
  const [isNicknameVerified, setIsNicknameVerified] = useState(false)
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null)
  const [socialUserId, setSocialUserId] = useState<string | null>(null)
  const [checkingSocialProfile, setCheckingSocialProfile] = useState(isSocialNicknameSetup)

  const showMatchStatus = passwordConfirm.length > 0
  const passwordsMatch = password === passwordConfirm

  const handleSocialSignUp = async (provider: SocialProvider) => {
    if (provider === 'kakao') {
      window.location.assign(`/api/auth/kakao/start?next=${encodeURIComponent(next)}`)
      return
    }

    setSocialLoading(provider)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/signup?social=1&next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      setSocialLoading(null)
      alert(getSocialAuthErrorMessage(provider, error.message))
    }
  }

  // 소셜 로그인 사용자는 서비스 프로필의 닉네임 유무에 따라 분기한다.
  useEffect(() => {
    let active = true
    const checkSession = async () => {
      if (isSocialNicknameSetup) {
        const tokenResponse = await fetch('/api/auth/kakao/token', { cache: 'no-store' })
        if (tokenResponse.ok) {
          const { idToken } = await tokenResponse.json() as { idToken: string }
          const { error } = await supabase.auth.signInWithIdToken({ provider: 'kakao', token: idToken })
          if (error) {
            setFormError('카카오 로그인 처리에 실패했습니다. 다시 시도해주세요.')
            setCheckingSocialProfile(false)
            return
          }
        }
      }

      const { data } = await supabase.auth.getSession()
      if (!active) return

      if (!isSocialNicknameSetup) {
        if (data.session) router.replace(next)
        return
      }

      const user = data.session?.user
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!active) return
      if (error) {
        setFormError('회원 프로필을 확인할 수 없습니다. 데이터베이스 설정을 확인해주세요.')
        setCheckingSocialProfile(false)
        return
      }
      if (profile?.nickname?.trim()) {
        router.replace(next)
        return
      }

      setSocialUserId(user.id)
      setCheckingSocialProfile(false)
    }
    checkSession()
    return () => {
      active = false
    }
  }, [isSocialNicknameSetup, next, router])

  // 닉네임 중복 체크 함수
  const checkNickname = async (targetNickname: string, silent = false): Promise<boolean> => {
    const trimmed = targetNickname.trim()
    if (!trimmed) {
      if (!silent) setNicknameError('사용하실 닉네임을 입력하세요.')
      return false
    }

    if (!silent) {
      setCheckingNickname(true)
      setNicknameError('')
      setNicknameSuccess('')
    }

    try {
      // 1. Supabase RPC check_nickname_exists 호출 시도
      const { data: isDuplicate, error: rpcError } = await supabase.rpc('check_nickname_exists', {
        input_nickname: trimmed,
      })

      if (!rpcError && typeof isDuplicate === 'boolean') {
        if (isDuplicate) {
          setNicknameError('이미 사용 중인 닉네임입니다.')
          setIsNicknameVerified(false)
          if (!silent) setCheckingNickname(false)
          return false
        } else {
          setNicknameSuccess('사용 가능한 닉네임입니다.')
          setIsNicknameVerified(true)
          if (!silent) setCheckingNickname(false)
          return true
        }
      }

      // 2. RPC 미등록 시 deliveries 테이블 작성자 닉네임 fallback 체크
      const { data: existingDeliveries } = await supabase
        .from('deliveries')
        .select('id')
        .ilike('user_nickname', trimmed)
        .limit(1)

      if (existingDeliveries && existingDeliveries.length > 0) {
        setNicknameError('이미 사용 중인 닉네임입니다.')
        setIsNicknameVerified(false)
        if (!silent) setCheckingNickname(false)
        return false
      }

      setNicknameSuccess('사용 가능한 닉네임입니다.')
      setIsNicknameVerified(true)
      if (!silent) setCheckingNickname(false)
      return true
    } catch {
      if (!silent) {
        setNicknameSuccess('사용 가능한 닉네임입니다.')
        setIsNicknameVerified(true)
        setCheckingNickname(false)
      }
      return true
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError('')
    setNicknameError('')
    setPasswordError('')
    setFormError('')

    if (!email || !nickname || !password || !passwordConfirm) {
      setFormError('모든 필수 항목을 입력해주세요.')
      return
    }

    if (!EMAIL_REGEX.test(email)) {
      setEmailError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    if (password.length < 8) {
      setPasswordError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    if (password !== passwordConfirm) {
      setPasswordError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)

    // 회원가입 제출 전 닉네임 중복 최종 점검
    const isNicknameAvailable = await checkNickname(nickname, true)
    if (!isNicknameAvailable) {
      setLoading(false)
      setNicknameError('이미 사용 중인 닉네임입니다.')
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: nickname.trim(),
          display_name: nickname.trim(),
        },
      },
    })

    if (error) {
      setLoading(false)
      if (/already registered|already exists|already been registered/i.test(error.message)) {
        setFormError('이미 가입된 계정 정보입니다.')
      } else {
        setFormError(error.message)
      }
      return
    }

    // 이메일 인증이 켜져 있으면 세션이 없을 수 있으므로 즉시 로그인 시도
    if (!data.session) {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setLoading(false)
        setFormError('회원가입은 완료되었지만 자동 로그인에 실패했습니다. Supabase 대시보드에서 이메일 인증(Confirm email)을 꺼주세요.')
        return
      }
    }

    const { data: currentUserData } = await supabase.auth.getUser()
    if (currentUserData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ user_id: currentUserData.user.id, nickname: nickname.trim() }, { onConflict: 'user_id' })
      if (profileError) {
        setLoading(false)
        setFormError('회원 프로필 저장에 실패했습니다. 데이터베이스 설정을 확인해주세요.')
        return
      }
    }

    setLoading(false)
    alert('회원가입 완료!')
    router.replace(next)
  }

  const handleSocialNicknameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!socialUserId || !isNicknameVerified) {
      setNicknameError('닉네임 중복 확인을 완료해주세요.')
      return
    }

    setLoading(true)
    const trimmed = nickname.trim()
    const isNicknameAvailable = await checkNickname(trimmed, true)
    if (!isNicknameAvailable) {
      setLoading(false)
      setNicknameError('이미 사용 중인 닉네임입니다.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: socialUserId, nickname: trimmed }, { onConflict: 'user_id' })
    if (error) {
      setLoading(false)
      if (error.code === '23505') {
        setNicknameError('이미 사용 중인 닉네임입니다.')
        setIsNicknameVerified(false)
      } else {
        setFormError('닉네임 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
      }
      return
    }

    // 서비스 닉네임은 직접 설정하되 소셜 제공자가 준 프로필 사진은 보존한다.
    const { data: currentUserData } = await supabase.auth.getUser()
    const socialAvatarUrl = getUserAvatarUrl(currentUserData.user)
    await supabase.auth.updateUser({ data: { nickname: trimmed, display_name: trimmed, avatar_url: socialAvatarUrl } })
    setLoading(false)
    router.replace(next)
  }

  if (isSocialNicknameSetup) {
    if (checkingSocialProfile) {
      return <div className="min-h-screen flex items-center justify-center text-sky-600 font-sans text-sm">로그인 정보를 확인하는 중...</div>
    }

    return (
      <div className="min-h-screen bg-sky-50/70 flex items-center justify-center p-4 font-sans">
        <form onSubmit={handleSocialNicknameSave} className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 w-full max-w-md space-y-5">
          <header className="text-center">
            <h1 className="font-serif text-3xl font-extrabold text-sky-600">닉네임 설정</h1>
            <p className="font-serif text-sm text-slate-600 mt-2">서비스에서 사용할 닉네임을 직접 설정해주세요.</p>
          </header>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">닉네임</label>
            <div className="flex gap-2">
              <input type="text" required value={nickname} onChange={(e) => { setNickname(e.target.value); setNicknameError(''); setNicknameSuccess(''); setIsNicknameVerified(false) }} placeholder="사용하실 닉네임을 입력하세요" className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm" />
              <button type="button" onClick={() => checkNickname(nickname)} disabled={checkingNickname || !nickname.trim()} className="px-3.5 py-3 bg-sky-100 text-sky-700 text-xs font-bold rounded-xl whitespace-nowrap disabled:opacity-50">{checkingNickname ? '확인 중...' : '중복 확인'}</button>
            </div>
            {nicknameError && <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1"><AlertCircle className="w-3.5 h-3.5" /> {nicknameError}</p>}
            {nicknameSuccess && <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1"><CheckCircle2 className="w-3.5 h-3.5" /> {nicknameSuccess}</p>}
          </div>
          {formError && <p className="text-xs text-rose-500 font-medium">{formError}</p>}
          <button type="submit" disabled={loading || !isNicknameVerified} className="w-full py-3.5 px-4 bg-sky-500 text-white font-bold rounded-xl disabled:opacity-50">{loading ? '저장 중...' : '가입 완료'}</button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sky-50/70 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="bg-white rounded-3xl shadow-xl border border-sky-100 p-8 sm:p-10 w-full max-w-md my-auto">
        <header className="text-center mb-8">
          <h1 className="font-serif text-3xl font-extrabold text-sky-600 tracking-tight">
            회원가입 <span className="text-xl text-sky-400 font-normal">(Sign Up)</span>
          </h1>
          <p className="font-serif text-sm text-slate-600 mt-2 font-medium">
            🍽️ 딜리버리픽에 오신 것을 환영합니다!
          </p>
        </header>

        <div className="space-y-2.5 mb-6">
          <button
            type="button"
            onClick={() => handleSocialSignUp('kakao')}
            disabled={socialLoading !== null}
            className="w-full py-3 px-4 rounded-2xl bg-[#FEE500] hover:bg-[#FADA0A] text-slate-900 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            💬 {socialLoading === 'kakao' ? '카카오 연결 중...' : '카카오로 로그인 / 회원가입'}
          </button>
          <button
            type="button"
            onClick={() => handleSocialSignUp('google')}
            disabled={socialLoading !== null}
            className="w-full py-3 px-4 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            🌐 {socialLoading === 'google' ? 'Google 연결 중...' : 'Google 계정으로 로그인 / 회원가입'}
          </button>
        </div>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <span className="relative px-3 bg-white text-[11px] text-slate-400">또는 이메일 회원가입</span>
        </div>

        <form onSubmit={handleSignUp} noValidate className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setEmailError('')
              }}
              placeholder="example@email.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400"
            />
            {emailError && <p className="text-xs text-rose-500 font-medium mt-1">{emailError}</p>}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">닉네임</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value)
                  setNicknameError('')
                  setNicknameSuccess('')
                  setIsNicknameVerified(false)
                }}
                placeholder="사용하실 닉네임을 입력하세요"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800 placeholder-slate-400"
              />
              <button
                type="button"
                onClick={() => checkNickname(nickname)}
                disabled={checkingNickname || !nickname.trim()}
                className="px-3.5 py-3 bg-sky-100 hover:bg-sky-200 active:bg-sky-300 text-sky-700 text-xs font-bold rounded-xl whitespace-nowrap transition disabled:opacity-50"
              >
                {checkingNickname ? '확인 중...' : '중복 확인'}
              </button>
            </div>
            {nicknameError && (
              <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1">
                <AlertCircle className="w-3.5 h-3.5" /> {nicknameError}
              </p>
            )}
            {nicknameSuccess && (
              <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> {nicknameSuccess}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setPasswordError('')
              }}
              placeholder="8자 이상 입력해주세요"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">비밀번호 확인</label>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => {
                setPasswordConfirm(e.target.value)
                setPasswordError('')
              }}
              placeholder="********"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-transparent transition text-slate-800"
            />
            {showMatchStatus && (
              passwordsMatch ? (
                <p className="flex items-center gap-1 text-xs text-emerald-600 font-medium mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 비밀번호가 일치합니다.
                </p>
              ) : (
                <p className="flex items-center gap-1 text-xs text-rose-500 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5" /> 비밀번호가 일치하지 않습니다.
                </p>
              )
            )}
            {passwordError && <p className="text-xs text-rose-500 font-medium mt-1">{passwordError}</p>}
          </div>

          {formError && <p className="text-xs text-rose-500 font-medium">{formError}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold rounded-xl transition shadow-md shadow-sky-100 text-sm disabled:opacity-50 mt-2"
          >
            {loading ? '가입 처리 중...' : '회원가입'}
          </button>

          <div className="text-center pt-3 text-xs text-slate-500">
            이미 계정이 있으신가요?{' '}
            <Link
              href={withNext('/login', next)}
              className="font-bold text-sky-600 hover:text-sky-700 underline underline-offset-4 ml-1"
            >
              로그인
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
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sky-600 font-sans text-sm">
          불러오는 중...
        </div>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
