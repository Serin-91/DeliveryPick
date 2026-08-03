'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import { useRequireAuth } from '@/lib/useRequireAuth'
import { supabase } from '@/lib/supabase'
import { FORM_CATEGORIES, CATEGORY_EMOJI, APP_NAMES } from '@/lib/types'
import { createInitialMenuRows, validateMenuRows } from '@/lib/menuForm'
import type { MenuFormRow } from '@/lib/menuForm'
import Header from '@/components/Header'
import StarRating from '@/components/StarRating'
import RegionMenuFields from '@/components/RegionMenuFields'
import MenuInput from '@/components/MenuInput'
import RepresentativeMenuImageInput from '@/components/RepresentativeMenuImageInput'
import type { RepresentativeImageValue } from '@/components/RepresentativeMenuImageInput'
import type { RegionValue } from '@/components/RegionMenuFields'
import { removeDeliveryImage, uploadDeliveryImage } from '@/lib/deliveryImage'

export default function RegisterPage() {
  const { user, loading: authLoading } = useRequireAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    category: FORM_CATEGORIES[0] as string,
    app_name: APP_NAMES[0] as string,
    min_order: 15000,
    rating: 5,
    memo: '',
    sido: '',
    sigungu: '',
  })
  const [menuRows, setMenuRows] = useState<MenuFormRow[]>(createInitialMenuRows)
  const [representativeImage, setRepresentativeImage] = useState<RepresentativeImageValue>({
    blob: null,
    removeExisting: false,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sky-600 font-sans text-sm">
        불러오는 중...
      </div>
    )
  }

  const patchRegion = (patch: Partial<RegionValue>) =>
    setFormData((prev) => ({ ...prev, ...patch }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return

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

    const authorNickname =
      (user.user_metadata?.nickname as string) ||
      (user.user_metadata?.display_name as string) ||
      user.email?.split('@')[0] ||
      '회원'

    // 1) 맛집 본문 저장
    const { data: created, error: insertError } = await supabase
      .from('deliveries')
      .insert({
        name: formData.name.trim(),
        category: formData.category,
        app_name: formData.app_name,
        min_order: Number(formData.min_order) || 0,
        rating: formData.rating,
        memo: formData.memo.trim(),
        sido: formData.sido,
        sigungu: formData.sigungu,
        user_id: user.id,
        user_nickname: authorNickname,
      })
      .select('id')
      .single()

    if (insertError || !created) {
      setSubmitting(false)
      setError('등록에 실패했습니다. 다시 시도해주세요.')
      return
    }

    // 2) 메뉴 저장 (트랜잭션 RPC)
    const { error: menuError } = await supabase.rpc('replace_delivery_menus', {
      p_delivery_id: created.id,
      p_menus: menuCheck.rows,
    })

    if (menuError) {
      // 메뉴 저장 실패 시 맛집도 되돌려 반쪽 데이터가 남지 않게 한다
      await supabase.from('deliveries').delete().eq('id', created.id)
      setSubmitting(false)
      setError('메뉴 저장에 실패했습니다. 다시 시도해주세요.')
      return
    }

    // 3) 대표 메뉴 사진 저장. 실패하면 본문까지 되돌려 반쪽 게시물이 남지 않게 한다.
    if (representativeImage.blob) {
      let uploadedPath: string | null = null
      try {
        uploadedPath = await uploadDeliveryImage(user.id, created.id, representativeImage.blob)
        const { error: imagePathError } = await supabase
          .from('deliveries')
          .update({ image_path: uploadedPath })
          .eq('id', created.id)
          .eq('user_id', user.id)

        if (imagePathError) throw imagePathError
      } catch {
        if (uploadedPath) {
          try {
            await removeDeliveryImage(uploadedPath)
          } catch {
            // DB 롤백이 우선이며, 저장소 정리는 가능한 범위에서 수행한다.
          }
        }
        await supabase.from('deliveries').delete().eq('id', created.id).eq('user_id', user.id)
        setSubmitting(false)
        setError('사진 저장에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
    }

    setSubmitting(false)
    alert('새 맛집이 등록되었습니다!')
    router.push(`/delivery/${created.id}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
      <Header user={user} />

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 max-w-xl mx-auto space-y-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
          </button>

          <h2 className="text-xl font-bold text-slate-800">새 맛집 등록</h2>

          <form onSubmit={handleSubmit} className="space-y-4 font-sans text-sm">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">식당명 *</label>
              <input
                type="text"
                required
                placeholder="예: BBQ 치킨 강남점"
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
                placeholder="15000"
                className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300"
              />
            </div>

            <RegionMenuFields value={formData} onChange={patchRegion} />

            <MenuInput rows={menuRows} onChange={setMenuRows} />

            <RepresentativeMenuImageInput
              value={representativeImage}
              onChange={setRepresentativeImage}
              disabled={submitting}
            />

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
                placeholder="이 맛집에 대한 감상을 자유롭게 적어주세요."
                className="w-full px-3.5 py-2 border border-sky-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none font-serif"
              />
            </div>

            {error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-sky-500 hover:bg-sky-600 text-white font-medium py-3 rounded-xl transition flex items-center justify-center gap-1 shadow-sm mt-2 disabled:opacity-50"
            >
              <Check className="w-4 h-4" /> {submitting ? '저장 중...' : '맛집 저장하기'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
