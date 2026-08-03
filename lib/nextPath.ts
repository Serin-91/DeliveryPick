/**
 * 로그인 후 돌아갈 경로(`next`) 처리.
 * 오픈 리다이렉트를 막기 위해 내부 경로만 허용한다.
 */

// 제어문자(개행/탭 등)가 섞인 경로는 거부 — 정규식 리터럴 대신 코드포인트로 검사한다
function hasControlChar(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    const code = value.charCodeAt(i)
    if (code < 0x20 || code === 0x7f) return true
  }
  return false
}

/**
 * 허용: "/" 로 시작하는 내부 경로
 * 차단: 절대 URL(http://evil.com), 프로토콜 상대 경로(//evil.com),
 *       백슬래시 우회(/\evil.com), 제어문자 포함 경로
 * 유효하지 않으면 항상 '/'를 돌려준다.
 */
export function sanitizeNext(raw: string | null | undefined): string {
  if (!raw) return '/'

  const value = raw.trim()
  if (value === '') return '/'
  if (!value.startsWith('/')) return '/'
  if (value.startsWith('//')) return '/'
  if (value.startsWith('/\\')) return '/'
  if (hasControlChar(value)) return '/'

  return value
}

// `next`를 붙인 링크 생성 (기본값 '/' 이면 굳이 붙이지 않는다)
export function withNext(basePath: string, next: string): string {
  const safe = sanitizeNext(next)
  if (safe === '/') return basePath
  return `${basePath}?next=${encodeURIComponent(safe)}`
}
