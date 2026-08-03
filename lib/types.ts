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
  user_nickname?: string
  created_at: string
  // Supabase Storage의 대표 메뉴 사진 경로 (공개 URL 자체는 저장하지 않는다)
  image_path?: string | null
  // 지역 정보 (모두 선택사항)
  sido?: string | null
  sigungu?: string | null
  // 메뉴는 별도 테이블 (로드 시에만 포함)
  menus?: DeliveryMenu[]
}

// 대표 메뉴 정보를 빠르게 얻기 위한 헬퍼
export function getRepresentativeMenu(delivery: Delivery): DeliveryMenu | undefined {
  const menus = delivery.menus
  if (!menus || menus.length === 0) return undefined
  return menus.find((m) => m.is_representative) ?? menus[0]
}

// deliveries + 메뉴를 함께 조회할 때 쓰는 select 구문
export const DELIVERY_SELECT_WITH_MENUS = '*, delivery_menus(*)'

type DeliveryRow = Omit<Delivery, 'menus'> & { delivery_menus?: DeliveryMenu[] | null }

// Supabase 조회 결과를 Delivery로 정규화 (대표 메뉴 먼저, 그 다음 sort_order)
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

// 카테고리 필터 태그 목록 (전체 포함 17개 버튼)
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

// 등록/수정용 카테고리 목록 ('전체' 제외)
export const FORM_CATEGORIES = CATEGORIES.filter((c) => c !== '전체')

// 카테고리별 이모지 매핑 객체
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

// 목록 정렬 옵션
export const SORT_OPTIONS = [
  { key: 'latest', label: '최신등록순' },
  { key: 'rating', label: '평점높은순' },
  { key: 'min_order', label: '최소주문금액 낮은순' },
  { key: 'menu_price', label: '대표메뉴가격 낮은순' },
] as const

export type SortKey = (typeof SORT_OPTIONS)[number]['key']

// 값이 없는(null) 항목은 항상 뒤로 밀기 위한 헬퍼
const nullsLast = (value: number | null | undefined) =>
  value === null || value === undefined ? Number.POSITIVE_INFINITY : value

// 정렬된 새 배열 반환 (원본 배열은 변경하지 않음)
export function sortDeliveries(items: Delivery[], sortKey: SortKey): Delivery[] {
  const sorted = [...items]
  switch (sortKey) {
    case 'rating':
      return sorted.sort(
        (a, b) =>
          (b.rating ?? 0) - (a.rating ?? 0) ||
          b.created_at.localeCompare(a.created_at)
      )
    case 'min_order':
      return sorted.sort(
        (a, b) =>
          nullsLast(a.min_order) - nullsLast(b.min_order) ||
          b.created_at.localeCompare(a.created_at)
      )
    case 'menu_price':
      return sorted.sort((a, b) => {
        const priceA = getRepresentativeMenu(a)?.price ?? Number.POSITIVE_INFINITY
        const priceB = getRepresentativeMenu(b)?.price ?? Number.POSITIVE_INFINITY
        return priceA - priceB || b.created_at.localeCompare(a.created_at)
      })
    case 'latest':
    default:
      return sorted.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
}
