'use client'

import { useState, useEffect } from 'react'
import { X, Heart, ShieldCheck, MapPin, ExternalLink, AlertTriangle, Edit3, Trash2 } from 'lucide-react'
import Link from 'next/link'
import type { Delivery } from '@/lib/types'
import StarRating from './StarRating'
import { getDeliveryImageUrl } from '@/lib/deliveryImage'
import { useAuth } from '@/lib/useAuth'
import { supabase } from '@/lib/supabase'

interface DeliveryDetailModalProps {
  delivery: Delivery | null
  isOpen: boolean
  onClose: () => void
  onBookmarkToggle?: (deliveryId: string) => void
  isBookmarked?: boolean
  onDeleted?: (deliveryId: string) => void
}

export default function DeliveryDetailModal({
  delivery,
  isOpen,
  onClose,
  onBookmarkToggle,
  isBookmarked = false,
  onDeleted,
}: DeliveryDetailModalProps) {
  const { user } = useAuth()
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [reportType, setReportType] = useState<'fake' | 'info_update'>('fake')
  const [reportReason, setReportReason] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!isOpen || !delivery) return null

  const imageUrl = getDeliveryImageUrl(delivery.image_path)
  const kakaoMapUrl = delivery.place_url || 
    `https://map.kakao.com/link/search/${encodeURIComponent(delivery.name)}`

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      alert('신고 기능은 로그인 후 이용하실 수 있습니다.')
      return
    }
    if (!reportReason.trim()) {
      alert('신고 사유를 입력해 주세요.')
      return
    }

    setSubmittingReport(true)
    try {
      const { error } = await supabase.from('reports').insert({
        delivery_id: delivery.id,
        reporter_id: user.id,
        report_type: reportType,
        reason: reportReason.trim(),
      })

      if (error) {
        if (error.code === '23505') {
          alert('이미 신고 접수하신 식당입니다.')
        } else {
          alert('신고 처리 중 오류가 발생했습니다.')
        }
      } else {
        alert('신고 접수가 완료되었습니다. 검토 후 반영하겠습니다.')
        setReportModalOpen(false)
        setReportReason('')
      }
    } catch {
      alert('신고 요청을 전송하지 못했습니다.')
    } finally {
      setSubmittingReport(false)
    }
  }

  const isOwner = Boolean(user && user.id === delivery.user_id)

  const handleDelete = async () => {
    if (!user || !isOwner || !confirm('정말 이 맛집 리뷰를 삭제하시겠습니까?')) return
    setDeleting(true)
    const { error } = await supabase
      .from('deliveries')
      .delete()
      .eq('id', delivery.id)
      .eq('user_id', user.id)
    setDeleting(false)
    if (error) {
      alert('삭제 처리에 실패했습니다.')
      return
    }
    onDeleted?.(delivery.id)
    onClose()
  }

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn font-serif">
      <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-xl max-h-[90vh] bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl overflow-y-auto">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 이미지 및 뱃지 */}
        <div className="relative rounded-2xl overflow-hidden mb-5 bg-slate-100 aspect-video">
          {imageUrl ? (
            <img src={imageUrl} alt={delivery.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl bg-slate-200 text-slate-400">
              🍽️
            </div>
          )}

          {/* AI 영수증 인증 뱃지 */}
          {delivery.is_verified && (
            <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-amber-500 text-white text-xs font-bold shadow-md flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>🥇 AI 영수증 인증</span>
            </div>
          )}

          {/* 하트 즐겨찾기 토글 버튼 */}
          {onBookmarkToggle && (
            <button
              onClick={() => onBookmarkToggle(delivery.id)}
              className="absolute top-3 right-3 p-2.5 rounded-full bg-white/90 backdrop-blur-md text-rose-500 shadow-md hover:scale-110 transition-all"
            >
              <Heart className={`w-5 h-5 ${isBookmarked ? 'fill-rose-500' : ''}`} />
            </button>
          )}
        </div>

        {/* 식당 헤더 정보 */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
              {delivery.category}
            </span>
            <span className="text-xs text-slate-500 font-medium">{delivery.app_name}</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">{delivery.name}</h2>
          <StarRating rating={delivery.rating} className="mt-1" />
        </div>

        {/* 한줄평 메모 */}
        {delivery.memo && (
          <div className="p-4 rounded-2xl bg-sky-50/80 border border-sky-100 text-slate-700 text-sm leading-relaxed mb-5">
            💬 "{delivery.memo}"
          </div>
        )}

        {/* 전체 메뉴 목록 */}
        <div className="mb-6">
          <h3 className="text-base font-bold text-slate-900 mb-3">
            <span>📋 메뉴 목록 ({delivery.menus?.length || 0}개)</span>
          </h3>

          {delivery.menus && delivery.menus.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {delivery.menus.map((menu) => (
                <div
                  key={menu.id}
                  className={`p-3 rounded-xl border text-xs flex justify-between items-center ${
                    menu.is_representative
                      ? 'bg-amber-50/80 border-amber-200 text-slate-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {menu.is_representative && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500 text-white text-[10px] font-bold">
                        대표
                      </span>
                    )}
                    <span className="truncate">{menu.name}</span>
                  </div>
                  <span className="font-bold shrink-0 ml-2">{menu.price.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center bg-slate-50 rounded-xl">
              등록된 상세 메뉴가 없습니다.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-5">
          <Link
            href={`/delivery/${delivery.id}`}
            className="sm:col-span-3 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold text-center hover:bg-slate-800"
          >
            메뉴별 통합 리뷰 보기
          </Link>
          {isOwner && (
            <>
              <Link
                href={`/delivery/${delivery.id}/edit`}
                className="sm:col-span-2 py-2.5 rounded-xl border border-blue-200 text-blue-700 text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-50"
              >
                <Edit3 className="w-3.5 h-3.5" /> 수정
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-center gap-1 hover:bg-rose-50 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? '삭제 중' : '삭제'}
              </button>
            </>
          )}
        </div>

        {/* 카카오맵 실시간 영업여부 바로가기 버튼 */}
        <div className="p-4 rounded-2xl bg-yellow-50 border border-yellow-200 mb-5">
          <a
            href={kakaoMapUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
          >
            <MapPin className="w-4 h-4 text-slate-900" />
            <span>📍 카카오맵에서 영업여부/휴무일 확인</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70 ml-1" />
          </a>
          <p className="text-[11px] text-slate-500 text-center mt-2">
            💡 주문 전 매장 영업시간 및 휴무일을 꼭 확인해 주세요
          </p>
        </div>

        {/* 하단 신고하기 링크 */}
        <div className="flex justify-between items-center text-xs text-slate-400 pt-3 border-t border-slate-100">
          <span>최소주문금액: {delivery.min_order?.toLocaleString()}원</span>
          <button
            onClick={() => setReportModalOpen(true)}
            className="text-rose-500 hover:underline flex items-center gap-1 text-[11px]"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>허위/주작 정보 신고</span>
          </button>
        </div>

        {/* 신고 모달 */}
        {reportModalOpen && (
          <div onClick={() => setReportModalOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
            <div onClick={(event) => event.stopPropagation()} className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
              <h4 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                <span>식당 정보 신고하기</span>
              </h4>
              <form onSubmit={handleReportSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-medium mb-1 text-slate-700">신고 유형</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  >
                    <option value="fake">🔥 허위 / 주작 등록 신고 (5회 시 자동 숨김)</option>
                    <option value="info_update">ℹ️ 단순 정보 수정 요청</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-slate-700">신고 상세 사유</label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    rows={3}
                    placeholder="신고 사유를 구체적으로 작성해 주세요."
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="flex-1 py-2 rounded-lg border border-slate-300 text-slate-600"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="flex-1 py-2 rounded-lg bg-rose-600 text-white font-bold"
                  >
                    {submittingReport ? '전송 중...' : '신고 접수'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
