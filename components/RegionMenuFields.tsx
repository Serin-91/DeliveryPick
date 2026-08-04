'use client'

import { SIDO_LIST, getSigunguList } from '@/lib/regions'

// 등록/수정 폼이 공유하는 지역 입력 값
export interface RegionValue {
  sido: string
  sigungu: string
}

export default function RegionMenuFields({
  value,
  onChange,
}: {
  value: RegionValue
  onChange: (patch: Partial<RegionValue>) => void
}) {
  const sigunguList = getSigunguList(value.sido)

  return (
    <div className="space-y-2 pt-3 border-t border-slate-100">
      <label className="block font-bold text-slate-800">지역 *</label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={value.sido}
          onChange={(e) => onChange({ sido: e.target.value, sigungu: '' })}
          required
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white text-sm"
        >
          <option value="">시/도 선택 *</option>
          {SIDO_LIST.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={value.sigungu}
          onChange={(e) => onChange({ sigungu: e.target.value })}
          disabled={!value.sido}
          required
          className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white text-sm disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="">{value.sido ? '시/군/구 선택 *' : '시/도 먼저 선택'}</option>
          {sigunguList.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
