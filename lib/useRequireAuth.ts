'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/useAuth'

/**
 * 로그인 강제 화면용 훅 (/register, /delivery/[id]/edit).
 * 비로그인 시 현재 경로를 next로 보존한 로그인 화면으로 보낸다.
 */
export function useRequireAuth() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (loading || user) return
    const target = pathname || '/'
    router.replace(`/login?next=${encodeURIComponent(target)}`)
  }, [loading, user, pathname, router])

  return { user, loading }
}
