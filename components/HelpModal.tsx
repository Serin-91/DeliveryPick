'use client'

import { X, ShieldCheck, Sparkles, MapPin, Heart, AlertTriangle } from 'lucide-react'

interface HelpModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  if (!isOpen) return null

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn font-serif">
      <div onClick={(event) => event.stopPropagation()} className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-slate-900 mt-2">DeliveryPick 이용 가이드</h2>
          <p className="text-sm text-slate-500 mt-1">실패 없는 배달 맛집 엄선 서비스 주요 기능 안내</p>
        </div>

        <div className="space-y-3.5 text-sm text-slate-700">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900">🥇 AI 영수증 실거래 인증</h4>
              <p className="text-slate-600 text-xs mt-0.5">
                영수증 사진 1장 업로드 시 3초 만에 폼이 자동 입력되며, 중복 등록 없는 안심 맛집 뱃지 부여!
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900">🎲 오늘 뭐 먹지? 맛집 룰렛</h4>
              <p className="text-slate-600 text-xs mt-0.5">
                GPS 현재 위치 또는 직접 선택한 지역의 등록 맛집 중 한 곳을 추천!
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-100 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900">📍 카카오맵 실시간 영업여부 확인</h4>
              <p className="text-slate-600 text-xs mt-0.5">
                주문 전 매장 휴무일 및 실제 영업시간을 클릭 한 번으로 카카오맵에서 즉시 확인 가능.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 flex items-start gap-3">
            <Heart className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900">❤️ 하트 단골 맛집 & 마이페이지</h4>
              <p className="text-slate-600 text-xs mt-0.5">
                즐겨찾는 맛집을 하트로 찜하고, 마이페이지에서 프로필 사진 수정 및 내 정보 관리!
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
            <h4 className="font-bold text-slate-900">🏅 리뷰 등급 기준</h4>
            <ul className="mt-2 space-y-1.5 text-xs text-slate-600">
              <li>⚪ 둘러보는 손님 — 리뷰 없음</li>
              <li>🌱 리뷰 새싹 — 포토리뷰 1개 이상</li>
              <li>🥈 리뷰 고수 — 포토리뷰 5개 이상 + 영수증 리뷰 3개 이상</li>
              <li>🥇 리뷰 달인 — 포토리뷰 15개 이상 + 영수증 리뷰 10개 이상</li>
            </ul>
          </div>

          {/* #12: 허위정보 등록 제재 안내 */}
          <div className="p-4 rounded-2xl bg-orange-50 border border-orange-100 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-slate-900">🚨 허위/광고성 정보 등록 제재 안내</h4>
              <p className="text-slate-600 text-xs mt-0.5">
                허위 정보 또는 광고성 글 등록 시 다른 이용자의 신고를 통해 <strong>5회 이상 적발되면 해당 게시물은 자동 숨김 처리</strong>되며,
                반복적인 허위 등록 시 <strong>계정 이용이 제한</strong>될 수 있습니다.
                건전하고 신뢰할 수 있는 맛집 커뮤니티를 위해 협조 부탁드립니다.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition-all"
        >
          확인하고 둘러보기
        </button>
      </div>
    </div>
  )
}
