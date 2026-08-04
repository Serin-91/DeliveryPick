'use client'

import { useState } from 'react'
import { X, Upload, Sparkles, ShieldCheck, CheckCircle, AlertCircle } from 'lucide-react'

interface ParsedReceipt {
  storeName?: string
  address?: string
  appName?: string
  totalAmount?: number
  menus?: { name: string; price?: number }[]
  orderNumber?: string
}

interface ReceiptScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScanSuccess: (data: ParsedReceipt) => void
}

export default function ReceiptScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
}: ReceiptScannerModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        alert('사진 용량은 최대 10MB까지 업로드 가능합니다.')
        return
      }
      setFile(selected)
      setPreviewUrl(URL.createObjectURL(selected))
      setErrorMsg(null)
    }
  }

  const handleScanReceipt = async () => {
    if (!file) {
      alert('영수증/주문내역 캡처 사진을 먼저 선택해 주세요.')
      return
    }

    setLoading(true)
    setErrorMsg(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/ai/ocr', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        throw new Error(data.error || '영수증 인식에 실패했습니다.')
      }

      alert('🥇 3초 만에 AI 영수증 분석이 완료되었습니다!')
      onScanSuccess(data.parsedData)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || '영수증을 읽지 못했습니다. 선명한 주문내역 사진으로 다시 시도해 주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn font-serif">
      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-600 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Gemini AI 영수증 인식</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">🥇 AI 영수증 OCR 스캐너</h2>
          <p className="text-xs text-slate-500 mt-1">
            배민/쿠팡이츠/요기요 영수증 사진 1장이면 폼 자동입력 + 인증 뱃지!
          </p>
        </div>

        {/* 사진 업로드 영역 */}
        <div className="mb-4">
          <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-sky-200 rounded-2xl cursor-pointer bg-sky-50/50 hover:bg-sky-50 transition-all overflow-hidden relative">
            {previewUrl ? (
              <img src={previewUrl} alt="영수증 미리보기" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center justify-center pt-5 pb-6 text-slate-500">
                <Upload className="w-8 h-8 mb-2 text-blue-600 animate-bounce" />
                <p className="text-xs font-semibold">영수증 / 배달앱 주문내역 사진 선택</p>
                <p className="text-[11px] text-slate-400 mt-1">JPG, PNG, WEBP (최대 10MB)</p>
              </div>
            )}
            <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
          </label>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleScanReceipt}
          disabled={loading || !file}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-blue-500/25 hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'AI 영수증 3초 인식 중...' : '🥇 3초 만에 자동입력하기'}</span>
        </button>
      </div>
    </div>
  )
}
