'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, MapPin, Sparkles, Plus, Trash2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import Header from '@/components/Header'
import BottomNav from '@/components/BottomNav'
import ReceiptScannerModal from '@/components/ReceiptScannerModal'
import StarRating from '@/components/StarRating'
import LoginRequiredModal from '@/components/LoginRequiredModal'
import RegionMenuFields from '@/components/RegionMenuFields'
import type { RegionValue } from '@/components/RegionMenuFields'
import { FORM_CATEGORIES, APP_NAMES } from '@/lib/types'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import RepresentativeMenuImageInput from '@/components/RepresentativeMenuImageInput'
import type { RepresentativeImageValue } from '@/components/RepresentativeMenuImageInput'
import { removeDeliveryImage, uploadDeliveryImage } from '@/lib/deliveryImage'
import { getUserAvatarUrl } from '@/lib/userAvatar'

interface MenuDraft {
  name: string
  price: string
  is_representative: boolean
}

interface ExistingStoreSuggestion {
  id: string
  name: string
  sido: string | null
  sigungu: string | null
  delivery_menus?: { name: string; is_representative: boolean }[] | null
}

// 콤마 포맷팅 유틸: 숫자만 추출 후 toLocaleString
function formatNumberWithComma(value: string): string {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString()
}

function parseCommaNumber(value: string): number {
  return Number(value.replace(/,/g, '')) || 0
}

