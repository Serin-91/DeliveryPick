import { NextRequest, NextResponse } from 'next/server'

const STATE_COOKIE = 'deliverypick_kakao_state'
const NEXT_COOKIE = 'deliverypick_kakao_next'

function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
  return value
}

function loginErrorRedirect(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.nextUrl.origin))
}

export async function GET(request: NextRequest) {
  const clientId = process.env.KAKAO_REST_API_KEY
  // 이 라우트는 fetch가 아니라 브라우저 전체 이동(window.location.assign)으로 열리므로,
  // 실패 시 JSON을 그대로 보여주면 사용자에게 "알 수 없는 글자"의 원문 응답이 노출된다.
  // 항상 /login 화면으로 리다이렉트해 사람이 읽을 수 있는 에러 문구를 보여준다.
  if (!clientId) return loginErrorRedirect(request, '카카오 REST API 키가 설정되지 않았습니다. 서비스 배포 환경변수를 확인해주세요.')

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
