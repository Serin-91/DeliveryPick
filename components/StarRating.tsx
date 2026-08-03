'use client'

import { Star } from 'lucide-react'

export default function StarRating({
  rating,
  onChange,
  size = 'w-4 h-4',
}: {
  rating: number
  onChange?: (value: number) => void
  size?: string
}) {
  const readOnly = !onChange

  return (
    <div className="flex text-amber-400 gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            className={readOnly ? 'cursor-default' : 'p-0.5 hover:scale-110 transition'}
          >
            <Star className={`${size} ${star <= rating ? 'fill-current' : 'text-slate-200'}`} />
          </button>
        )
      })}
    </div>
  )
}
