'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Dices, MapPin, ExternalLink, RefreshCw } from 'lucide-react'
import type { TodayPickCandidate, TodayPickSelection } from '@/lib/todayPick'
import Dice3D from './Dice3D'
import StarRating from './StarRating'
import { getDeliveryImageUrl } from '@/lib/deliveryImage'
import { SIDO_LIST, getSigunguList } from '@/lib/regions'

interface TodayPickModalProps {
  isOpen: boolean
  onClose: () => void
  selection: TodayPickSelection
  pickSido: string
  pickSigungu: string
  onPickSidoChange: (sido: string) => void
  onPickSigunguChange: (sigungu: string) => void
  onRequestLocation: () => void
  locationPermissionDenied: boolean
}

function formatDistance(distanceKm: number) {
  return distanceKm < 1
    ? `약 ${Math.max(1, Math.round(distanceKm * 1000))}m`
    : `약 ${distanceKm.toFixed(1)}km`
}

function getPickComment(candidate: TodayPickCandidate, selection: TodayPickSelection) {
  if (candidate.distanceKm !== null) {
    return `현재 위치에서 ${formatDistance(candidate.distanceKm)} 거리예요. 오늘은 ${candidate.delivery.name}의 ${candidate.delivery.category} 메뉴를 즐겨보세요!`
  }

  return `${selection.locationLabel}에서 찾은 오늘의 맛집이에요. ${candidate.delivery.name}의 ${candidate.delivery.category} 메뉴는 어떠세요?`
}

