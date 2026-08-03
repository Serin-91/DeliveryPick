'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowUpDown } from 'lucide-react'
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
import StarRating from '@/components/StarRating'

export default function ListPage() {
  // 공개 화면 — 로그인 여부만 확인하고 리다이렉트하지 않는다
  const { user } = useAuth()
  const router = useRouter()
  const [items, setItems] = useState<Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('전체')
  const [selectedApp, setSelectedApp] = useState('전체')
  const [sortKey, setSortKey] = useState<SortKey>('latest')
  const [filterSido, setFilterSido] = useState('')
  const [filterSigungu, setFilterSigungu] = useState('')

  // 데이터 조회는 로그인 여부와 완전히 분리한다 (비회원도 즉시 목록을 본다)
  useEffect(() => {
    let active = true
    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(DELIVERY_SELECT_WITH_MENUS)
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) {
        setLoadError(true)
      } else if (data) {
        setItems(data.map(normalizeDelivery))
      }
      setLoading(false)
    }
    fetchItems()
    return () => {
      active = false
    }
  }, [])

  const sigunguList = getSigunguList(filterSido)

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase()
    const filtered = items.filter((item) => {
      const matchesCategory = selectedCategory === '전체' || item.category === selectedCategory
      const matchesApp = selectedApp === '전체' || item.app_name === selectedApp
      const matchesRegion =
        (!filterSido || item.sido === filterSido) &&
        (!filterSigungu || item.sigungu === filterSigungu)
      const matchesSearch =
        item.name.toLowerCase().includes(term) ||
        (item.memo || '').toLowerCase().includes(term) ||
        (item.menus || []).some((m) => m.name.toLowerCase().includes(term))
      return matchesCategory && matchesApp && matchesRegion && matchesSearch
    })
    return sortDeliveries(filtered, sortKey)
  }, [items, searchTerm, selectedCategory, selectedApp, filterSido, filterSigungu, sortKey])

  // 작성자 이메일은 절대 노출하지 않는다.
  // 저장된 닉네임이 없으면 '익명' (내 글일 때만 내 프로필 닉네임으로 보완)
  const getAuthorNickname = (item: Delivery) => {
    if (item.user_nickname) return item.user_nickname
    if (user && item.user_id === user.id) {
      return (
        (user.user_metadata?.nickname as string) ||
        (user.user_metadata?.display_name as string) ||
        '익명'
      )
    }
    return '익명'
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
      <Header user={user} />

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-sky-100 space-y-3">
          {/* 지역 필터 */}
          <div className="flex gap-2 text-sm font-sans">
            <select
              value={filterSido}
              onChange={(e) => {
                setFilterSido(e.target.value)
                setFilterSigungu('')
              }}
              className="px-3 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white flex-1"
            >
              <option value="">시/도 전체</option>
              {SIDO_LIST.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              value={filterSigungu}
              onChange={(e) => setFilterSigungu(e.target.value)}
              disabled={!filterSido}
              className="px-3 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white flex-1 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">{filterSido ? '시/군/구 전체' : '시/도 먼저 선택'}</option>
              {sigunguList.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3.5 w-5 h-5 text-sky-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="식당명 · 메뉴명 · 메모 검색..."
                className="w-full pl-10 pr-4 py-2.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 font-sans text-sm"
              />
            </div>

            <div className="relative sm:w-52">
              <ArrowUpDown className="absolute left-3 top-3 w-4 h-4 text-sky-400 pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="w-full pl-9 pr-3 py-2.5 bg-sky-50/50 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 font-sans text-sm appearance-none cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 text-xs font-sans overflow-x-auto pb-1">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={`cat-${cat}-${idx}`}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  selectedCategory === cat
                    ? 'bg-sky-500 text-white font-medium shadow-sm'
                    : 'bg-sky-50 text-sky-700 hover:bg-sky-100'
                }`}
              >
                {cat !== '전체' && CATEGORY_EMOJI[cat] ? `${CATEGORY_EMOJI[cat]} ${cat}` : cat}
              </button>
            ))}
          </div>

          <div className="flex gap-2 text-xs font-sans overflow-x-auto pb-1">
            {['전체', ...APP_NAMES].map((app, idx) => (
              <button
                key={`app-${app}-${idx}`}
                onClick={() => setSelectedApp(app)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                  selectedApp === app
                    ? 'bg-sky-700 text-white font-medium shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {app}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 font-sans text-sm">불러오는 중...</div>
        ) : loadError ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-rose-100 text-rose-500 font-sans text-sm">
            맛집 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-sky-100 text-slate-500 font-sans text-sm">
            등록된 맛집이 없습니다. 새 맛집을 등록해 보세요!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const region = formatRegion(item.sido, item.sigungu)
              const repMenu = getRepresentativeMenu(item)
              const extraMenuCount = Math.max((item.menus?.length ?? 0) - 1, 0)
              return (
                <div
                  key={item.id}
                  onClick={() => router.push(`/delivery/${item.id}`)}
                  className="bg-white p-5 rounded-2xl border border-sky-100 hover:border-sky-300 shadow-sm hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-sans px-2.5 py-1 bg-sky-100 text-sky-800 rounded-md font-medium">
                        {CATEGORY_EMOJI[item.category]
                          ? `${CATEGORY_EMOJI[item.category]} ${item.category}`
                          : item.category}
                      </span>
                      <StarRating rating={item.rating} />
                    </div>

                    <h3 className="text-lg font-bold text-slate-800 mb-1">{item.name}</h3>

                    {region && (
                      <p className="text-[11px] text-slate-500 font-sans mb-1.5">📍 {region}</p>
                    )}

                    {repMenu && (
                      <p className="text-base font-sans text-slate-800 mb-2 font-bold flex items-center flex-wrap gap-x-2">
                        <span>🍴 {repMenu.name}</span>
                        <span className="text-sky-700">{repMenu.price.toLocaleString()}원</span>
                        {extraMenuCount > 0 && (
                          <span className="text-[11px] font-medium text-slate-400">
                            +{extraMenuCount}개 메뉴
                          </span>
                        )}
                      </p>
                    )}

                    <p className="text-xs text-slate-500 font-sans line-clamp-1 mb-3">{item.memo}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs font-sans text-slate-600">
                    <span className="flex items-center gap-1 text-slate-500">
                      <span>👤</span>
                      <span className="font-semibold text-slate-700">{getAuthorNickname(item)}</span>
                    </span>
                    <span>
                      앱: <strong className="text-sky-700">{item.app_name}</strong>
                    </span>
                    <span>
                      최소주문:{' '}
                      <strong className="text-slate-800">
                        {(item.min_order ?? 0).toLocaleString()}원
                      </strong>
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
