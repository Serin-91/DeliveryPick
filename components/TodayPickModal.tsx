'use client'

import { useState } from 'react'
import { X, Sparkles, MapPin, ExternalLink, RefreshCw } from 'lucide-react'
import type { Delivery } from '@/lib/types'
import Dice3D from './Dice3D'
import StarRating from './StarRating'
import { getDeliveryImageUrl } from '@/lib/deliveryImage'

interface TodayPickModalProps {
  isOpen: boolean
  onClose: () => void
  deliveries: Delivery[]
  userRegionName?: string | null
}

export default function TodayPickModal({
  isOpen,
  onClose,
  deliveries,
  userRegionName,
}: TodayPickModalProps) {
  const [rolling, setRolling] = useState(false)
  const [pickedDelivery, setPickedDelivery] = useState<Delivery | null>(null)
  const [aiComment, setAiComment] = useState<string>('')
  const [targetNumber, setTargetNumber] = useState(1)

  if (!isOpen) return null

  const handleRollDice = async () => {
    if (deliveries.length === 0) {
      alert('추천할 배달 맛집 데이터가 없습니다. 먼저 맛집을 등록해 주세요!')
      return
    }

    setRolling(true)
    setPickedDelivery(null)
    setAiComment('')

    const randIndex = Math.floor(Math.random() * deliveries.length)
    const selected = deliveries[randIndex]
    const randDiceNum = Math.floor(Math.random() * 6) + 1
    setTargetNumber(randDiceNum)

    // 1.5초 팽팽 3D 메탈 주사위 회전 후 결과 세팅
    setTimeout(async () => {
      setPickedDelivery(selected)
      setRolling(false)

      // Gemini AI 추천 메시지 호출 API
      try {
        const res = await fetch('/api/ai/recommend', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            deliveryName: selected.name,
            category: selected.category,
            memo: selected.memo,
            userRegionName,
          }),
        })
        const data = await res.json()
        if (data.recommendation) {
          setAiComment(data.recommendation)
        } else {
          setAiComment(`"오늘 같은 날엔 고민 없이 ${selected.name}에서 맛있는 ${selected.category} 어떠세요?"`)
        }
      } catch {
        setAiComment(`"오늘 입맛에 찰떡인 ${selected.name} 추천드립니다!"`)
      }
    }, 1500)
  }

  const imageUrl = pickedDelivery ? getDeliveryImageUrl(pickedDelivery.image_path) : null
  const commentWords = aiComment.split(/\s+/)
  const commentBreakAt = Math.ceil(commentWords.length / 2)
  const kakaoMapUrl = pickedDelivery?.place_url ||
    (pickedDelivery?.name ? `https://map.kakao.com/link/search/${encodeURIComponent(pickedDelivery.name)}` : 'https://map.kakao.com')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl overflow-hidden font-serif">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 상단 타이틀 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI 맛집 룰렛</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">AI 오늘 뭐 먹지? 🎲</h2>
          <p className="text-xs text-slate-500 mt-1">
            {userRegionName ? `📍 ${userRegionName} 주변 맛집 굴리는 중` : '내 주변 맛집 중에서 찰떡 메뉴 추천!'}
          </p>
        </div>

        {/* 3D 다크 메탈 주사위 렌더링 영역 */}
        <div className="my-6 py-4 flex flex-col items-center justify-center min-h-[140px]">
          <Dice3D rolling={rolling} targetNumber={targetNumber} />
          {!rolling && !pickedDelivery && (
            <p className="text-xs text-slate-400 mt-4 animate-bounce">
              👇 아래 [주사위 굴리기] 버튼을 눌러주세요!
            </p>
          )}
        </div>

        {/* 주사위 굴리기 실행 버튼 */}
        {!pickedDelivery && (
          <button
            onClick={handleRollDice}
            disabled={rolling}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${rolling ? 'animate-spin' : ''}`} />
            <span>{rolling ? '맛집 찾는 중...' : '🎲 AI 추천 시작!'}</span>
          </button>
        )}

        {/* 추천 결과 카드 */}
        {pickedDelivery && !rolling && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 animate-scaleUp">
            {/* AI 추천사 */}
            <div className="p-3 mb-4 rounded-xl bg-purple-100/70 text-purple-900 text-xs leading-relaxed font-medium">
              <span aria-hidden="true">💡 </span>
              {aiComment ? (
                <>
                  {commentWords.slice(0, commentBreakAt).join(' ')}
                  <br />
                  {commentWords.slice(commentBreakAt).join(' ')}
                </>
              ) : '오늘의 운명적인 맛집 추천입니다!'}
            </div>

            <div className="flex gap-4 items-center">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={pickedDelivery.name}
                  className="w-20 h-20 rounded-xl object-cover border border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-slate-200 flex items-center justify-center text-2xl">
                  🍽️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-[11px] font-semibold">
                    {pickedDelivery.category}
                  </span>
                  <span className="text-xs text-slate-500">{pickedDelivery.app_name}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 truncate mt-0.5">
                  {pickedDelivery.name}
                </h3>
                <StarRating rating={pickedDelivery.rating} className="mt-1" />
                <p className="text-xs text-slate-600 mt-1">
                  최소주문금액: {pickedDelivery.min_order?.toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 카카오맵 실시간 영업여부 확인 바로가기 버튼 */}
            <div className="mt-4 pt-3 border-t border-slate-200/80 flex flex-col gap-2">
              <a
                href={kakaoMapUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm"
              >
                <MapPin className="w-4 h-4 text-slate-900" />
                <span>📍 카카오맵에서 영업여부/휴무일 확인</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
              </a>
              <p className="text-[11px] text-slate-400 text-center">
                💡 주문 전 매장 영업시간 및 휴무일을 꼭 확인해 주세요
              </p>
            </div>

            <button
              onClick={handleRollDice}
              className="w-full mt-3 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-medium text-xs hover:bg-slate-100 transition-all flex items-center justify-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>다시 굴리기</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
