'use client'

import { useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, ArrowUpDown, ShieldCheck, Heart, Plus, UtensilsCrossed } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import {
  CATEGORIES,
  CATEGORY_EMOJI,
  APP_NAMES,
  SORT_OPTIONS,
  sortDeliveries,
  getRepresentativeMenu,
  DELIVERY_SELECT_WITH_MENUS,
  normalizeDelivery,
} from '@/lib/types'
import type { Delivery, SortKey } from '@/lib/types'
import { SIDO_LIST, getSigunguList, formatRegion } from '@/lib/regions'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import StarRating from '@/components/StarRating'
import { getDeliveryImageUrl } from '@/lib/deliveryImage'
import DeliveryDetailModal from '@/components/DeliveryDetailModal'
import HelpModal from '@/components/HelpModal'
import TodayPickModal from '@/components/TodayPickModal'
import ScrollToTopButton from '@/components/ScrollToTopButton'
import {
  getTodayPickSelection,
  isUserLocation,
  type UserLocation,
} from '@/lib/todayPick'

function ListPageContent() {
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [items, setItems] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [userBookmarks, setUserBookmarks] = useState<string[]>([])

  const [searchTerm, setSearchTerm] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedApp, setSelectedApp] = useState('전체')
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [filterSido, setFilterSido] = useState('')
  const [filterSigungu, setFilterSigungu] = useState('')

  // 위치 및 모달 상태
  const [userRegionName, setUserRegionName] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null)
  const [useGpsForPick, setUseGpsForPick] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [helpModalOpen, setHelpModalOpen] = useState(false)
  const [todayPickModalOpen, setTodayPickModalOpen] = useState(false)

  // ?help=true 파라미터 처리
  useEffect(() => {
    if (searchParams.get('help') === 'true') {
      setHelpModalOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const savedLocation = localStorage.getItem('deliverypick-location')
    if (savedLocation) {
      try {
        const parsedLocation: unknown = JSON.parse(savedLocation)
        if (isUserLocation(parsedLocation)) {
          setUserLocation(parsedLocation)
          setUseGpsForPick(true)
          setUserRegionName(parsedLocation.fullRegion)
          return
        }
        localStorage.removeItem('deliverypick-location')
      } catch {
        localStorage.removeItem('deliverypick-location')
      }
    }
    setUserRegionName(localStorage.getItem('deliverypick-region-name'))
  }, [])

  // 소셜 로그인 사용자는 서비스 닉네임을 설정하기 전 메인으로 진입할 수 없다.
  useEffect(() => {
    if (!user || !['kakao', 'google'].includes(user.app_metadata?.provider)) return
    let active = true
    supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (active && !data?.nickname?.trim()) router.replace('/signup?social=1')
      })
    return () => { active = false }
  }, [router, user])

  // 1. 배달 맛집 데이터 로드
  useEffect(() => {
    let active = true
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(DELIVERY_SELECT_WITH_MENUS)
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })

      if (!active) return
      if (error) {
        setLoadError(true)
      } else if (data) {
        const allReviews = data.map(normalizeDelivery)
        const rootItems = allReviews.filter((review) => !review.root_delivery_id)
        const itemsWithAverageRating = rootItems.map((root) => {
          const ratings = allReviews
            .filter((review) => review.id === root.id || review.root_delivery_id === root.id)
            .map((review) => Number(review.rating))
            .filter((rating) => Number.isFinite(rating) && rating >= 0.5 && rating <= 5)
          return {
            ...root,
            rating: ratings.length
              ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
              : root.rating,
          }
        })
        setItems(itemsWithAverageRating)
      }
      setLoading(false)
    }
    fetchItems()
    return () => {
      active = false
    }
  }, [])

  // 2. 즐겨찾기(❤️) 로드
  useEffect(() => {
    if (!user) {
      setUserBookmarks([])
      return
    }
    const fetchBookmarks = async () => {
      const { data } = await supabase
        .from('bookmarks')
        .select('delivery_id')
        .eq('user_id', user.id)

      if (data) {
        setUserBookmarks(data.map((b) => b.delivery_id))
      }
    }
    fetchBookmarks()
  }, [user])

  // GPS 위치 자동 감지
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('브라우저가 GPS를 지원하지 않습니다.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/kakao/region?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          )
          const data = await res.json()
          if (res.ok && data.region) {
            const location: UserLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              sido: data.region.sido,
              sigungu: data.region.sigungu,
              fullRegion: data.region.fullRegion,
            }
            setUserLocation(location)
            setUseGpsForPick(true)
            setUserRegionName(location.fullRegion)
            setFilterSido(location.sido)
            const matchingSigungu = getSigunguList(location.sido).find(
              (sigungu) =>
                location.sigungu === sigungu || location.sigungu.startsWith(`${sigungu} `)
            )
            setFilterSigungu(matchingSigungu || '')
            localStorage.setItem('deliverypick-location', JSON.stringify(location))
            localStorage.setItem('deliverypick-region-name', location.fullRegion)
          } else {
            alert(data.error || '현재 위치의 지역명을 확인하지 못했습니다.')
          }
        } catch {
          alert('현재 위치의 지역명을 확인하지 못했습니다.')
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          alert('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 접근을 허용해 주세요.')
        } else {
          alert('위치 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        }
      },
      { timeout: 10000, enableHighAccuracy: false }
    )
  }

  const sigunguList = getSigunguList(filterSido)

  const todayPickSelection = useMemo(
    () =>
      getTodayPickSelection(items, {
        userLocation: useGpsForPick ? userLocation : null,
        manualSido: filterSido,
        manualSigungu: filterSigungu,
      }),
    [items, userLocation, useGpsForPick, filterSido, filterSigungu]
  )

  // 하트 즐겨찾기 토글
  const handleBookmarkToggle = async (deliveryId: string) => {
    if (!user) {
      alert('즐겨찾기 기능은 로그인 후 이용하실 수 있습니다.')
      router.push('/login')
      return
    }

    const isBookmarked = userBookmarks.includes(deliveryId)
    if (isBookmarked) {
      setUserBookmarks((prev) => prev.filter((id) => id !== deliveryId))
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('delivery_id', deliveryId)
      if (error) {
        setUserBookmarks((prev) => prev.includes(deliveryId) ? prev : [...prev, deliveryId])
        alert(`즐겨찾기 해제에 실패했습니다: ${error.message}`)
      } else {
        alert('즐겨찾기에서 해제되었습니다.')
      }
    } else {
      setUserBookmarks((prev) => [...prev, deliveryId])
      const { error } = await supabase
        .from('bookmarks')
        .insert({ user_id: user.id, delivery_id: deliveryId })
      if (error) {
        setUserBookmarks((prev) => prev.filter((id) => id !== deliveryId))
        alert(`즐겨찾기 추가에 실패했습니다: ${error.message}`)
      } else {
        alert('즐겨찾기에 추가되었습니다.')
      }
    }
  }

  const filteredItems = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '')
    const filtered = items.filter((item) => {
      const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory
      const matchesApp = selectedApp === '전체' || item.app_name === selectedApp
      const matchesRegion =
        (!filterSido || item.sido === filterSido) &&
        (!filterSigungu || item.sigungu === filterSigungu)
      const searchableRegion = `${item.sido || ''}${item.sigungu || ''}`
        .toLocaleLowerCase('ko-KR')
        .replace(/\s+/g, '')
      const matchesSearch =
        !term ||
        item.name.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').includes(term) ||
        searchableRegion.includes(term) ||
        (item.menus && item.menus.some((m) =>
          m.name.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').includes(term)
        ))

      return matchesCategory && matchesApp && matchesRegion && matchesSearch
    })

    return sortDeliveries(filtered, sortKey)
  }, [items, selectedCategory, selectedApp, filterSido, filterSigungu, searchTerm, sortKey])

  const autocompleteSuggestions = useMemo(() => {
    const term = searchTerm.trim().toLocaleLowerCase('ko-KR').replace(/\s+/g, '')
    if (!term) return []

    type Suggestion = { type: '맛집명' | '지역' | '메뉴'; value: string; count: number }
    const suggestions = new Map<string, Suggestion>()
    const add = (type: Suggestion['type'], value?: string | null) => {
      const cleanValue = value?.trim()
      if (!cleanValue || !cleanValue.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').includes(term)) return
      const key = `${type}:${cleanValue}`
      const current = suggestions.get(key)
      suggestions.set(key, { type, value: cleanValue, count: (current?.count || 0) + 1 })
    }

    items.forEach((item) => {
      add('맛집명', item.name)
      add('지역', [item.sido, item.sigungu].filter(Boolean).join(' '))
      item.menus?.forEach((menu) => add('메뉴', menu.name))
    })

    return [...suggestions.values()]
      .sort((a, b) => {
        const aStarts = a.value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').startsWith(term) ? 0 : 1
        const bStarts = b.value.toLocaleLowerCase('ko-KR').replace(/\s+/g, '').startsWith(term) ? 0 : 1
        return aStarts - bStarts || b.count - a.count || a.value.localeCompare(b.value, 'ko-KR')
      })
      .slice(0, 8)
  }, [items, searchTerm])

  return (
    <div className="min-h-screen flex flex-col font-serif">
      {/* 상단 헤더 */}
      <Header
        onOpenTodayPick={() => setTodayPickModalOpen(true)}
        userRegionName={userRegionName}
        onGetLocation={handleGetLocation}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        {/* 메인 히어로 안내 칩 & 신규 등록 버튼 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="flex items-center gap-2 text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              <UtensilsCrossed className="w-8 h-8 sm:w-9 sm:h-9 text-amber-500 shrink-0" />
              <span>실패 없는 배달 맛집 목록</span>
            </h1>
            <p className="text-base text-slate-500 mt-2">
              직접 먹어보고 검증한 나만의 인생 배달 맛집을 엄선해 기록해 두세요!
            </p>
          </div>

          <Link
            href="/register"
            className="self-start sm:self-auto px-6 py-3.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>맛집 등록하기</span>
          </Link>
        </div>

        {/* 검색 및 필터 옵션 */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-white/80 shadow-sm mb-6 space-y-4">
          {/* 검색창 */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="맛집명, 지역명 또는 메뉴명 검색 (예: 교촌, 강남, 치킨)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
              autoComplete="off"
              role="combobox"
              aria-expanded={searchFocused && autocompleteSuggestions.length > 0}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-sky-50/50 border border-sky-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-base text-slate-800 placeholder-slate-400"
            />
            {searchFocused && autocompleteSuggestions.length > 0 && (
              <div role="listbox" className="absolute left-0 right-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-sky-200 bg-white shadow-xl">
                <p className="border-b border-slate-100 px-4 py-2 text-xs font-bold text-slate-500">검색어 자동완성</p>
                {autocompleteSuggestions.map((suggestion) => (
                  <button
                    key={`${suggestion.type}-${suggestion.value}`}
                    type="button"
                    role="option"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      setSearchTerm(suggestion.value)
                      setSearchFocused(false)
                    }}
                    className="flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-sky-50"
                  >
                    <span className={`w-14 shrink-0 rounded-full px-2 py-1 text-center text-[11px] font-bold ${
                      suggestion.type === '맛집명'
                        ? 'bg-blue-100 text-blue-700'
                        : suggestion.type === '지역'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}>{suggestion.type}</span>
                    <strong className="min-w-0 flex-1 truncate text-sm text-slate-800">{suggestion.value}</strong>
                    {suggestion.count > 1 && <span className="text-xs text-slate-400">{suggestion.count}곳</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 지역 필터 & 정렬 */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-base">
            <div className="flex items-center gap-2 flex-wrap">
              <select
                value={filterSido}
                onChange={(e) => {
                  setUseGpsForPick(false)
                  setFilterSido(e.target.value)
                  setFilterSigungu('')
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700"
              >
                <option value="">전국 시/도</option>
                {SIDO_LIST.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              {filterSido && (
                <select
                  value={filterSigungu}
                  onChange={(e) => {
                    setUseGpsForPick(false)
                    setFilterSigungu(e.target.value)
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700"
                >
                  <option value="">전체 시/군/구</option>
                  {sigunguList.map((sg) => (
                    <option key={sg} value={sg}>
                      {sg}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 정렬 드롭다운 */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-700"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 100% 한글 카테고리 태그 슬라이더 */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIES.map((cat) => {
                const emoji = CATEGORY_EMOJI[cat] || ''
                const isSelected = selectedCategory === cat
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'bg-sky-50 text-slate-700 hover:bg-sky-100/80 border border-sky-100'
                    }`}
                  >
                    {emoji && <span>{emoji}</span>}
                    <span>{cat}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* 맛집 카드 목록 그리드 */}
        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            배달 맛집 목록을 불러오는 중입니다...
          </div>
        ) : loadError ? (
          <div className="py-20 text-center text-rose-500 text-sm">
            목록을 불러오는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-slate-400 text-sm bg-white/60 rounded-3xl p-8 border border-white">
            <p className="text-2xl mb-2">🍽️</p>
            <p className="font-semibold text-slate-700">조건에 맞는 배달 맛집이 없습니다.</p>
            <p className="text-xs text-slate-400 mt-1">다른 카테고리나 검색어로 시도해 보세요!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const repMenu = getRepresentativeMenu(item)
              const imageUrl = getDeliveryImageUrl(item.image_path)
              const isBookmarked = userBookmarks.includes(item.id)

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedDelivery(item)
                    setDetailModalOpen(true)
                  }}
                  className="delivery-card cursor-pointer p-5 flex flex-col justify-between relative group"
                >
                  {/* 카드 상단 이미지 & 뱃지 */}
                  <div>
                    <div className="relative aspect-video rounded-2xl overflow-hidden mb-3.5 bg-slate-100">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl bg-slate-200/70 text-slate-400">
                          🍽️
                        </div>
                      )}

                      {/* AI 영수증 실거래 인증 뱃지 */}
                      {item.is_verified && (
                        <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow-sm flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          <span>🥇 AI 인증</span>
                        </div>
                      )}

                      {/* 하트 즐겨찾기 토글 버튼 */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleBookmarkToggle(item.id)
                        }}
                        className="absolute top-2.5 right-2.5 p-2 rounded-full bg-white/90 backdrop-blur-md text-rose-500 shadow-sm hover:scale-110 transition-all"
                        title="즐겨찾기 하트"
                      >
                        <Heart className={`w-4 h-4 ${isBookmarked ? 'fill-rose-500' : ''}`} />
                      </button>
                    </div>

                    {/* 식당 헤더 */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-sm font-semibold">
                        {item.category}
                      </span>
                      <span className="text-sm text-slate-400">{item.app_name}</span>
                    </div>

                    <h3 className="text-xl font-bold text-slate-900 truncate mt-0.5">{item.name}</h3>

                    <StarRating rating={item.rating} className="mt-1" />

                    {/* 대표 메뉴 정보 */}
                    {repMenu && (
                      <div className="mt-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-base flex justify-between items-center">
                        <span className="text-slate-600 truncate font-medium">
                          ⭐ {repMenu.name}
                        </span>
                        <span className="font-bold text-slate-900 ml-2 shrink-0">
                          {repMenu.price.toLocaleString()}원
                        </span>
                      </div>
                    )}

                    {/* 한줄평 */}
                    {item.memo && (
                      <p className="text-base text-slate-500 mt-2 line-clamp-2 italic">
                        "{item.memo}"
                      </p>
                    )}
                  </div>

                  {/* 카드 하단 메타 정보 */}
                  <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-sm text-slate-400">
                    <span>최소주문: {item.min_order?.toLocaleString()}원</span>
                    {item.sido && (
                      <span className="truncate max-w-[120px]">
                        📍 {formatRegion(item.sido, item.sigungu)}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* 하단 플로팅 글래스 네비게이션 바 */}
      <BottomNav onOpenHelp={() => setHelpModalOpen(true)} />

      {/* 맨 위로 가기 🔝 플로팅 버튼 */}
      <ScrollToTopButton />

      {/* 모달 연동 */}
      <DeliveryDetailModal
        delivery={selectedDelivery}
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        onBookmarkToggle={handleBookmarkToggle}
        isBookmarked={selectedDelivery ? userBookmarks.includes(selectedDelivery.id) : false}
        onDeleted={(id) => setItems((prev) => prev.filter((item) => item.id !== id))}
      />

      <TodayPickModal
        isOpen={todayPickModalOpen}
        onClose={() => setTodayPickModalOpen(false)}
        selection={todayPickSelection}
      />

      <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
    </div>
  )
}

export default function ListPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-400 text-sm font-serif">페이지 로딩 중...</div>}>
      <ListPageContent />
    </Suspense>
  )
}
