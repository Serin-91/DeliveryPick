import { NextRequest, NextResponse } from 'next/server'

const STATE_COOKIE = 'deliverypick_kakao_state'
const NEXT_COOKIE = 'deliverypick_kakao_next'

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_REST_API_KEY
  if (!clientId) return NextResponse.json({ error: '카카오 REST API 키가 설정되지 않았습니다.' }, { status: 500 })

  const state = crypto.randomUUID()
  const next = safeNext(request.nextUrl.searchParams.get('next'))
  const callbackUrl = new URL('/api/auth/kakao/callback', request.nextUrl.origin).toString()
  const kakaoAuthorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize')
  kakaoAuthorizeUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: 'code',
    scope: 'openid',
    state,
  }).toString()

  const response = NextResponse.redirect(kakaoAuthorizeUrl)
  const cookieOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', maxAge: 600, path: '/' }
  response.cookies.set(STATE_COOKIE, state, cookieOptions)
  response.cookies.set(NEXT_COOKIE, encodeURIComponent(next), cookieOptions)
  return response
}
