'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import { Camera, Check, ImagePlus, RefreshCcw, RotateCcw, RotateCw, Trash2, X } from 'lucide-react'
import {
  cropAndCompressImage,
  compressFullImage,
  DELIVERY_IMAGE_ASPECT,
  MAX_SOURCE_IMAGE_BYTES,
} from '@/lib/deliveryImage'

export interface RepresentativeImageValue {
  blob: Blob | null
  removeExisting: boolean
}

interface Props {
  value: RepresentativeImageValue
  existingImageUrl?: string | null
  onChange: (value: RepresentativeImageValue) => void
  disabled?: boolean
  preserveFullImage?: boolean
}

export default function RepresentativeMenuImageInput({
  value,
  existingImageUrl,
  onChange,
  disabled = false,
  preserveFullImage = false,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!value.blob) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value.blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value.blob])

  useEffect(() => {
    if (!sourceUrl) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [sourceUrl])

  useEffect(() => {
    if (!sourceUrl) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !processing) closeEditor()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sourceUrl, processing])

  const closeEditor = () => {
    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    setSourceUrl(null)
    setCroppedPixels(null)
    setError('')
  }

  const resetEditor = (url: string) => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setCroppedPixels(null)
    setError('')
    setSourceUrl(url)
  }

  const normalizeRotation = (degrees: number) => ((degrees + 180) % 360 + 360) % 360 - 180

  const rotateBy = (degrees: number) => {
    setRotation((current) => normalizeRotation(current + degrees))
  }

  const resetAdjustments = () => {
    setCrop({ x: 0, y: 0 })
    setZoom(1)
    setRotation(0)
    setError('')
  }

  const handleFile = async (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('사진 파일만 선택할 수 있습니다.')
      return
    }
    if (file.size > MAX_SOURCE_IMAGE_BYTES) {
      setError('원본 사진은 10MB 이하만 선택할 수 있습니다.')
      return
    }

    if (sourceUrl) URL.revokeObjectURL(sourceUrl)
    const url = URL.createObjectURL(file)
    if (preserveFullImage) {
      setProcessing(true)
      setError('')
      try {
        const blob = await compressFullImage(url)
        onChange({ blob, removeExisting: Boolean(existingImageUrl) })
      } catch (imageError) {
        setError(imageError instanceof Error ? imageError.message : '사진 압축에 실패했습니다.')
      } finally {
        URL.revokeObjectURL(url)
        setProcessing(false)
      }
      return
    }
    resetEditor(url)
  }

  const finishCrop = async () => {
    if (!sourceUrl || !croppedPixels || processing) return
    setProcessing(true)
    setError('')
    try {
      const blob = await cropAndCompressImage(sourceUrl, croppedPixels, rotation)
      onChange({ blob, removeExisting: Boolean(existingImageUrl) })
      closeEditor()
    } catch (cropError) {
      setError(cropError instanceof Error ? cropError.message : '사진 편집에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  const visiblePreview = previewUrl || (!value.removeExisting ? existingImageUrl : null)

  return (
    <section className="space-y-2 pt-2 border-t border-slate-100">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-700">{preserveFullImage ? '리뷰 사진' : '대표 메뉴 사진'}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5">{preserveFullImage ? '선택사항 · 원본 비율 유지 · 자동 압축' : '선택사항 · 4:3 비율 · 자동 압축'}</p>
        </div>
        <span className="text-[10px] px-2 py-1 bg-sky-50 text-sky-700 rounded-full font-semibold">
          {preserveFullImage ? '리뷰 첨부' : '대표 메뉴 전용'}
        </span>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {visiblePreview ? (
        <div className="space-y-2">
          <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-slate-100 h-40">
            <img
              src={visiblePreview}
              alt="대표 메뉴 사진 미리보기"
              className={`w-full h-full ${preserveFullImage ? 'object-contain' : 'object-cover'}`}
            />
            <span className="absolute left-2.5 bottom-2.5 text-[10px] bg-slate-900/70 text-white px-2 py-1 rounded-md">
              업로드 미리보기
            </span>
          </div>
          <div className={`grid gap-2 ${value.blob && existingImageUrl ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
              className="flex items-center justify-center gap-1.5 py-2.5 border border-sky-200 text-sky-700 rounded-xl text-xs font-semibold hover:bg-sky-50 transition disabled:opacity-50"
            >
              <ImagePlus className="w-4 h-4" /> 다시 선택
            </button>
            {value.blob && existingImageUrl && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ blob: null, removeExisting: false })}
                className="flex items-center justify-center gap-1.5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                <X className="w-4 h-4" /> 선택 취소
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => onChange({ blob: null, removeExisting: Boolean(existingImageUrl) })}
              className="flex items-center justify-center gap-1.5 py-2.5 border border-rose-200 text-rose-600 rounded-xl text-xs font-semibold hover:bg-rose-50 transition disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> 사진 삭제
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="w-full h-36 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-sky-200 bg-sky-50/40 text-sky-700 rounded-2xl hover:bg-sky-50 hover:border-sky-300 transition disabled:opacity-50"
        >
          <span className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </span>
          <span className="text-sm font-semibold">사진 선택</span>
          <span className="text-[11px] text-slate-400">JPEG · PNG · WebP · 원본 최대 10MB</span>
        </button>
      )}

      <p className="text-[11px] leading-relaxed text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
        직접 촬영했거나 게시 권한이 있는 음식 사진만 등록해 주세요.
      </p>

      {!sourceUrl && error && <p className="text-xs text-rose-500 font-medium">{error}</p>}

      {sourceUrl && createPortal(
        <div className="fixed inset-0 z-[70] bg-slate-950/80 flex items-start justify-center p-3 sm:p-6 overflow-y-auto overscroll-contain">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="image-crop-title"
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden mb-6"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div>
                <h2 id="image-crop-title" className="text-sm font-bold text-slate-800">
                  대표 메뉴 사진 자르기
                </h2>
                <p className="text-[10px] text-slate-400 mt-0.5">드래그하거나 두 손가락으로 확대해 보세요.</p>
              </div>
              <button
                type="button"
                onClick={closeEditor}
                disabled={processing}
                aria-label="사진 편집 취소"
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-[42vh] min-h-[240px] max-h-[420px] bg-slate-950">
              <Cropper
                image={sourceUrl}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={DELIVERY_IMAGE_ASPECT}
                minZoom={1}
                maxZoom={5}
                zoomSpeed={0.08}
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setCroppedPixels(pixels)}
                mediaProps={{ alt: '자르기 중인 대표 메뉴 사진' }}
              />
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 shrink-0 w-16 whitespace-nowrap">
                  확대 {zoom.toFixed(1)}×
                </span>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  aria-label="사진 확대 배율"
                  className="w-full accent-sky-600"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-500 shrink-0 w-16 whitespace-nowrap">
                  회전 {Math.round(rotation)}°
                </span>
                <input
                  type="range"
                  min={-180}
                  max={180}
                  step={1}
                  value={rotation}
                  onChange={(event) => setRotation(Number(event.target.value))}
                  aria-label="사진 회전 각도"
                  className="w-full accent-sky-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => rotateBy(-90)}
                  className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" /> 왼쪽 회전
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => rotateBy(90)}
                  className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <RotateCw className="w-4 h-4" /> 오른쪽 회전
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={resetAdjustments}
                  className="flex items-center justify-center gap-1.5 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  <RefreshCcw className="w-4 h-4" /> 초기화
                </button>
              </div>

              {error && <p className="text-xs text-rose-500 font-medium text-center">{error}</p>}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => inputRef.current?.click()}
                  className="flex items-center justify-center gap-1.5 py-3 border border-sky-200 text-sky-700 rounded-xl text-sm font-semibold hover:bg-sky-50 disabled:opacity-50"
                >
                  <ImagePlus className="w-4 h-4" /> 다시 선택
                </button>
                <button
                  type="button"
                  disabled={processing || !croppedPixels}
                  onClick={finishCrop}
                  className="flex items-center justify-center gap-1.5 py-3 bg-sky-500 text-white rounded-xl text-sm font-semibold hover:bg-sky-600 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> {processing ? '압축 중...' : '자르기 완료'}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </section>
  )
}
