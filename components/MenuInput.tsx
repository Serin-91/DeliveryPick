'use client'

import { Plus, X } from 'lucide-react'
import { MAX_MENUS, formatPriceInput } from '@/lib/menuForm'
import type { MenuFormRow } from '@/lib/menuForm'

export default function MenuInput({
  rows,
  onChange,
}: {
  rows: MenuFormRow[]
  onChange: (rows: MenuFormRow[]) => void
}) {
  const canAdd = rows.length < MAX_MENUS

  const addRow = () => {
    if (!canAdd) return
    onChange([...rows, { name: '', price: '', is_representative: false }])
  }

  const removeRow = (index: number) => {
    if (rows.length <= 1) return
    const next = rows.filter((_, i) => i !== index)
    // 대표 메뉴를 지운 경우 첫 줄을 대표로 승격 (대표는 항상 1개 유지)
    if (!next.some((r) => r.is_representative)) {
      next[0] = { ...next[0], is_representative: true }
    }
    onChange(next)
  }

  // 라디오이므로 선택 시 나머지는 자동으로 해제된다
  const setRepresentative = (index: number) => {
    onChange(rows.map((r, i) => ({ ...r, is_representative: i === index })))
  }

  const updateRow = (index: number, patch: Partial<MenuFormRow>) => {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)))
  }

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100">
      <div className="flex items-center justify-between">
        <label className="block font-bold text-slate-800">📋 추천 메뉴 입력 *</label>
      </div>

      <div className="space-y-2">
        {rows.map((row, idx) => (
          <div
            key={idx}
            className={`p-4 rounded-2xl border space-y-3 ${
              row.is_representative ? 'border-sky-300 bg-sky-50/60' : 'border-slate-200 bg-slate-50/60'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="representative-menu"
                  checked={row.is_representative}
                  onChange={() => setRepresentative(idx)}
                  className="w-3.5 h-3.5 accent-sky-600 cursor-pointer"
                />
                <span
                  className={`text-[11px] font-semibold ${
                    row.is_representative ? 'text-sky-700' : 'text-slate-500'
                  }`}
                >
                  {row.is_representative ? '⭐ 대표 메뉴' : '대표로 지정'}
                </span>
              </label>

              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  title="이 메뉴 삭제"
                  className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-md transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
              <input
                type="text"
                value={row.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                placeholder={idx === 0 ? '메뉴명 (예: 황금올리브)' : '메뉴명'}
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm bg-white"
              />
              <input
                type="text"
                inputMode="numeric"
                value={row.price}
                onChange={(e) => updateRow(idx, { price: formatPriceInput(e.target.value) })}
                placeholder="가격(원)"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm bg-white"
              />
            </div>
          </div>
        ))}
      </div>

      {canAdd ? (
        <button
          type="button"
          onClick={addRow}
          className="w-full flex items-center justify-center gap-1 py-2 text-xs font-medium text-sky-600 hover:text-sky-700 border border-dashed border-sky-300 rounded-xl hover:bg-sky-50 transition"
        >
          <Plus className="w-3.5 h-3.5" /> 메뉴 추가 (선택)
        </button>
      ) : null}
    </div>
  )
}
