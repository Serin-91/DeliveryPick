import { NextRequest, NextResponse } from 'next/server'

const TOKEN_COOKIE = 'deliverypick_kakao_id_token'

export async function GET(request: NextRequest) {
  const idToken = request.cookies.get(TOKEN_COOKIE)?.value
  const response = idToken
    ? NextResponse.json({ idToken })
    : NextResponse.json({ idToken: null }, { status: 404 })
  response.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    path: '/',
  })
  return response
}
