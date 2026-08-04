export interface DeliveryMenu {
  id: string
  delivery_id: string
  name: string
  price: number
  is_representative: boolean
  sort_order: number
  created_at: string
}

export interface Delivery {
  id: string
  name: string
  category: string
  app_name: string
  min_order: number
  rating: number
  memo: string
  user_id: string
  /** 최초 등록 게시물의 ID. 최초 게시물 자체는 null이다. */
  root_delivery_id?: string | null
  user_nickname?: string
  user_avatar_url?: string
  created_at: string
  image_path?: string | null
  sido?: string | null
  sigungu?: string | null
  kakao_place_id?: string | null
  address?: string | null
  lat?: number | null
  lng?: number | null
  place_url?: string | null
  order_number?: string | null
  is_verified?: boolean
  report_count?: number
  is_hidden?: boolean
  menus?: DeliveryMenu[]
}

export interface Bookmark {
  id: string
  user_id: string
  delivery_id: string
  created_at: string
  delivery?: Delivery
}

export interface Report {
  id: string
  delivery_id: string
  reporter_id: string
  report_type: 'fake' | 'info_update'
  reason: string
  created_at: string
}

export interface DeliveryComment {
  id: string
  delivery_id: string
  user_id: string
  user_nickname: string
  content: string
  created_at: string
}

export interface ReviewGrade {
  emoji: string
  label: string
}

export function getReviewGrade(reviews: Delivery[]): ReviewGrade {
  const photoReviews = reviews.filter((review) => Boolean(review.image_path)).length
  const receiptReviews = reviews.filter((review) => Boolean(review.is_verified)).length

  return getReviewGradeFromCounts(photoReviews, receiptReviews)
}

export function getReviewGradeFromCounts(photoReviews: number, receiptReviews: number): ReviewGrade {
  if (photoReviews >= 15 && receiptReviews >= 10) return { emoji: '🥇', label: '리뷰 달인' }
  if (photoReviews >= 5 && receiptReviews >= 3) return { emoji: '🥈', label: '리뷰 고수' }
  if (photoReviews >= 1) return { emoji: '🌱', label: '리뷰 새싹' }
  return { emoji: '⚪', label: '둘러보는 손님' }
}

export function getRepresentativeMenu(delivery: Delivery): DeliveryMenu | undefined {
  const menus = delivery.menus
  if (!menus || menus.length === 0) return undefined
  return menus.find((m) => m.is_representative) ?? menus[0]
}

export const DELIVERY_SELECT_WITH_MENUS = '*, delivery_menus(*)'

type DeliveryRow = Omit<Delivery, 'menus'> & { delivery_menus?: DeliveryMenu[] | null }

export function normalizeDelivery(row: DeliveryRow): Delivery {
  const { delivery_menus, ...rest } = row
  const menus = Array.isArray(delivery_menus)
    ? [...delivery_menus].sort((a, b) => {
        if (a.is_representative !== b.is_representative) return a.is_representative ? -1 : 1
        return (a.sort_order ?? 0) - (b.sort_order ?? 0)
      })
    : []
  return { ...rest, menus }
}

// 100% 한국어 카테고리 태그 목록
export const CATEGORIES = [
  '전체',
  '치킨',
  '한식',
  '분식',
  '족발·보쌈',
  '피자·양식',
  '버거',
  '샌드위치',
  '샐러드',
  '중식',
  '일식',
  '멕시칸',
  '아시안',
  '도시락',
  '카페·디저트',
  '야식',
  '기타',
] as const

export const FORM_CATEGORIES = CATEGORIES.filter((c) => c !== '전체')

export const CATEGORY_EMOJI: Record<string, string> = {
  치킨: '🍗',
  한식: '🍚',
  분식: '🍢',
  '족발·보쌈': '🍖',
  '피자·양식': '🍕',
  버거: '🍔',
  샌드위치: '🥪',
  샐러드: '🥗',
  중식: '🥟',
  일식: '🍣',
  멕시칸: '🌮',
  아시안: '🍜',
  도시락: '🍱',
  '카페·디저트': '🍰',
  야식: '🌙',
  기타: '🍽️',
}

export const APP_NAMES = ['배달의민족', '쿠팡이츠', '요기요', '기타'] as const

export const SORT_OPTIONS = [
  { key: 'latest', label: '최신등록순' },
  { key: 'rating', label: '평점높은순' },
  { key: 'min_order', label: '최소주문금액 낮은순' },
  { key: 'menu_price', label: '대표메뉴가격 낮은순' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['key']

export function sortDeliveries(items: Delivery[], sortKey: SortKey): Delivery[] {
  const list = [...items]
  switch (sortKey) {
    case 'latest':
      return list.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    case 'rating':
      return list.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    case 'min_order':
      return list.sort((a, b) => (a.min_order ?? 0) - (b.min_order ?? 0))
    case 'menu_price':
      return list.sort((a, b) => {
        const pA = getRepresentativeMenu(a)?.price
        const pB = getRepresentativeMenu(b)?.price
        if (pA === undefined && pB === undefined) return 0
        if (pA === undefined) return 1
        if (pB === undefined) return -1
        return pA - pB
      })
    default:
      return list
  }
}
