import type { User } from '@supabase/supabase-js'

export function getUserAvatarUrl(user: User | null | undefined): string | null {
  if (!user) return null
  const identityData = user.identities?.map((identity) => identity.identity_data || {}) || []
  const sources = [user.user_metadata || {}, ...identityData]
  const keys = ['avatar_url', 'picture', 'profile_image_url', 'thumbnail_image_url']

  for (const source of sources) {
    for (const key of keys) {
      const value = source[key]
      if (typeof value === 'string' && /^https?:\/\//i.test(value)) return value
    }
  }
  return null
}
