'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Edit3, MessageSquarePlus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import type { Delivery, ReviewGrade } from '@/lib/types'
import {
  CATEGORY_EMOJI,
  DELIVERY_SELECT_WITH_MENUS,
  getRepresentativeMenu,
  getReviewGradeFromCounts,
  normalizeDelivery,
} from '@/lib/types'
import { formatRegion } from '@/lib/regions'
import { getDeliveryImageUrl, removeDeliveryImage } from '@/lib/deliveryImage'
import Header from '@/components/Header'
import StarRating from '@/components/StarRating'

export default function DetailPage() {
  // 공개 화면 — 비회원도 상세를 볼 수 있다
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const searchParams = useSearchParams()
  const [item, setItem] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [relatedReviews, setRelatedReviews] = useState<Delivery[]>([])
  const [gradesByUser, setGradesByUser] = useState<Record<string, ReviewGrade>>({})
  const [avatarsByUser, setAvatarsByUser] = useState<Record<string, string>>({})
  const [selectedMenuName, setSelectedMenuName] = useState('')
  const [selectedReview, setSelectedReview] = useState<Delivery | null>(null)

  const loadUserGrades = async (userIds: string[]) => {
    const ids = [...new Set(userIds.filter(Boolean))]
    if (ids.length === 0) return
    const { data } = await supabase
      .from('deliveries')
      .select('user_id,image_path,is_verified,user_avatar_url,created_at')
      .in('user_id', ids)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false })
    if (!data) return
    const counts: Record<string, { photo: number; receipt: number }> = {}
    data.forEach((review) => {
      const current = counts[review.user_id] || { photo: 0, receipt: 0 }
      if (review.image_path) current.photo += 1
      if (review.is_verified) current.receipt += 1
      counts[review.user_id] = current
    })
    const avatars: Record<string, string> = {}
    data.forEach((review) => {
      if (!avatars[review.user_id] && review.user_avatar_url) avatars[review.user_id] = review.user_avatar_url
    })
    setAvatarsByUser((prev) => ({ ...prev, ...avatars }))
    setGradesByUser((prev) => ({
      ...prev,
      ...Object.fromEntries(ids.map((id) => {
        const count = counts[id] || { photo: 0, receipt: 0 }
        return [id, getReviewGradeFromCounts(count.photo, count.receipt)]
      })),
    }))
  }

  // 데이터 조회는 로그인 여부와 무관하게 실행한다
  useEffect(() => {
    let active = true
    const fetchItem = async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select(DELIVERY_SELECT_WITH_MENUS)
        .eq('id', params.id)
        .maybeSingle()

      if (!active) return
      if (error) {
        setLoadError(true)
      } else {
        const openedItem = data ? normalizeDelivery(data) : null
        if (openedItem) {
          const rootId = openedItem.root_delivery_id || openedItem.id
          const rootItem = openedItem.root_delivery_id
            ? await supabase
                .from('deliveries')
                .select(DELIVERY_SELECT_WITH_MENUS)
                .eq('id', rootId)
                .maybeSingle()
            : { data, error: null }
          const normalized = rootItem.data ? normalizeDelivery(rootItem.data) : openedItem
          setItem(normalized)
          const requestedMenu = searchParams.get('menu')
          setSelectedMenuName(
            normalized.menus?.some((menu) => menu.name === requestedMenu)
              ? requestedMenu!
              : getRepresentativeMenu(normalized)?.name || normalized.menus?.[0]?.name || ''
          )
          const { data: sameStoreData } = await supabase
            .from('deliveries')
            .select(DELIVERY_SELECT_WITH_MENUS)
            .eq('root_delivery_id', rootId)
            .order('created_at', { ascending: false })
          if (active && sameStoreData) {
            const related = sameStoreData.map(normalizeDelivery)
            setRelatedReviews(related)
            loadUserGrades([normalized.user_id, ...related.map((review) => review.user_id)])
          }
        } else setItem(null)
      }
      setLoading(false)
    }
    fetchItem()
    return () => {
      active = false
    }
  }, [params.id, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sky-600 font-sans text-sm">
        불러오는 중...
      </div>
    )
  }

  // 조회 오류와 데이터 없음을 구분해서 보여준다
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-serif">
        <Header user={user} />
        <main className="max-w-4xl mx-auto p-6 text-center font-sans text-sm space-y-3">
          <p className="text-rose-500">맛집 정보를 불러오지 못했습니다.</p>
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

  if (!item) {
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

  // 작성자 본인 여부 — 수정·삭제 UI 노출 조건
  const isOwner = Boolean(user && item && user.id === item.user_id)
  const imageUrl = getDeliveryImageUrl(item.image_path)
  const representativeMenu = getRepresentativeMenu(item)
  const restaurantReviews = [item, ...relatedReviews]
  // 메뉴 분류 기준은 반드시 최초 등록 게시물의 메뉴 목록만 사용한다.
  const menuNames = [...new Set(item.menus?.map((menu) => menu.name) || [])]
  const activeMenuName = selectedMenuName || menuNames[0] || ''
  const menuReviews = activeMenuName
    ? restaurantReviews.filter((review) => review.menus?.some((menu) => menu.name === activeMenuName))
    : []
  const validMenuRatings = menuReviews
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating >= 0.5 && rating <= 5)
  const averageMenuRating = validMenuRatings.length
    ? validMenuRatings.reduce((sum, rating) => sum + rating, 0) / validMenuRatings.length
    : 0
  const representativeMenuReview = [...menuReviews].sort((a, b) => {
    const score = (review: Delivery) =>
      (review.image_path ? 3 : 0) +
      ((review.memo?.length || 0) >= 30 ? 2 : 0) +
      ((review.memo?.length || 0) >= 80 ? 1 : 0) +
      (Date.now() - new Date(review.created_at).getTime() <= 90 * 24 * 60 * 60 * 1000 ? 1 : 0)
    return score(b) - score(a) || (b.memo?.length || 0) - (a.memo?.length || 0) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })[0]
  const otherMenuReviews = menuReviews.filter((review) => review.id !== representativeMenuReview?.id)
  const reviewWritePath = `/delivery/${item.id}/review?menu=${encodeURIComponent(activeMenuName)}`

  const handleDelete = async () => {
    // 버튼 숨김은 UX일 뿐이므로 실행 시점에 소유권을 다시 확인한다
    if (!user || user.id !== item.user_id) {
      alert('삭제 권한이 없습니다.')
      return
    }
    // root 게시물을 지우면 다른 사용자들이 남긴 리뷰도 DB CASCADE로 함께 삭제되므로 명확히 경고한다
    const confirmMessage =
      relatedReviews.length > 0
        ? `이 맛집을 삭제하면 다른 사용자가 남긴 리뷰 ${relatedReviews.length}건도 함께 영구 삭제됩니다.\n정말로 삭제하시겠습니까?`
        : '정말로 이 맛집을 삭제하시겠습니까?'
    if (!confirm(confirmMessage)) return

    setDeleting(true)
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', item.id)
      .eq('user_id', user.id)
    setDeleting(false)

    if (error) {
      alert('삭제에 실패했습니다.')
      return
    }
    if (item.image_path) {
      try {
        await removeDeliveryImage(item.image_path)
      } catch {
        // 게시물 삭제는 완료됐으므로 저장소의 고아 파일 정리는 실패해도 사용자 흐름을 막지 않는다.
      }
    }
    alert('삭제되었습니다.')
    router.push('/')
  }

  // 작성자 이메일은 절대 노출하지 않는다
  const getAuthorNickname = (target: Delivery) => {
    if (target.user_nickname) return target.user_nickname
    if (user && target.user_id === user.id) {
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

      <main className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sky-100 max-w-xl mx-auto space-y-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-1 text-xs text-sky-600 hover:underline font-sans font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> 목록으로 돌아가기
          </button>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-sans px-2.5 py-1 bg-sky-100 text-sky-800 rounded-md font-medium">
                {CATEGORY_EMOJI[item.category]
                  ? `${CATEGORY_EMOJI[item.category]} ${item.category}`
                  : item.category}
              </span>
              <div className="text-right">
                <StarRating rating={averageMenuRating || item.rating} size="sm" />
                <span className="text-[10px] font-sans text-slate-400">선택 메뉴 평균</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{item.name}</h2>
            {formatRegion(item.sido, item.sigungu) && (
              <p className="text-xs text-slate-500 font-sans mt-1.5">
                📍 {formatRegion(item.sido, item.sigungu)}
              </p>
            )}
          </div>

          {representativeMenuReview && (() => {
            const grade = gradesByUser[representativeMenuReview.user_id] || { emoji: '⚪', label: '둘러보는 손님' }
            const reviewImage = getDeliveryImageUrl(representativeMenuReview.image_path)
            const reviewerAvatar = avatarsByUser[representativeMenuReview.user_id] || representativeMenuReview.user_avatar_url
            return (
              <article className="rounded-2xl border-2 border-sky-200 p-4 bg-gradient-to-br from-sky-50 to-white font-sans">
                <p className="text-xs font-bold text-sky-700 mb-2">대표 리뷰 · {activeMenuName}</p>
                <div className="flex items-center gap-2 text-sm">
                  {reviewerAvatar ? (
                    <img src={reviewerAvatar} alt="대표 리뷰 작성자" referrerPolicy="no-referrer" className="w-8 h-8 rounded-full object-cover" />
                  ) : <span className="w-8 h-8 rounded-full bg-white flex items-center justify-center">👤</span>}
                  <strong>{representativeMenuReview.user_nickname || '회원'}</strong>
                  <span className="text-slate-500">{grade.emoji} {grade.label}</span>
                  {representativeMenuReview.is_verified && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ 영수증 인증</span>
                  )}
                  <span className="ml-auto text-amber-600 font-bold">★ {representativeMenuReview.rating.toFixed(1)}</span>
                </div>
                <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{representativeMenuReview.memo || '작성된 한줄평이 없습니다.'}</p>
                {reviewImage && representativeMenuReview.id !== item.id && (
                  <img src={reviewImage} alt="대표 리뷰 사진" className="mt-3 w-full max-h-80 object-contain rounded-xl bg-slate-50" />
                )}
              </article>
            )
          })()}

          {imageUrl && (
            <figure className="space-y-2">
              <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100 border border-sky-100">
                <img
                  src={imageUrl}
                  alt={`${representativeMenu?.name || item.name} 대표 메뉴`}
                  className="w-full h-full object-contain"
                />
              </div>
              {representativeMenu && (
                <figcaption className="text-[11px] text-slate-500 font-sans text-center">
                  대표 메뉴 · {representativeMenu.name}
                </figcaption>
              )}
            </figure>
          )}

          {item.menus && item.menus.length > 0 && (
            <div className="space-y-2 font-sans">
              <h4 className="text-xs text-sky-700 font-semibold">
                메뉴 <span className="text-slate-400 font-normal">({item.menus.length}개)</span>
              </h4>
              <ul className="space-y-1.5">
                {item.menus.map((menu) => (
                  <li
                    key={menu.id}
                    className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border ${
                      menu.is_representative
                        ? 'bg-gradient-to-br from-sky-50 to-white border-sky-200'
                        : 'bg-slate-50 border-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      {menu.is_representative && (
                        <span
                          title="대표 메뉴"
                          className="text-[10px] px-1.5 py-0.5 bg-sky-500 text-white rounded font-bold shrink-0"
                        >
                          ⭐ 대표
                        </span>
                      )}
                      <span
                        className={`truncate ${
                          menu.is_representative
                            ? 'text-base font-bold text-slate-800'
                            : 'text-sm text-slate-700'
                        }`}
                      >
                        {menu.name}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 ${
                        menu.is_representative
                          ? 'text-base font-bold text-sky-700'
                          : 'text-sm font-semibold text-slate-600'
                      }`}
                    >
                      {menu.price.toLocaleString()}원
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 bg-sky-50/50 p-4 rounded-xl text-sm font-sans">
            <div>
              <span className="text-slate-500 text-xs block">작성자</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                {(item.user_avatar_url || (isOwner && user?.user_metadata?.avatar_url)) ? (
                  <img
                    src={item.user_avatar_url || user?.user_metadata?.avatar_url}
                    alt="작성자 프로필"
                    className="w-6 h-6 rounded-full object-cover border border-sky-100"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-sky-100 flex items-center justify-center text-[10px]">👤</span>
                )}
                <span>{getAuthorNickname(item)}</span>
              </span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">주요 배달앱</span>
              <span className="font-semibold text-sky-900">{item.app_name}</span>
            </div>
            <div>
              <span className="text-slate-500 text-xs block">최소주문금액</span>
              <span className="font-semibold text-slate-800">
                {(item.min_order ?? 0).toLocaleString()}원
              </span>
            </div>
          </div>

          {menuNames.length > 0 && (
            <section className="space-y-4 pt-4 border-t border-slate-100 font-sans">
              <div>
                <h3 className="font-bold text-slate-900">메뉴별 통합 리뷰</h3>
                <div className="flex gap-2 overflow-x-auto py-2">
                  {menuNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setSelectedMenuName(name)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                        activeMenuName === name
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'bg-white border-slate-200 text-slate-600'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-sky-50 border border-sky-100 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">{activeMenuName}</h4>
                    <p className="mt-1 text-[11px] text-slate-500">최초 등록자의 메뉴명을 기준으로 리뷰가 모입니다.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(user ? reviewWritePath : `/login?next=${encodeURIComponent(reviewWritePath)}`)}
                    className="group inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-orange-200 ring-2 ring-orange-200 transition hover:-translate-y-0.5 hover:from-orange-600 hover:to-rose-600 hover:shadow-xl sm:w-auto"
                  >
                    <MessageSquarePlus className="h-5 w-5" />
                    <span className="text-left leading-tight">
                      <span className="block">이 메뉴 리뷰 남기기</span>
                      <span className="block text-[10px] font-semibold text-orange-50">사진 · 영수증 인증 가능</span>
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-sm text-slate-600">
                  <span>⭐ 평균 {averageMenuRating.toFixed(1)}</span>
                  <span>🔥 {validMenuRatings.length}개 평점</span>
                  <span>사진 {menuReviews.filter((review) => review.image_path).length}장</span>
                </div>
              </div>

              {otherMenuReviews.length > 0 && (
                <div>
                  <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
                    <span>이 메뉴를 평가한 다른 리뷰어들</span>
                    <span>{otherMenuReviews.length}개</span>
                  </div>
                  <div
                    aria-label="다른 리뷰 가로 목록"
                    className="flex gap-3 overflow-x-auto snap-x snap-mandatory overscroll-x-contain scroll-smooth touch-pan-x pb-3"
                  >
                    {otherMenuReviews.map((review) => {
                      const grade = gradesByUser[review.user_id] || { emoji: '⚪', label: '둘러보는 손님' }
                      const reviewImage = getDeliveryImageUrl(review.image_path)
                      const reviewerAvatar = avatarsByUser[review.user_id] || review.user_avatar_url
                      return (
                        <article
                          key={review.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedReview(review)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') setSelectedReview(review)
                          }}
                          className="snap-start shrink-0 basis-[85%] sm:basis-[42%] cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-md"
                        >
                          <div className="flex items-center gap-2 text-xs">
                            {reviewerAvatar ? <img src={reviewerAvatar} alt="리뷰 작성자" referrerPolicy="no-referrer" className="w-7 h-7 rounded-full object-cover" /> : <span>👤</span>}
                            <strong>{review.user_nickname || '회원'}</strong>
                            <span className="text-slate-500">{grade.emoji} {grade.label}</span>
                            {review.is_verified && (
                              <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">✓ 영수증</span>
                            )}
                          </div>
                          <p className="mt-2 text-amber-600 font-bold text-sm">★ {review.rating.toFixed(1)}</p>
                          <p className="mt-2 text-sm text-slate-700 line-clamp-3">{review.memo || '작성된 한줄평이 없습니다.'}</p>
                          {reviewImage && <img src={reviewImage} alt="리뷰 사진" className="mt-3 h-40 w-full rounded-xl bg-slate-50 object-contain" />}
                          <time className="block mt-2 text-[11px] text-slate-400">{new Date(review.created_at).toLocaleDateString('ko-KR')}</time>
                          <span className="mt-2 block text-[11px] font-semibold text-sky-600">눌러서 리뷰 전체 보기</span>
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 수정·삭제는 작성자 본인에게만 노출 */}
          {isOwner && (
            <div className="flex gap-3 pt-4 border-t border-slate-100 font-sans">
              <button
                onClick={() => router.push(`/delivery/${item.id}/edit`)}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-sky-200 text-sky-700 rounded-xl hover:bg-sky-50 text-sm transition font-medium"
              >
                <Edit3 className="w-4 h-4" /> 수정
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-rose-200 text-rose-600 rounded-xl hover:bg-rose-50 text-sm transition font-medium disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" /> {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          )}
        </div>
      </main>

      {selectedReview && (() => {
        const reviewImage = getDeliveryImageUrl(selectedReview.image_path)
        const reviewerAvatar = avatarsByUser[selectedReview.user_id] || selectedReview.user_avatar_url
        const grade = gradesByUser[selectedReview.user_id] || { emoji: '⚪', label: '둘러보는 손님' }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm" onClick={() => setSelectedReview(null)}>
            <article className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
              <button type="button" onClick={() => setSelectedReview(null)} aria-label="리뷰 닫기" className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200">
                <X className="h-5 w-5" />
              </button>
              <p className="pr-12 text-xs font-bold text-sky-700">{activeMenuName} 리뷰</p>
              <div className="mt-4 flex items-center gap-2 text-sm">
                {reviewerAvatar ? <img src={reviewerAvatar} alt="리뷰 작성자" referrerPolicy="no-referrer" className="h-10 w-10 rounded-full object-cover" /> : <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100">👤</span>}
                <div>
                  <strong className="block">{selectedReview.user_nickname || '회원'}</strong>
                  <span className="text-xs text-slate-500">{grade.emoji} {grade.label}</span>
                </div>
                <span className="ml-auto font-bold text-amber-600">★ {selectedReview.rating.toFixed(1)}</span>
              </div>
              {selectedReview.is_verified && <span className="mt-3 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">✓ 영수증 인증 리뷰</span>}
              <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-700">{selectedReview.memo || '작성된 리뷰 내용이 없습니다.'}</p>
              {reviewImage && <img src={reviewImage} alt="리뷰 첨부 사진" className="mt-4 max-h-[60vh] w-full rounded-2xl bg-slate-50 object-contain" />}
              <time className="mt-4 block text-xs text-slate-400">{new Date(selectedReview.created_at).toLocaleDateString('ko-KR')}</time>
            </article>
          </div>
        )
      })()}
    </div>
  )
}