export default function RegisterPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [ocrModalOpen, setOcrModalOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)

  // 로그인 여부 확인이 끝났는데 비회원이면 즉시 안내 모달을 띄운다.
  useEffect(() => {
    if (!authLoading && !user) setShowLoginModal(true)
  }, [authLoading, user])

  // 폼 필드
  const [name, setName] = useState('')
  const [category, setCategory] = useState('')
  const [appName, setAppName] = useState('')
  const [region, setRegion] = useState<RegionValue>({ sido: '', sigungu: '' })
  const [minOrder, setMinOrder] = useState('')
  const [rating, setRating] = useState(0)
  const [memo, setMemo] = useState('')
  const [representativeImage, setRepresentativeImage] = useState<RepresentativeImageValue>({
    blob: null,
    removeExisting: false,
  })

  // 영수증 인증 필드
  const [orderNumber, setOrderNumber] = useState('')
  const [isVerified, setIsVerified] = useState(false)

  // 메뉴 (최대 30개)
  const [menus, setMenus] = useState<MenuDraft[]>([
    { name: '', price: '', is_representative: true },
  ])

  const [submitting, setSubmitting] = useState(false)
  const [storeSuggestions, setStoreSuggestions] = useState<ExistingStoreSuggestion[]>([])
  const [searchingStores, setSearchingStores] = useState(false)

  // 최초 등록 게시물만 검색해 새 게시물 중복 생성을 막는다.
  useEffect(() => {
    const query = name.trim().replace(/[%_,]/g, '')
    if (query.length < 2) {
      setStoreSuggestions([])
      setSearchingStores(false)
      return
    }
    let active = true
    setSearchingStores(true)
    const timer = window.setTimeout(async () => {
      const { data } = await supabase
        .from('deliveries')
        .select('id,name,sido,sigungu,delivery_menus(name,is_representative)')
        .is('root_delivery_id', null)
        .ilike('name', `%${query}%`)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true })
        .limit(6)
      if (!active) return
      setStoreSuggestions((data || []) as ExistingStoreSuggestion[])
      setSearchingStores(false)
    }, 250)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [name])

  // OCR 결과 자동입력 처리
  const handleOcrSuccess = (data: any) => {
    if (data.storeName) setName(data.storeName)
    if (data.appName && APP_NAMES.includes(data.appName as any)) setAppName(data.appName)
    // 영수증의 "총결제금액"은 가게의 "최소주문금액" 정책과 다른 값이므로 자동입력하지 않는다.
    if (data.orderNumber) setOrderNumber(`${data.appName || 'APP'}_${data.orderNumber}`)
    setIsVerified(true)

    if (data.menus && Array.isArray(data.menus) && data.menus.length > 0) {
      const draftList: MenuDraft[] = data.menus.slice(0, 30).map((m: any, idx: number) => ({
        name: m.name || '',
        price: m.price ? formatNumberWithComma(String(m.price)) : '',
        is_representative: idx === 0,
      }))
      setMenus(draftList)
    }
  }

  // 메뉴 추가 (최대 30개 제한)
  const handleAddMenu = () => {
    if (menus.length >= 30) {
      alert('메뉴는 최대 30개까지 등록할 수 있습니다.')
      return
    }
    setMenus((prev) => [...prev, { name: '', price: '', is_representative: false }])
  }

  const handleRemoveMenu = (index: number) => {
    if (menus.length === 1) {
      alert('최소 1개의 메뉴 정보는 필요합니다.')
      return
    }
    setMenus((prev) => prev.filter((_, i) => i !== index))
  }

  const handleMenuChange = (index: number, field: keyof MenuDraft, value: any) => {
    setMenus((prev) =>
      prev.map((m, i) => {
        if (i === index) {
          if (field === 'is_representative' && value === true) {
            // 대표 메뉴는 1개만 허용
            return { ...m, is_representative: true }
          }
          return { ...m, [field]: value }
        }
        if (field === 'is_representative' && value === true) {
          return { ...m, is_representative: false }
        }
        return m
      })
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setShowLoginModal(true)
      return
    }

    if (!name.trim()) {
      alert('가게/식당 이름을 입력해 주세요.')
      return
    }
    if (!category) {
      alert('음식 카테고리를 선택해 주세요.')
      return
    }
    if (!appName) {
      alert('주요 이용 배달앱을 선택해 주세요.')
      return
    }
    if (!region.sido || !region.sigungu) {
      alert('지역(시/도, 시/군/구)을 선택해 주세요.')
      return
    }
    if (!minOrder.trim() || parseCommaNumber(minOrder) <= 0) {
      alert('최소주문금액을 1원 이상 입력해 주세요.')
      return
    }
    if (rating < 0.5 || rating > 5) {
      alert('만족도 평점을 0.5~5점 중에서 직접 선택해 주세요.')
      return
    }
    if (menus.length === 0 || menus.some((menu) => !menu.name.trim())) {
      alert('추천 메뉴명을 모두 입력해 주세요.')
      return
    }
    if (menus.some((menu) => !menu.price.trim() || parseCommaNumber(menu.price) <= 0)) {
      alert('추천 메뉴 가격을 모두 1원 이상 입력해 주세요.')
      return
    }
    if (menus.filter((menu) => menu.is_representative).length !== 1) {
      alert('대표 추천 메뉴를 정확히 1개 선택해 주세요.')
      return
    }
    const normalizedMenuNames = menus.map((menu) => menu.name.trim().replace(/\s+/g, '').toLocaleLowerCase('ko-KR'))
    if (new Set(normalizedMenuNames).size !== normalizedMenuNames.length) {
      alert('같은 추천 메뉴를 중복해서 등록할 수 없습니다.')
      return
    }

    const exactExisting = storeSuggestions.find(
      (store) => store.name.replace(/\s+/g, '').toLocaleLowerCase('ko-KR') === name.trim().replace(/\s+/g, '').toLocaleLowerCase('ko-KR')
    )
    if (exactExisting) {
      alert('이미 등록된 맛집입니다. 기존 상세 페이지에서 새 리뷰를 등록해 주세요.')
      router.push(`/delivery/${exactExisting.id}`)
      return
    }

    // 자동완성 응답 전에 제출해도 서버에서 한 번 더 중복을 확인한다.
    const normalizedInputName = name.trim().replace(/\s+/g, '').toLocaleLowerCase('ko-KR')
    const duplicateQuery = name.trim().replace(/[%_,]/g, '')
    const { data: duplicateCandidates } = await supabase
      .from('deliveries')
      .select('id,name')
      .is('root_delivery_id', null)
      .ilike('name', `%${duplicateQuery}%`)
      .eq('is_hidden', false)
      .limit(10)
    const duplicate = duplicateCandidates?.find(
      (store) => store.name.replace(/\s+/g, '').toLocaleLowerCase('ko-KR') === normalizedInputName
    )
    if (duplicate) {
      alert('이미 등록된 맛집입니다. 기존 상세 페이지에서 새 리뷰를 등록해 주세요.')
      router.push(`/delivery/${duplicate.id}`)
      return
    }

    setSubmitting(true)

    try {
      // 1. deliveries 테이블에 등록
      const { data: dData, error: dErr } = await supabase
        .from('deliveries')
        .insert({
          name: name.trim(),
          category,
          app_name: appName,
          sido: region.sido,
          sigungu: region.sigungu,
          min_order: parseCommaNumber(minOrder),
          rating,
          memo: memo.trim(),
          user_id: user.id,
          order_number: orderNumber || null,
          is_verified: isVerified,
          user_nickname:
            user.user_metadata?.nickname || user.user_metadata?.display_name || '회원',
          user_avatar_url: getUserAvatarUrl(user),
        })
        .select()
        .single()

      if (dErr) {
        if (dErr.code === '23505') {
          alert('⚠️ 이미 등록된 영수증 주문번호입니다! 중복 등록이 차단되었습니다.')
        } else {
          alert('식당 등록 중 오류가 발생했습니다: ' + dErr.message)
        }
        setSubmitting(false)
        return
      }

      // 2. delivery_menus 테이블에 메뉴 등록
      const validMenus = menus
      if (validMenus.length > 0 && dData) {
        const menuRows = validMenus.map((m, idx) => ({
          delivery_id: dData.id,
          name: m.name.trim(),
          price: parseCommaNumber(m.price),
          is_representative: m.is_representative,
          sort_order: idx,
        }))

        const { error: menuError } = await supabase.from('delivery_menus').insert(menuRows)
        if (menuError) {
          await supabase.from('deliveries').delete().eq('id', dData.id).eq('user_id', user.id)
          throw new Error(`추천 메뉴 저장에 실패했습니다: ${menuError.message}`)
        }
      }

      if (representativeImage.blob && dData) {
        let uploadedPath: string | null = null
        try {
          uploadedPath = await uploadDeliveryImage(user.id, dData.id, representativeImage.blob)
          const { error: imageError } = await supabase
            .from('deliveries')
            .update({ image_path: uploadedPath })
            .eq('id', dData.id)
            .eq('user_id', user.id)
          if (imageError) throw imageError
        } catch {
          if (uploadedPath) await removeDeliveryImage(uploadedPath).catch(() => undefined)
          await supabase.from('deliveries').delete().eq('id', dData.id).eq('user_id', user.id)
          alert('사진 저장에 실패해 등록을 취소했습니다. 잠시 후 다시 시도해 주세요.')
          return
        }
      }

      alert('🎉 성공적으로 배달 맛집이 등록되었습니다!')
      router.push('/')
    } catch (err: any) {
      alert(err.message || '등록 처리 중 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col font-serif bg-gradient-to-b from-sky-50 to-slate-50">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-4 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>홈으로 돌아가기</span>
        </Link>

        {!authLoading && !user && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-700">
            <span>🔒 맛집 등록은 로그인 후 이용하실 수 있습니다.</span>
            <button
              type="button"
              onClick={() => setShowLoginModal(true)}
              className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-white hover:bg-amber-600"
            >
              로그인 / 회원가입
            </button>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl border border-white/80 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">🛵 새 배달 맛집 등록</h1>
              <p className="text-xs text-slate-500 mt-1">
                실패 없는 나의 인생 배달 맛집 정보를 입력해 주세요.
              </p>
            </div>

            {/* AI 영수증 3초 스캐너 버튼 */}
            <button
              type="button"
              onClick={() => setOcrModalOpen(true)}
              className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Sparkles className="w-4 h-4" />
              <span>Gemini AI 영수증 인식</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 text-sm">
            {/* 가게 이름 */}
            <div className="relative">
              <label className="block font-bold text-slate-800 mb-1">식당 / 가게 이름 *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 굽네치킨 역삼점"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base focus:ring-2 focus:ring-blue-500/30"
                autoComplete="off"
              />
              {(searchingStores || storeSuggestions.length > 0) && (
                <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-sky-200 bg-white shadow-xl">
                  <div className="border-b border-slate-100 px-3 py-2 text-[11px] font-bold text-sky-700">
                    {searchingStores ? '기존 맛집 검색 중...' : '이미 등록된 맛집인가요? 선택해서 리뷰를 남기세요.'}
                  </div>
                  {!searchingStores && storeSuggestions.map((store) => {
                    const representative = store.delivery_menus?.find((menu) => menu.is_representative)?.name
                    const regionLabel = [store.sido, store.sigungu].filter(Boolean).join(' ')
                    return (
                      <button
                        key={store.id}
                        type="button"
                        onClick={() => router.push(`/delivery/${store.id}`)}
                        className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-sky-50"
                      >
                        <span className="min-w-0">
                          <strong className="block truncate text-sm text-slate-800">{store.name}</strong>
                          <span className="block truncate text-[11px] text-slate-500">
                            {[regionLabel, representative && `대표 메뉴 ${representative}`].filter(Boolean).join(' · ') || '기존 등록 게시물'}
                          </span>
                        </span>
                        <span className="shrink-0 rounded-lg bg-sky-600 px-2.5 py-1.5 text-[11px] font-bold text-white">리뷰 보기</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 카테고리 & 배달앱 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">음식 카테고리 *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="" disabled>선택</option>
                  {FORM_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">주요 이용 배달앱 *</label>
                <select
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="" disabled>선택</option>
                  {APP_NAMES.map((app) => (
                    <option key={app} value={app}>
                      {app}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <RegionMenuFields
              value={region}
              onChange={(patch) => setRegion((prev) => ({ ...prev, ...patch }))}
            />

            {/* 최소주문금액 & 평점 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 mb-1">최소주문금액 (원) *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={minOrder}
                  onChange={(e) => setMinOrder(formatNumberWithComma(e.target.value))}
                  placeholder="입력"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-base"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">만족도 평점 (0.5~5점) *</label>
                <div className="pt-1">
                  <StarRating
                    rating={rating}
                    editable
                    onChange={(r) => setRating(r)}
                    size="lg"
                  />
                  {rating === 0 && <p className="mt-1 text-xs font-semibold text-rose-500">별을 눌러 만족도를 선택해 주세요.</p>}
                </div>
              </div>
            </div>

            {/* 메뉴 입력 (최대 30개 동적 입력) */}
            <div className="pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="font-bold text-slate-800">
                  📋 추천 메뉴명·가격 *
                </label>
                <button
                  type="button"
                  onClick={handleAddMenu}
                  className="text-blue-600 hover:underline text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>[+ 메뉴 추가]</span>
                </button>
              </div>

              <div className="space-y-2">
                {menus.map((m, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="메뉴명 (예: 고추바사삭)"
                      value={m.name}
                      required
                      onChange={(e) => handleMenuChange(idx, 'name', e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="가격 (원)"
                      value={m.price}
                      required
                      onChange={(e) => handleMenuChange(idx, 'price', formatNumberWithComma(e.target.value))}
                      className="w-32 px-3 py-2.5 rounded-xl border border-slate-300 text-sm"
                    />
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={m.is_representative}
                        onChange={(e) =>
                          handleMenuChange(idx, 'is_representative', e.target.checked)
                        }
                      />
                      <span>대표</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveMenu(idx)}
                      className="p-1 text-slate-400 hover:text-rose-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <RepresentativeMenuImageInput
              value={representativeImage}
              onChange={setRepresentativeImage}
              disabled={submitting}
            />

            {/* 한줄평 */}
            <div>
              <label className="block font-bold text-slate-800 mb-1">
                💬 솔직한 추천 한줄평 / 꿀팁
              </label>
              <textarea
                rows={3}
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="예: 마블링 소스 추가는 필수! 튀김옷이 끝까지 바삭함."
                className="w-full p-3 rounded-xl border border-slate-300 text-xs"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? '맛집 정보 저장 중...' : '등록하기 완료'}
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

      {showLoginModal && (
        <LoginRequiredModal
          description={'맛집 등록은 로그인 후 이용하실 수 있습니다.\n로그인하고 나만의 인생 배달 맛집을 등록해보세요.'}
          next="/register"
          onClose={() => setShowLoginModal(false)}
        />
      )}
    </div>
  )
}
