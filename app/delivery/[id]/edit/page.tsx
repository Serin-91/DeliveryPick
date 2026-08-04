'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { supabase } from '@/lib/supabase'
import {
  FORM_CATEGORIES,
  CATEGORY_EMOJI,
  APP_NAMES,
  DELIVERY_SELECT_WITH_MENUS,
  normalizeDelivery,
} from '@/lib/types'
import { formatPriceInput, parsePriceInput, toMenuRows, validateMenuRows } from '@/lib/menuForm'
import type { MenuFormRow } from '@/lib/menuForm'
import Header from '@/components/Header'
import StarRating from '@/components/StarRating'
import RegionMenuFields from '@/components/RegionMenuFields'
import MenuInput from '@/components/MenuInput'
import RepresentativeMenuImageInput from '@/components/RepresentativeMenuImageInput'
import ReceiptScannerModal from '@/components/ReceiptScannerModal'
import BottomNav from '@/components/BottomNav'
import type { RepresentativeImageValue } from '@/components/RepresentativeMenuImageInput'
import type { RegionValue } from '@/components/RegionMenuFields'
import {
  getDeliveryImageUrl,
  removeDeliveryImage,
  uploadDeliveryImage,
} from '@/lib/deliveryImage'
import { getUserAvatarUrl } from '@/lib/userAvatar'

interface FormState {
  name: string
  category: string
  app_name: string
  min_order: string
  rating: number
  memo: string
  sido: string
  sigungu: string
  order_number: string
  is_verified: boolean
}

