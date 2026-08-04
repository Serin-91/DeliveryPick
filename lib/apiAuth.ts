import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * API 라우트(서버)에서 Authorization: Bearer <access_token> 헤더로 로그인 사용자를 검증한다.
 * 브라우저 supabase 클라이언트는 세션을 localStorage에 두므로, 서버 라우트는 쿠키가 아니라
 * 클라이언트가 직접 넘겨주는 access_token을 anon key로 검증하는 방식을 쓴다.
 */
export async function getAuthenticatedUser(req: Request) {
  if (!supabaseUrl || !supabaseAnonKey) return null

  const authHeader = req.headers.get('authorization') || ''
  const token = authHeader.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token) return null

  const supabase = createClient(supabaseUrl, supabaseAnonKey)
  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
