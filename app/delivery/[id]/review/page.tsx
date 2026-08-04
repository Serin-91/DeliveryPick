'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, ShieldCheck, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import StarRating from '@/components/StarRating'
import ReceiptScannerModal from '@/components/ReceiptScannerModal'
import RepresentativeMenuImageInput, { type RepresentativeImageValue } from '@/components/RepresentativeMenuImageInput'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import { DELIVERY_SELECT_WITH_MENUS, normalizeDelivery, type Delivery } from '@/lib/types'
import { removeDeliveryImage, uploadDeliveryImage } from '@/lib/deliveryImage'
import { getUserAvatarUrl } from '@/lib/userAvatar'

export default function ReviewPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [root, setRoot] = useState<Delivery | null>(null)
  const [menuName, setMenuName] = useState('')
  const [rating, setRating] = useState(5)
  const [memo, setMemo] = useState('')
  const [image, setImage] = useState<RepresentativeImageValue>({ blob: null, removeExisting: false })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [receiptOpen, setReceiptOpen] = useState(false)
  const [orderNumber, setOrderNumber] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  const handleReceiptSuccess = (data: any) => {
    setOrderNumber(data.orderNumber ? `${data.appName || root?.app_name || 'APP'}_${data.orderNumber}` : '')
    setIsVerified(true)
  }

  useEffect(() => {
    if (!authLoading && !user) router.replace(`/login?next=${encodeURIComponent(`/delivery/${params.id}/review`)}`)
  }, [authLoading, params.id, router, user])

  useEffect(() => {
    let active = true
    supabase.from('deliveries').select(DELIVERY_SELECT_WITH_MENUS).eq('id', params.id).maybeSingle()
      .then(async ({ data }) => {
        if (!active) return
        const opened = data ? normalizeDelivery(data) : null
        const { data: rootData } = opened?.root_delivery_id
          ? await supabase.from('deliveries').select(DELIVERY_SELECT_WITH_MENUS).eq('id', opened.root_delivery_id).maybeSingle()
          : { data: null }
        if (!active) return
        const item = rootData ? normalizeDelivery(rootData) : opened
        setRoot(item)
        const requested = searchParams.get('menu')
        setMenuName(item?.menus?.some((menu) => menu.name === requested) ? requested! : item?.menus?.[0]?.name || '')
        setLoading(false)
      })
    return () => { active = false }
  }, [params.id, searchParams])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!user || !root || !menuName || submitting) return
    const canonicalMenu = root.menus?.find((menu) => menu.name === menuName)
    if (!canonicalMenu) return
    setSubmitting(true)
    let reviewId: string | null = null
    let uploadedPath: string | null = null
    try {
      const { data, error } = await supabase.from('deliveries').insert({
        root_delivery_id: root.id,
        name: root.name,
        category: root.category,
        app_name: root.app_name,
        min_order: root.min_order,
        rating,
        memo: memo.trim(),
        user_id: user.id,
        user_nickname: user.user_metadata?.nickname || user.user_metadata?.display_name || '회원',
        user_avatar_url: getUserAvatarUrl(user),
        sido: root.sido || null,
        sigungu: root.sigungu || null,
        kakao_place_id: root.kakao_place_id || null,
        address: root.address || null,
        lat: root.lat || null,
        lng: root.lng || null,
        place_url: root.place_url || null,
        order_number: orderNumber || null,
        is_verified: isVerified,
      }).select('id').single()
      if (error) throw error
      reviewId = data.id

      const { error: menuError } = await supabase.from('delivery_menus').insert({
        delivery_id: reviewId,
        name: canonicalMenu.name,
        price: canonicalMenu.price,
        is_representative: true,
        sort_order: 0,
      })
      if (menuError) throw menuError

      if (image.blob) {
        uploadedPath = await uploadDeliveryImage(user.id, reviewId, image.blob)
        const { error: imageError } = await supabase.from('deliveries')
          .update({ image_path: uploadedPath }).eq('id', reviewId).eq('user_id', user.id)
        if (imageError) throw imageError
      }
      router.replace(`/delivery/${root.id}?menu=${encodeURIComponent(menuName)}`)
    } catch (error: any) {
      if (uploadedPath) await removeDeliveryImage(uploadedPath).catch(() => undefined)
      if (reviewId) await supabase.from('deliveries').delete().eq('id', reviewId).eq('user_id', user.id)
      alert(error?.code === '23505'
        ? '이미 등록된 영수증 주문번호입니다. 같은 주문으로 리뷰를 중복 등록할 수 없습니다.'
        : error?.message || '리뷰 등록에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading || !user) return <div className="min-h-screen grid place-items-center text-sm text-sky-600">불러오는 중...</div>
  if (!root) return <div className="min-h-screen grid place-items-center text-sm text-slate-500">기준 게시물을 찾을 수 없습니다.</div>

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <Header user={user} />
      <main className="mx-auto max-w-xl p-6">
        <button onClick={() => router.back()} className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-sky-700">
          <ArrowLeft className="h-4 w-4" /> 상세로 돌아가기
        </button>
        <form onSubmit={submit} className="space-y-5 rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-bold text-sky-700">{root.name}</p>
            <h1 className="mt-1 text-2xl font-bold">내 리뷰 등록</h1>
            <p className="mt-2 text-xs text-slate-500">메뉴명은 최초 등록자가 만든 목록을 그대로 사용합니다.</p>
          </div>
          <label className="block text-sm font-bold">
            리뷰할 메뉴
            <select value={menuName} onChange={(e) => setMenuName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">
              {root.menus?.map((menu) => <option key={menu.id} value={menu.name}>{menu.name} · {menu.price.toLocaleString()}원</option>)}
            </select>
          </label>
          <div>
            <p className="mb-2 text-sm font-bold">평점</p>
            <StarRating rating={rating} editable onChange={setRating} size="lg" />
          </div>
          <div className={`rounded-2xl border p-4 ${isVerified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50/50'}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className={`flex items-center gap-1.5 text-sm font-bold ${isVerified ? 'text-emerald-700' : 'text-slate-800'}`}>
                  <ShieldCheck className="h-4 w-4" /> {isVerified ? '영수증 인증 완료' : '영수증 리뷰 인증'}
                </p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {isVerified ? '이 리뷰에 영수증 인증 뱃지가 표시됩니다.' : '배달앱 주문내역이나 영수증을 인증할 수 있습니다.'}
                </p>
              </div>
              <button type="button" onClick={() => setReceiptOpen(true)} className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600">
                <Sparkles className="h-4 w-4" /> {isVerified ? '다시 인증' : '영수증 인증'}
              </button>
            </div>
          </div>
          <label className="block text-sm font-bold">
            리뷰 내용
            <textarea value={memo} onChange={(e) => setMemo(e.target.value)} rows={4} maxLength={500} placeholder="맛, 양, 포장 상태를 알려주세요." className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm" />
          </label>
          <RepresentativeMenuImageInput value={image} onChange={setImage} disabled={submitting} preserveFullImage />
          <button disabled={submitting || !menuName} className="w-full rounded-xl bg-sky-600 py-3 text-sm font-bold text-white disabled:opacity-50">
            {submitting ? '등록 중...' : '리뷰 등록하기'}
          </button>
        </form>
      </main>
      <ReceiptScannerModal
        isOpen={receiptOpen}
        onClose={() => setReceiptOpen(false)}
        onScanSuccess={handleReceiptSuccess}
      />
    </div>
  )
}
