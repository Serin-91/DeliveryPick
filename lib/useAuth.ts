'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

/**
 * 공개 화면용 선택 인증 훅.
 * 로그인 여부만 알려주고 절대 리다이렉트하지 않는다.
 * 세션이 없어도 반드시 loading=false 가 된다.
 */
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return
        setUser(data.session?.user ?? null)
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setLoading(false)
      })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      const nextUser = session?.user ?? null
      // 같은 사용자면 참조를 유지해 불필요한 리렌더를 막는다
      setUser((prev) => (prev?.id === nextUser?.id ? prev : nextUser))
      setLoading(false)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { user, loading }
}
