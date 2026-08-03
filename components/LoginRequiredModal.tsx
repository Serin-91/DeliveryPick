'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, UserPlus, X } from 'lucide-react'
import { withNext } from '@/lib/nextPath'

/**
 * 로그인이 필요한 기능을 비회원이 눌렀을 때 뜨는 안내 모달.
 * alert() 대신 재사용 가능한 접근성 모달로 제공한다.
 */
export default function LoginRequiredModal({
  description,
  next,
  onClose,
}: {
  /** 본문 안내 문구 (기능별로 다르게 전달) */
  description: string
  /** 로그인/회원가입 후 돌아올 내부 경로 */
  next: string
  onClose: () => void
}) {
  const router = useRouter()
  const cancelRef = useRef<HTMLButtonElement>(null)

  // Esc로 닫기
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // 열릴 때 포커스를 모달 안으로 이동
  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  const go = (basePath: '/login' | '/signup') => {
    onClose()
    router.push(withNext(basePath, next))
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-required-title"
        aria-describedby="login-required-desc"
        className="bg-white rounded-3xl shadow-2xl border border-sky-100 w-full max-w-sm p-6 space-y-4 font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center pt-1 space-y-2">
          <div className="text-3xl" aria-hidden="true">
            🔒
          </div>
          <h2 id="login-required-title" className="font-serif text-lg font-bold text-slate-800">
            로그인이 필요한 서비스입니다
          </h2>
          <p
            id="login-required-desc"
            className="text-xs text-slate-500 leading-relaxed whitespace-pre-line"
          >
            {description}
          </p>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => go('/login')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-bold transition shadow-sm"
          >
            <LogIn className="w-4 h-4" /> 로그인
          </button>
          <button
            type="button"
            onClick={() => go('/signup')}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-sky-200 text-sky-700 hover:bg-sky-50 rounded-xl text-sm font-bold transition"
          >
            <UserPlus className="w-4 h-4" /> 회원가입
          </button>
          <button
            ref={cancelRef}
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium transition"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}
