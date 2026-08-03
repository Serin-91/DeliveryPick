'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit3, Trash2 } from 'lucide-react'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'
import type { Delivery } from '@/lib/types'
import { CATEGORY_EMOJI, DELIVERY_SELECT_WITH_MENUS, normalizeDelivery } from '@/lib/types'
import { formatRegion } from '@/lib/regions'
import Header from '@/components/Header'
import StarRating from '@/components/StarRating'

export default function DetailPage() {
  // 공개 화면 — 비회원도 상세를 볼 수 있다
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const [item, setItem] = useState<Delivery | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [deleting, setDeleting] = useState(false)

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
        setItem(data ? normalizeDelivery(data) : null)
      }
      setLoading(false)
    }
    fetchItem()
    return () => {
      active = false
    }
  }, [params.id])

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

  const handleDelete = async () => {
    // 버튼 숨김은 UX일 뿐이므로 실행 시점에 소유권을 다시 확인한다
    if (!user || user.id !== item.user_id) {
      alert('삭제 권한이 없습니다.')
      return
    }
    if (!confirm('정말로 이 맛집을 삭제하시겠습니까?')) return

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
              <StarRating rating={item.rating} size="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">{item.name}</h2>
            {formatRegion(item.sido, item.sigungu) && (
              <p className="text-xs text-slate-500 font-sans mt-1.5">
                📍 {formatRegion(item.sido, item.sigungu)}
              </p>
            )}
          </div>

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
                <span aria-hidden="true">👤</span> {getAuthorNickname(item)}
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

          {item.memo && (
            <div className="space-y-1">
              <h4 className="text-xs text-slate-500 font-sans">한줄평</h4>
              <p className="bg-slate-50 p-4 rounded-xl text-slate-700 leading-relaxed text-sm">
                {item.memo}
              </p>
            </div>
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
    </div>
  )
}
