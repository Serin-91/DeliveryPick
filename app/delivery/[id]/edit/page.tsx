'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { supabase } from '@/lib/supabase'
import {
  FORM_CATEGORIES,
  CATEGORY_EMOJI,
  APP_NAMES,
  DELIVERY_SELECT_WITH_MENUS,
  normalizeDelivery,
} from '@/lib/types'
import { toMenuRows, validateMenuRows } from '@/lib/menuForm'
import type { MenuFormRow } from '@/lib/menuForm'
import Header from '@/components/Header'
import StarRating from '@/components/StarRating'
import RegionMenuFields from '@/components/RegionMenuFields'
import MenuInput from '@/components/MenuInput'
import type { RegionValue } from '@/components/RegionMenuFields'

interface FormState {
  name: string
  category: string
  app_name: string
  min_order: number
  rating: number
  memo: string
  sido: string
  sigungu: string
}

export default function EditPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [formData, setFormData] = useState<FormState | null>(null)
  const [menuRows, setMenuRows] = useState<MenuFormRow[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)

  useEffect(() => {
    if (!user) return
    let active = true

    const fetchItem = async () => {
      const { data } = await supabase
        .from('deliveries')
        .select(DELIVERY_SELECT_WITH_MENUS)
        .eq('id', params.id)
        .maybeSingle()

      if (!active) return

      if (data) {
        const item = normalizeDelivery(data)

        // 로그인만으로는 부족하다 — 작성자 본인인지 반드시 확인
        if (item.user_id !== user.id) {
          setForbidden(true)
          setLoading(false)
          return
        }

        setFormData({
          name: item.name ?? '',
          category: item.category ?? FORM_CATEGORIES[0],
          app_name: item.app_name ?? APP_NAMES[0],
          min_order: item.min_order ?? 0,
          rating: item.rating ?? 5,
          memo: item.memo ?? '',
          sido: item.sido ?? '',
          sigungu: item.sigungu ?? '',
        })
        setMenuRows(toMenuRows(item.menus))
      }
      setLoading(false)
    }

    fetchItem()
    return () => {
      active = false
    }
  }, [user?.id, params.id])

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sky-600 font-sans text-sm">
        불러오는 중...
      </div>
    )
  }

  // 작성자가 아니면 폼 자체를 렌더링하지 않는다
  if (forbidden) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
        <Header user={user} />
        <main className="max-w-4xl mx-auto p-6 text-center font-sans text-sm space-y-3">
          <p className="text-rose-500 font-medium">수정 권한이 없습니다.</p>
          <p className="text-xs text-slate-500">작성자 본인만 수정할 수 있습니다.</p>
          <button
            onClick={() => router.push(`/delivery/${params.id}`)}
            className="text-sky-600 hover:underline text-xs font-medium"
          >
            상세 화면으로 돌아가기
          </button>
        </main>
      </div>
    )
  }

  if (!formData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
        <Header user={user} />
        <main className="max-w-4xl mx-auto p-6 text-center font-sans text-sm space-y-3">
          <p className="text-slate-500">존재하지 않는 맛집입니다.</p>
          <button
            onClick={() => router.push('/')}
            className="text-sky-600 hover:underline text-xs font-medium"
          >
            목록으로 돌아가기
          </button>
        </main>
      </div>
    )
  }

  const patchRegion = (patch: Partial<RegionValue>) =>
    setFormData((prev) => (prev ? { ...prev, ...patch } : prev))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

    // 제출 시점에도 소유권을 다시 확인
    if (!user) {
      setError('로그인이 필요합니다.')
      return
    }

    if (!formData.name.trim()) {
      setError('식당명을 입력해 주세요.')
      return
    }
    if (!formData.sido) {
      setError('시/도를 선택해 주세요.')
      return
    }
    if (!formData.sigungu) {
      setError('시/군/구를 선택해 주세요.')
      return
    }

    const menuCheck = validateMenuRows(menuRows)
    if (!menuCheck.ok) {
      setError(menuCheck.error)
      return
    }

    setSubmitting(true)
    setError('')

    // 1) 맛집 본문 수정
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        name: formData.name.trim(),
        category: formData.category,
        app_name: formData.app_name,
        min_order: Number(formData.min_order) || 0,
        rating: formData.rating,
        memo: formData.memo.trim(),
        sido: formData.sido,
        sigungu: formData.sigungu,
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError) {
      setSubmitting(false)
      setError('수정에 실패했습니다. 다시 시도해주세요.')
      return
    }

    // 2) 메뉴 전체 교체 (트랜잭션 RPC — 실패 시 기존 메뉴가 그대로 유지됨)
    const { error: menuError } = await supabase.rpc('replace_delivery_menus', {
      p_delivery_id: params.id,
      p_menus: menuCheck.rows,
    })

    if (menuError) {
      setSubmitting(false)
      setError('메뉴 저장에 실패했습니다. 기존 메뉴는 그대로 유지되었습니다.')
      return
    }

    setSubmitting(false)
    alert('맛집 정보가 수정되었습니다.')
    router.push(`/delivery/${params.id}`)
  }

  const needsRegion = !formData.sido || !formData.sigungu
  const needsMenu = !validateMenuRows(menuRows).ok

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
      <Header user={user} />

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 max-w-xl mx-auto space-y-6">
          <button
            onClick={() => router.push(`/delivery/${params.id}`)}
            className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 취소하고 돌아가기
          </button>

          <h2 className="text-xl font-bold text-slate-800">맛집 정보 수정</h2>

          {(needsRegion || needsMenu) && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-2.5 font-sans leading-relaxed">
              아직 채워지지 않은 항목이 있어요
              {needsRegion && ' · 지역'}
              {needsMenu && ' · 메뉴'}
              <br />
              지역을 채우면 <strong>🎲 오늘 뭐 먹지?</strong> 추천 대상에 포함됩니다.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">식당명 *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">카테고리</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                >
                  {FORM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_EMOJI[c] ? `${CATEGORY_EMOJI[c]} ${c}` : c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">주요 이용 배달앱</label>
                <select
                  value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                >
                  {APP_NAMES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">최소주문금액 (원)</label>
              <input
                type="number"
                min={0}
                value={formData.min_order}
                onChange={(e) => setFormData({ ...formData, min_order: Number(e.target.value) })}
                className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <RegionMenuFields value={formData} onChange={patchRegion} />

            <MenuInput rows={menuRows} onChange={setMenuRows} />

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-medium text-slate-600 mb-1">평점 (1~5점)</label>
              <StarRating
                rating={formData.rating}
                onChange={(r) => setFormData({ ...formData, rating: r })}
                size="w-6 h-6"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">한줄평</label>
              <textarea
                rows={3}
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none font-serif"
              />
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-sm mt-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {submitting ? '저장 중...' : '수정 내용 저장하기'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
