export type SocialProvider = 'kakao' | 'google'

export const SOCIAL_PROVIDER_LABEL: Record<SocialProvider, string> = {
  kakao: '카카오',
  google: 'Google',
}

export function getSocialAuthErrorMessage(provider: SocialProvider, message: string): string {
  const label = SOCIAL_PROVIDER_LABEL[provider]
  if (/provider is not enabled|unsupported provider/i.test(message)) {
    return `${label} 로그인이 아직 활성화되지 않았습니다. Supabase의 Authentication > Providers에서 ${label} Provider를 활성화하고 Client ID와 Secret을 등록해 주세요.`
  }
  return `${label} 로그인/회원가입에 실패했습니다: ${message}`
}
