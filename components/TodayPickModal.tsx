'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Dices, ArrowRight } from 'lucide-react'
import { SIDO_LIST, getSigunguList, formatRegion } from '@/lib/regions'
import {
  CATEGORY_EMOJI,
  getRepresentativeMenu,
  DELIVERY_SELECT_WITH_MENUS,
  normalizeDelivery,
} from '@/lib/types'
import type { Delivery } from '@/lib/types'
import { supabase } from '@/lib/supabase'
import StarRating from '@/components/StarRating'

// 주사위 눈(1~6)을 3x3 격자 위 점 위치로 매핑
const DICE_DOTS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
}

function DiceFace({ face }: { face: number }) {
  const dots = DICE_DOTS[face] ?? DICE_DOTS[1]
  return (
    <div className="w-28 h-28 sm:w-32 sm:h-32 bg-white rounded-3xl shadow-xl border-4 border-sky-200 grid grid-cols-3 grid-rows-3 gap-1 p-3.5">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="flex items-center justify-center">
          {dots.includes(i) && (
            <span className="block w-4 h-4 sm:w-[18px] sm:h-[18px] rounded-full bg-sky-600 shadow-inner" />
          )}
        </div>
      ))}
    </div>
  )
}

export default function TodayPickModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const [items, setItems] = useState<Delivery[]>([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [sido, setSido] = useState('')
  const [sigungu, setSigungu] = useState('')
  const [face, setFace] = useState(1)
  const [rolling, setRolling] = useState(false)
  const [result, setResult] = useState<Delivery | null>(null)
  const [error, setError] = useState('')

  const rollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 타이머를 반드시 한 곳에서 정리 (중복 생성/누수 방지)
  const clearTimers = () => {
    if (rollTimerRef.current) {
      clearInterval(rollTimerRef.current)
      rollTimerRef.current = null
    }
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current)
      finishTimerRef.current = null
    }
  }

  // 언마운트 시 타이머 정리
  useEffect(() => clearTimers, [])

  // 열릴 때 한 번만 후보 데이터를 불러온다
  useEffect(() => {
    let active = true
    const load = async () => {
      const { data, error: fetchError } = await supabase
        .from('deliveries')
        .select(DELIVERY_SELECT_WITH_MENUS)
        .order('created_at', { ascending: false })
      if (!active) return
      if (fetchError) {
        setLoadError(true)
      } else if (data) {
        setItems(data.map(normalizeDelivery))
      }
      setLoadingItems(false)
    }
    load()
    return () => {
      active = false
    }
  }, [])

  // Esc로 닫기
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  const sigunguList = getSigunguList(sido)

  // 현재 필터 조건에 맞는 추천 후보 목록
  const candidates = useMemo(() => {
    if (!sido) return []
    return items.filter((item) => {
      if (item.sido !== sido) return false
      if (sigungu && item.sigungu !== sigungu) return false
      return true
    })
  }, [items, sido, sigungu])

  // 지역 정보가 없어 추천 대상에서 빠지는 데이터 수
  const missingRegionCount = items.filter((item) => !item.sido).length

  const resetResult = () => {
    clearTimers()
    setRolling(false)
    setResult(null)
    setError('')
  }

  const handleRoll = () => {
    if (rolling || loadingItems) return

    if (!sido) {
      setError('시/도는 반드시 선택해 주세요.')
      return
    }
    if (candidates.length === 0) {
      setError('선택한 지역에 등록된 맛집이 없습니다. 조건을 넓혀보세요.')
      return
    }

    setError('')
    setResult(null)
    setRolling(true)

    // 굴리는 동안 주사위 눈을 빠르게 교체
    rollTimerRef.current = setInterval(() => {
      setFace((prev) => (prev % 6) + 1)
    }, 110)

    // 1.3초 후 결과 확정
    finishTimerRef.current = setTimeout(() => {
      clearTimers()
      const picked = candidates[Math.floor(Math.random() * candidates.length)]
      setFace(Math.floor(Math.random() * 6) + 1)
      setResult(picked)
      setRolling(false)
    }, 1300)
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="today-pick-title"
        className="bg-white rounded-3xl shadow-2xl border border-sky-100 w-full max-w-md my-auto p-6 space-y-5 font-sans relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        <header className="text-center pt-1">
          <h2 id="today-pick-title" className="font-serif text-2xl font-extrabold text-sky-700">
            🎲 오늘 뭐 먹지?
          </h2>
          <p className="text-xs text-slate-500 mt-1">지역을 고르고 주사위를 굴려보세요!</p>
        </header>

        {/* ---------- 지역 필터 ---------- */}
        <div className="space-y-2 bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={sido}
              onChange={(e) => {
                setSido(e.target.value)
                setSigungu('')
                resetResult()
              }}
              aria-label="시/도 선택 (필수)"
              className="w-full px-3 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white text-xs"
            >
              <option value="">시/도 선택 *</option>
              {SIDO_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={sigungu}
              onChange={(e) => {
                setSigungu(e.target.value)
                resetResult()
              }}
              disabled={!sido}
              aria-label="시/군/구 선택 (선택사항)"
              className="w-full px-3 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white text-xs disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{sido ? '시/군/구 전체' : '시/도 먼저'}</option>
              {sigunguList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <p className="text-[11px] text-slate-500 text-center pt-0.5">
            {loadingItems ? (
              '맛집 목록을 불러오는 중...'
            ) : loadError ? (
              <span className="text-rose-500">목록을 불러오지 못했습니다.</span>
            ) : sido ? (
              <>
                추천 후보 <strong className="text-sky-700">{candidates.length}곳</strong>
              </>
            ) : (
              '시/도를 선택하면 후보가 표시됩니다.'
            )}
          </p>
        </div>

        {/* ---------- 주사위 ---------- */}
        <div className="flex flex-col items-center gap-4 py-2">
          <div className={rolling ? 'animate-dice-roll' : 'animate-dice-idle'}>
            <DiceFace face={face} />
          </div>

          <button
            type="button"
            onClick={handleRoll}
            disabled={rolling || loadingItems}
            className="animate-rainbow text-white px-6 py-3 rounded-2xl text-sm font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center gap-2 border border-white/40 disabled:opacity-70 disabled:hover:scale-100"
          >
            <Dices className="w-5 h-5" />
            {loadingItems ? '불러오는 중...' : rolling ? '굴리는 중...' : '랜덤추천!'}
          </button>
        </div>

        {error && <p className="text-xs text-rose-500 font-medium text-center">{error}</p>}

        {!loadingItems && missingRegionCount > 0 && (
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 text-center">
            지역 정보가 없는 맛집 {missingRegionCount}곳은 추천에서 제외됩니다. 수정 화면에서 지역을
            채워주세요.
          </p>
        )}

        {/* ---------- 결과 ---------- */}
        {result && !rolling && (
          <div className="animate-pick-pop-in bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-2xl p-4 space-y-3">
            <div className="flex justify-between items-start gap-2">
              <span className="text-[11px] px-2 py-1 bg-sky-100 text-sky-800 rounded-md font-semibold">
                {CATEGORY_EMOJI[result.category]
                  ? `${CATEGORY_EMOJI[result.category]} ${result.category}`
                  : result.category}
              </span>
              <StarRating rating={result.rating} />
            </div>

            <h3 className="font-serif text-xl font-bold text-slate-800">{result.name}</h3>

            {formatRegion(result.sido, result.sigungu) && (
              <p className="text-xs text-slate-500">
                📍 {formatRegion(result.sido, result.sigungu)}
              </p>
            )}

            {(() => {
              const repMenu = getRepresentativeMenu(result)
              if (!repMenu) return null
              const extraCount = Math.max((result.menus?.length ?? 0) - 1, 0)
              return (
                <div className="bg-white rounded-xl border border-sky-100 px-3 py-2.5 text-sm">
                  <p className="font-bold text-slate-800 flex items-center flex-wrap gap-x-2">
                    <span>🍴 {repMenu.name}</span>
                    <span className="text-sky-700">{repMenu.price.toLocaleString()}원</span>
                    {extraCount > 0 && (
                      <span className="text-[11px] font-medium text-slate-400">
                        +{extraCount}개 메뉴
                      </span>
                    )}
                  </p>
                </div>
              )
            })()}

            <p className="text-xs text-slate-600">
              앱 <strong className="text-sky-700">{result.app_name}</strong> · 최소주문{' '}
              <strong className="text-slate-800">
                {(result.min_order ?? 0).toLocaleString()}원
              </strong>
            </p>

            {result.memo && (
              <p className="text-xs text-slate-600 font-serif leading-relaxed bg-white rounded-xl border border-slate-100 px-3 py-2">
                {result.memo}
              </p>
            )}

            <button
              type="button"
              onClick={() => {
                onClose()
                router.push(`/delivery/${result.id}`)
              }}
              className="w-full flex items-center justify-center gap-1 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-sm font-medium transition"
            >
              자세히 보기 <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
