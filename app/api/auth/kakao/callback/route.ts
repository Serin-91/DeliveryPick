import { NextRequest, NextResponse } from 'next/server'

const STATE_COOKIE = 'deliverypick_kakao_state'
const NEXT_COOKIE = 'deliverypick_kakao_next'
const TOKEN_COOKIE = 'deliverypick_kakao_id_token'

function loginErrorRedirect(request: NextRequest, message: string) {
  return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(message)}`, request.nextUrl.origin))
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const state = request.nextUrl.searchParams.get('state')
  const savedState = request.cookies.get(STATE_COOKIE)?.value
  const next = decodeURIComponent(request.cookies.get(NEXT_COOKIE)?.value ?? '/')

  if (!code || !state || !savedState || state !== savedState) {
    return loginErrorRedirect(request, '카카오 로그인 요청을 확인하지 못했습니다. 다시 시도해주세요.')
  }

  const clientId = process.env.KAKAO_REST_API_KEY
  if (!clientId) return loginErrorRedirect(request, '카카오 REST API 키가 설정되지 않았습니다.')

  const callbackUrl = new URL('/api/auth/kakao/callback', request.nextUrl.origin).toString()
  const body = new URLSearchParams({ grant_type: 'authorization_code', client_id: clientId, redirect_uri: callbackUrl, code })
  if (process.env.KAKAO_CLIENT_SECRET) body.set('client_secret', process.env.KAKAO_CLIENT_SECRET)

  const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
    cache: 'no-store',
  })
  const tokenData = await tokenResponse.json().catch(() => null) as { id_token?: string } | null
  if (!tokenResponse.ok || !tokenData?.id_token) {
    return loginErrorRedirect(request, '카카오 인증 정보를 받아오지 못했습니다. OpenID Connect 설정을 확인해주세요.')
  }

  const redirectUrl = new URL('/signup', request.nextUrl.origin)
  redirectUrl.searchParams.set('social', '1')
  redirectUrl.searchParams.set('next', next.startsWith('/') ? next : '/')
  const response = NextResponse.redirect(redirectUrl)
  const clearOptions = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/' }
  response.cookies.set(STATE_COOKIE, '', { ...clearOptions, maxAge: 0 })
  response.cookies.set(NEXT_COOKIE, '', { ...clearOptions, maxAge: 0 })
  response.cookies.set(TOKEN_COOKIE, tokenData.id_token, { ...clearOptions, maxAge: 60 })
  return response
}
