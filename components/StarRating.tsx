'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'

export default function StarRating({
  rating,
  onChange,
  size = 'sm',
  className = '',
  editable,
}: {
  rating: number
  onChange?: (value: number) => void
  size?: 'sm' | 'lg'
  className?: string
  editable?: boolean
}) {
  const isEditable = !!onChange || !!editable
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const [hasSelected, setHasSelected] = useState(false)

  const displayRating = hoverValue !== null ? hoverValue : rating

  const starSize = size === 'lg' ? 'w-7 h-7' : 'w-5 h-5'

  const handleClick = (starIndex: number, isLeftHalf: boolean) => {
    if (!isEditable || !onChange) return
    const value = isLeftHalf ? starIndex + 0.5 : starIndex + 1
    onChange(value)
    setHasSelected(true)
    setHoverValue(null)
  }

  const handleHover = (starIndex: number, isLeftHalf: boolean) => {
    if (!isEditable || hasSelected) return
    setHoverValue(isLeftHalf ? starIndex + 0.5 : starIndex + 1)
  }

  return (
    <div
      className={`flex text-amber-400 gap-0.5 ${className}`}
      onMouseLeave={() => isEditable && setHoverValue(null)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const fullFill = displayRating >= i + 1
        const halfFill = !fullFill && displayRating >= i + 0.5
        const empty = !fullFill && !halfFill

        return (
          <div key={i} className={`relative ${isEditable ? 'cursor-pointer' : 'cursor-default'}`}>
            {/* 빈 별 (배경) */}
            <Star className={`${starSize} text-slate-200`} />

            {/* 반별 채움 (clip left half) */}
            {halfFill && (
              <Star
                className={`${starSize} fill-amber-400 text-amber-400 absolute inset-0`}
                style={{ clipPath: 'inset(0 50% 0 0)' }}
              />
            )}

            {/* 전체 채움 */}
            {fullFill && (
              <Star className={`${starSize} fill-amber-400 text-amber-400 absolute inset-0`} />
            )}

            {/* 편집 모드: 왼쪽 절반 클릭 영역 */}
            {isEditable && (
              <>
                <button
                  type="button"
                  onClick={() => handleClick(i, true)}
                  onMouseEnter={() => handleHover(i, true)}
                  className="absolute inset-0 w-1/2 h-full left-0 z-10"
                  aria-label={`${i + 0.5}점`}
                />
                <button
                  type="button"
                  onClick={() => handleClick(i, false)}
                  onMouseEnter={() => handleHover(i, false)}
                  className="absolute inset-0 w-1/2 h-full right-0 left-1/2 z-10"
                  aria-label={`${i + 1}점`}
                />
              </>
            )}
          </div>
        )
      })}

      {/* 점수 표시 */}
      <span className={`ml-1.5 font-bold ${size === 'lg' ? 'text-base' : 'text-sm'} text-slate-600 self-center`}>
        {displayRating.toFixed(1)}
      </span>
    </div>
  )
}
