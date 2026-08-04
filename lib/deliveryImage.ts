import { supabase } from '@/lib/supabase'
import type { Area } from 'react-easy-crop'

export const DELIVERY_IMAGE_BUCKET = 'delivery-images'
export const MAX_SOURCE_IMAGE_BYTES = 10 * 1024 * 1024
export const MAX_OUTPUT_IMAGE_BYTES = 1024 * 1024
export const DELIVERY_IMAGE_ASPECT = 4 / 3

const OUTPUT_MAX_WIDTH = 1280
const OUTPUT_MAX_HEIGHT = 960

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('선택한 사진을 읽을 수 없습니다.'))
    image.src = src
  })

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

function rotatedSize(width: number, height: number, rotation: number) {
  const radians = toRadians(rotation)
  return {
    width: Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height),
    height: Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height),
  }
}

const canvasToJpeg = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('사진 압축에 실패했습니다.'))),
      'image/jpeg',
      quality
    )
  })

/**
 * 선택 영역을 4:3 JPEG로 만들고 1280x960, 1MB 이하가 되도록 브라우저에서 압축한다.
 * Canvas로 다시 인코딩되므로 EXIF 위치정보 등 원본 메타데이터도 결과물에 남지 않는다.
 */
export async function cropAndCompressImage(
  sourceUrl: string,
  crop: Area,
  rotation: number
): Promise<Blob> {
  const image = await loadImage(sourceUrl)
  const bounds = rotatedSize(image.naturalWidth, image.naturalHeight, rotation)
  const rotatedCanvas = document.createElement('canvas')
  rotatedCanvas.width = Math.ceil(bounds.width)
  rotatedCanvas.height = Math.ceil(bounds.height)

  const rotatedContext = rotatedCanvas.getContext('2d')
  if (!rotatedContext) throw new Error('사진 편집 기능을 사용할 수 없습니다.')

  rotatedContext.fillStyle = '#ffffff'
  rotatedContext.fillRect(0, 0, rotatedCanvas.width, rotatedCanvas.height)
  rotatedContext.imageSmoothingEnabled = true
  rotatedContext.imageSmoothingQuality = 'high'
  rotatedContext.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2)
  rotatedContext.rotate(toRadians(rotation))
  rotatedContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2)
  rotatedContext.drawImage(image, 0, 0)

  const sourceX = Math.max(0, Math.round(crop.x))
  const sourceY = Math.max(0, Math.round(crop.y))
  const sourceWidth = Math.max(
    1,
    Math.min(Math.round(crop.width), rotatedCanvas.width - sourceX)
  )
  const sourceHeight = Math.max(
    1,
    Math.min(Math.round(crop.height), rotatedCanvas.height - sourceY)
  )

  let scale = Math.min(1, OUTPUT_MAX_WIDTH / sourceWidth, OUTPUT_MAX_HEIGHT / sourceHeight)
  let quality = 0.84
  let output: Blob | null = null

  // 보통 첫 시도에 1MB 아래가 되며, 큰 사진은 품질과 해상도를 조금씩 낮춰 상한을 지킨다.
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const outputCanvas = document.createElement('canvas')
    outputCanvas.width = Math.max(1, Math.round(sourceWidth * scale))
    outputCanvas.height = Math.max(1, Math.round(sourceHeight * scale))
    const outputContext = outputCanvas.getContext('2d')
    if (!outputContext) throw new Error('사진 편집 기능을 사용할 수 없습니다.')

    outputContext.fillStyle = '#ffffff'
    outputContext.fillRect(0, 0, outputCanvas.width, outputCanvas.height)
    outputContext.imageSmoothingEnabled = true
    outputContext.imageSmoothingQuality = 'high'
    outputContext.drawImage(
      rotatedCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputCanvas.width,
      outputCanvas.height
    )

    output = await canvasToJpeg(outputCanvas, quality)
    if (output.size <= MAX_OUTPUT_IMAGE_BYTES) return output

    if (quality > 0.62) quality -= 0.08
    else scale *= 0.82
  }

  if (!output || output.size > MAX_OUTPUT_IMAGE_BYTES) {
    throw new Error('사진 용량을 줄이지 못했습니다. 다른 사진을 선택해 주세요.')
  }
  return output
}

/** 리뷰 사진을 자르지 않고 원본 비율 그대로 압축한다. */
export async function compressFullImage(sourceUrl: string): Promise<Blob> {
  const image = await loadImage(sourceUrl)
  return cropAndCompressImage(
    sourceUrl,
    { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight },
    0
  )
}

export function getDeliveryImageUrl(path?: string | null): string | null {
  if (!path) return null
  return supabase.storage.from(DELIVERY_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

export async function uploadDeliveryImage(userId: string, deliveryId: string, image: Blob) {
  const unique = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const path = `${userId}/${deliveryId}/representative-${unique}.jpg`
  const { error } = await supabase.storage.from(DELIVERY_IMAGE_BUCKET).upload(path, image, {
    contentType: 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function removeDeliveryImage(path?: string | null) {
  if (!path) return
  const { error } = await supabase.storage.from(DELIVERY_IMAGE_BUCKET).remove([path])
  if (error) throw error
}
