import type { DeliveryMenu } from '@/lib/types'

// 맛집당 등록 가능한 최대 메뉴 수 (DB 트리거와 동일한 값)
export const MAX_MENUS = 30

export function formatPriceInput(value: string | number): string {
  const digits = String(value).replace(/[^0-9]/g, '')
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

export function parsePriceInput(value: string): number {
  return Number(value.replace(/,/g, '')) || 0
}


// 등록/수정 폼에서 다루는 메뉴 한 줄 (입력 중에는 가격이 문자열)
export interface MenuFormRow {
  id: string
  name: string
  price: string
  is_representative: boolean
}

// 중간 줄 삭제 시 인덱스가 바뀌어도 각 줄의 입력 포커스를 안정적으로 유지하기 위한 고유 id
export function createRowId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `row-${Math.random().toString(36).slice(2)}`
}

// DB에 저장할 형태
export interface MenuPayloadRow {
  name: string
  price: number
  is_representative: boolean
  sort_order: number
}

// 신규 등록 시 기본 1줄 (첫 줄이 곧 대표 메뉴)
export function createInitialMenuRows(): MenuFormRow[] {
  return [{ id: createRowId(), name: '', price: '', is_representative: true }]
}

// DB에서 불러온 메뉴를 폼 입력값으로 변환
export function toMenuRows(menus: DeliveryMenu[] | undefined | null): MenuFormRow[] {
  if (!menus || menus.length === 0) return createInitialMenuRows()

  const rows = [...menus]
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .slice(0, MAX_MENUS)
    .map((m) => ({
      id: createRowId(),
      name: m.name ?? '',
      price: m.price === null || m.price === undefined ? '' : formatPriceInput(m.price),
      is_representative: Boolean(m.is_representative),
    }))

  // 대표 메뉴가 없으면 첫 줄을 대표로 보정
  if (!rows.some((r) => r.is_representative)) {
    rows[0] = { ...rows[0], is_representative: true }
  }
  return rows
}

// tsconfig가 strict: false 이므로 판별 유니온 대신 단일 형태로 둔다
export interface MenuValidation {
  ok: boolean
  error?: string
  rows?: MenuPayloadRow[]
}

/**
 * 메뉴 입력값 검증.
 * - 이름/가격 둘 다 비어있는 줄은 "미입력"으로 보고 무시
 * - 한쪽만 채워진 줄은 오류
 * - 대표 메뉴는 정확히 1개
 */
export function validateMenuRows(rows: MenuFormRow[]): MenuValidation {
  const touched = (rows || []).filter((r) => r.name.trim() !== '' || r.price.trim() !== '')

  if (touched.length === 0) {
    return { ok: false, error: '메뉴를 최소 1개 등록해 주세요.' }
  }
  if (touched.length > MAX_MENUS) {
    return { ok: false, error: `메뉴는 최대 ${MAX_MENUS}개까지 등록할 수 있습니다.` }
  }
  if (touched.some((r) => r.name.trim() === '')) {
    return { ok: false, error: '메뉴명을 입력하지 않은 항목이 있습니다.' }
  }
  if (touched.some((r) => r.price.trim() === '')) {
    return { ok: false, error: '가격을 입력하지 않은 메뉴가 있습니다.' }
  }
  if (touched.some((r) => !Number.isInteger(parsePriceInput(r.price)) || parsePriceInput(r.price) <= 0)) {
    return { ok: false, error: '가격은 1원 이상의 정수로 입력해 주세요.' }
  }

  const repCount = touched.filter((r) => r.is_representative).length
  if (repCount === 0) return { ok: false, error: '대표 메뉴를 1개 선택해 주세요.' }
  if (repCount > 1) return { ok: false, error: '대표 메뉴는 1개만 선택할 수 있습니다.' }

  const names = touched.map((r) => r.name.trim())
  if (new Set(names).size !== names.length) {
    return { ok: false, error: '같은 메뉴명이 중복되었습니다.' }
  }

  return {
    ok: true,
    rows: touched.map((r, idx) => ({
      name: r.name.trim(),
      price: parsePriceInput(r.price),
      is_representative: r.is_representative,
      sort_order: idx,
    })),
  }
}