export default function EditPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [formData, setFormData] = useState<FormState | null>(null)
  const [menuRows, setMenuRows] = useState<MenuFormRow[]>([])
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null)
  const [representativeImage, setRepresentativeImage] = useState<RepresentativeImageValue>({
    blob: null,
    removeExisting: false,
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [forbidden, setForbidden] = useState(false)
  const [ocrModalOpen, setOcrModalOpen] = useState(false)

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
          min_order: item.min_order ? formatPriceInput(item.min_order) : '',
          rating: item.rating ?? 5,
          memo: item.memo ?? '',
          sido: item.sido ?? '',
          sigungu: item.sigungu ?? '',
          order_number: item.order_number ?? '',
          is_verified: Boolean(item.is_verified),
        })
        setMenuRows(toMenuRows(item.menus))
        setExistingImagePath(item.image_path ?? null)
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

  const handleOcrSuccess = (data: any) => {
    setFormData((prev) => prev ? {
      ...prev,
      name: data.storeName || prev.name,
      app_name: data.appName && APP_NAMES.includes(data.appName) ? data.appName : prev.app_name,
      min_order: data.totalAmount ? formatPriceInput(data.totalAmount) : prev.min_order,
      order_number: data.orderNumber ? `${data.appName || 'APP'}_${data.orderNumber}` : prev.order_number,
      is_verified: true,
    } : prev)
    if (Array.isArray(data.menus) && data.menus.length > 0) {
      setMenuRows(data.menus.slice(0, 30).map((menu: any, index: number) => ({
        name: menu.name || '',
        price: menu.price ? String(menu.price) : '',
        is_representative: index === 0,
      })))
    }
  }

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

    let uploadedPath: string | null = null
    let nextImagePath = representativeImage.removeExisting ? null : existingImagePath

    // 새 사진은 DB 수정 전에 먼저 업로드하고, 이후 단계 실패 시 즉시 정리한다.
    if (representativeImage.blob) {
      try {
        uploadedPath = await uploadDeliveryImage(user.id, params.id, representativeImage.blob)
        nextImagePath = uploadedPath
      } catch {
        setSubmitting(false)
        setError('사진 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
    }

    // 1) 맛집 본문 수정
    const { error: updateError } = await supabase
      .from('deliveries')
      .update({
        name: formData.name.trim(),
        category: formData.category,
        app_name: formData.app_name,
        min_order: parsePriceInput(formData.min_order),
        rating: formData.rating,
        memo: formData.memo.trim(),
        sido: formData.sido,
        sigungu: formData.sigungu,
        image_path: nextImagePath,
        order_number: formData.order_number || null,
        is_verified: formData.is_verified,
        user_nickname: user.user_metadata?.nickname || user.user_metadata?.display_name || '회원',
        user_avatar_url: getUserAvatarUrl(user),
      })
      .eq('id', params.id)
      .eq('user_id', user.id)

    if (updateError) {
      if (uploadedPath) {
        try {
          await removeDeliveryImage(uploadedPath)
        } catch {
          // 실패한 신규 파일 정리는 가능한 범위에서 수행한다.
        }
      }
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
      // 메뉴 저장 실패 시 새 사진 참조를 원래대로 되돌린 뒤 신규 파일을 정리한다.
      await supabase
        .from('deliveries')
        .update({ image_path: existingImagePath })
        .eq('id', params.id)
        .eq('user_id', user.id)
      if (uploadedPath) {
        try {
          await removeDeliveryImage(uploadedPath)
        } catch {
          // 원래 사진 복원이 우선이며 저장소 정리는 가능한 범위에서 수행한다.
        }
      }
      setSubmitting(false)
      setError('메뉴 저장에 실패했습니다. 기존 메뉴는 그대로 유지되었습니다.')
      return
    }

    // DB가 새 경로를 가리키는 것이 확인된 뒤에만 이전 파일을 삭제한다.
    if (existingImagePath && existingImagePath !== nextImagePath) {
      try {
        await removeDeliveryImage(existingImagePath)
      } catch {
        // 화면에는 새 경로만 노출되므로 이전 파일 정리 실패가 수정 결과를 깨뜨리지는 않는다.
      }
    }

    setSubmitting(false)
    alert('맛집 정보가 수정되었습니다.')
    router.push(`/delivery/${params.id}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sky-50 to-slate-50 text-slate-800 font-serif">
      <Header user={user} />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <button
            onClick={() => router.push(`/delivery/${params.id}`)}
            className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 취소하고 돌아가기
          </button>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <h2 className="text-2xl font-bold text-slate-900">🛵 맛집 정보 수정</h2>
            <button
              type="button"
              onClick={() => setOcrModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Gemini AI 영수증 인식
            </button>
          </div>

          <p className="text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 font-sans leading-relaxed">
            사진이나 영수증 인증을 추가하면 저장 후 포토·영수증 리뷰 집계와 리뷰 등급에 반영됩니다.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5 font-sans text-sm">
            <div>
              <label className="block font-bold text-slate-800 mb-1">식당명 *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-base"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-800 mb-1">음식 카테고리</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                >
                  {FORM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_EMOJI[c] ? `${CATEGORY_EMOJI[c]} ${c}` : c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-800 mb-1">주요 이용 배달앱</label>
                <select
                  value={formData.app_name}
                  onChange={(e) => setFormData({ ...formData, app_name: e.target.value })}
                  className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white"
                >
                  {APP_NAMES.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">최소주문금액 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={formData.min_order}
                onChange={(e) => setFormData({ ...formData, min_order: formatPriceInput(e.target.value) })}
                placeholder="입력"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-base"
              />
            </div>

            <RegionMenuFields value={formData} onChange={patchRegion} />

            <MenuInput rows={menuRows} onChange={setMenuRows} />

            <RepresentativeMenuImageInput
              value={representativeImage}
              existingImageUrl={getDeliveryImageUrl(existingImagePath)}
              onChange={setRepresentativeImage}
              disabled={submitting}
            />

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-sm font-medium text-slate-600 mb-1">평점 (0.5~5점)</label>
              <StarRating
                rating={formData.rating}
                onChange={(r) => setFormData({ ...formData, rating: r })}
                size="lg"
                editable
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 mb-1">💬 솔직한 추천 한줄평 / 꿀팁</label>
              <textarea
                rows={3}
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none font-serif"
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
      <BottomNav />
      <ReceiptScannerModal
        isOpen={ocrModalOpen}
        onClose={() => setOcrModalOpen(false)}
        onScanSuccess={handleOcrSuccess}
      />
    </div>
  )
}