export default function TodayPickModal({
  isOpen,
  onClose,
  selection,
  pickSido,
  pickSigungu,
  onPickSidoChange,
  onPickSigunguChange,
  onRequestLocation,
  locationPermissionDenied,
}: TodayPickModalProps) {
  const [rolling, setRolling] = useState(false)
  const [pickedCandidate, setPickedCandidate] = useState<TodayPickCandidate | null>(null)
  const [pickComment, setPickComment] = useState('')
  const [targetNumber, setTargetNumber] = useState(1)
  const rollTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current)
    rollTimerRef.current = null
    setRolling(false)
    setPickedCandidate(null)
    setPickComment('')
  }, [selection.mode, selection.locationLabel])

  if (!isOpen) return null

  const handleClose = () => {
    if (rollTimerRef.current !== null) window.clearTimeout(rollTimerRef.current)
    rollTimerRef.current = null
    setRolling(false)
    setPickedCandidate(null)
    setPickComment('')
    onClose()
  }

  const handleRollDice = () => {
    if (selection.candidates.length === 0) {
      alert(
        selection.mode === 'none'
          ? '내 위치를 사용하거나 메인 화면에서 시/도를 선택해 주세요.'
          : `${selection.locationLabel}에 추천할 등록 맛집이 없습니다.`
      )
      return
    }

    setRolling(true)
    setPickedCandidate(null)
    setPickComment('')

    const candidate = selection.candidates[
      Math.floor(Math.random() * selection.candidates.length)
    ]
    setTargetNumber(Math.floor(Math.random() * 6) + 1)

    rollTimerRef.current = window.setTimeout(() => {
      setPickedCandidate(candidate)
      setPickComment(getPickComment(candidate, selection))
      setRolling(false)
      rollTimerRef.current = null
    }, 1500)
  }

  const pickedDelivery = pickedCandidate?.delivery || null
  const imageUrl = pickedDelivery ? getDeliveryImageUrl(pickedDelivery.image_path) : null
  const commentWords = pickComment.split(/\s+/)
  const commentBreakAt = Math.ceil(commentWords.length / 2)
  const kakaoMapUrl = pickedDelivery?.place_url ||
    (pickedDelivery?.name ? `https://map.kakao.com/link/search/${encodeURIComponent(pickedDelivery.name)}` : 'https://map.kakao.com')
  const pickSigunguList = getSigunguList(pickSido)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl font-serif">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
          aria-label="오늘 뭐 먹지 닫기"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-semibold mb-2">
            <Dices className="w-3.5 h-3.5" />
            <span>내 주변 맛집 룰렛</span>
          </div>
          <h2 className="text-2xl font-bold text-slate-900">오늘 뭐 먹지? 🎲</h2>
          <p className="text-xs text-slate-500 mt-1">
            {selection.mode === 'gps'
              ? `📍 ${selection.locationLabel} 주변 맛집 중에서 추천해요`
              : selection.mode === 'manual'
                ? `📍 ${selection.locationLabel} 맛집 중에서 추천해요`
                : '내 위치를 사용하거나 아래에서 지역을 선택해 주세요'}
          </p>
        </div>

        {selection.mode !== 'gps' && (
          <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
            <button
              type="button"
              onClick={onRequestLocation}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <MapPin className="h-4 w-4" />
              <span>내 위치 사용</span>
            </button>

            <div className="my-3 flex items-center gap-3 text-[11px] text-slate-400">
              <span className="h-px flex-1 bg-slate-200" />
              <span>또는 지역 직접 선택</span>
              <span className="h-px flex-1 bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                aria-label="오늘 뭐 먹지 시/도 선택"
                value={pickSido}
                onChange={(event) => onPickSidoChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              >
                <option value="">시/도 선택</option>
                {SIDO_LIST.map((sido) => (
                  <option key={sido} value={sido}>{sido}</option>
                ))}
              </select>
              <select
                aria-label="오늘 뭐 먹지 시/군/구 선택"
                value={pickSigungu}
                onChange={(event) => onPickSigunguChange(event.target.value)}
                disabled={!pickSido}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">{pickSido ? '전체 시/군/구' : '시/도 먼저 선택'}</option>
                {pickSigunguList.map((sigungu) => (
                  <option key={sigungu} value={sigungu}>{sigungu}</option>
                ))}
              </select>
            </div>

            {locationPermissionDenied && (
              <div className="hidden sm:block mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-xs leading-relaxed text-amber-900">
                <p className="font-bold">위치 권한이 차단되어 있습니다.</p>
                <p className="mt-2 font-semibold">Chrome / Edge 기준</p>
                <ol className="mt-1 list-decimal space-y-1 pl-4">
                  <li>주소창 왼쪽의 자물쇠 또는 사이트 정보 아이콘을 누릅니다.</li>
                  <li>[사이트 설정]을 선택합니다.</li>
                  <li>[위치]를 [허용]으로 변경합니다.</li>
                  <li>페이지를 새로고침한 뒤 [내 위치 사용]을 다시 눌러주세요.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        <div className="my-6 py-4 flex flex-col items-center justify-center min-h-[140px]">
          <Dice3D rolling={rolling} targetNumber={targetNumber} />
          {!rolling && !pickedDelivery && (
            <p className="text-xs text-slate-400 mt-4 animate-bounce">
              👇 아래 [주사위 굴리기] 버튼을 눌러주세요!
            </p>
          )}
        </div>

        {!pickedDelivery && (
          <div>
            <button
              type="button"
              onClick={handleRollDice}
              disabled={rolling || selection.candidates.length === 0}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${rolling ? 'animate-spin' : ''}`} />
              <span>
                {rolling
                  ? '맛집 찾는 중...'
                  : selection.candidates.length
                    ? '🎲 추천 시작!'
                    : '추천할 지역 맛집이 없어요'}
              </span>
            </button>
            {selection.candidates.length === 0 && (
              <p className="mt-2 text-center text-xs text-rose-500">
                {selection.mode === 'none'
                  ? '내 위치를 사용하거나 위에서 지역을 선택해 주세요.'
                  : `${selection.locationLabel}에 등록된 맛집이 없습니다.`}
              </p>
            )}
          </div>
        )}

        {pickedDelivery && pickedCandidate && !rolling && (
          <div className="mt-4 p-5 rounded-2xl bg-slate-50 border border-slate-200/80 animate-scaleUp">
            <div className="p-3 mb-4 rounded-xl bg-purple-100/70 text-purple-900 text-xs leading-relaxed font-medium">
              <span aria-hidden="true">💡 </span>
              {pickComment ? (
                <>
                  {commentWords.slice(0, commentBreakAt).join(' ')}
                  <br />
                  {commentWords.slice(commentBreakAt).join(' ')}
                </>
              ) : '오늘의 맛집 추천입니다!'}
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
                {pickedCandidate.distanceKm !== null && (
                  <p className="text-xs font-semibold text-blue-600 mt-1">
                    현재 위치에서 {formatDistance(pickedCandidate.distanceKm)}
                  </p>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  최소주문금액: {pickedDelivery.min_order?.toLocaleString()}원
                </p>
              </div>
            </div>

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
              type="button"
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
