import { NextResponse } from 'next/server'
import { parseReceiptWithGemini } from '@/lib/gemini'

export async function POST(req: Request) {
  try {
    const { base64Image, mimeType } = await req.json()

    if (!base64Image) {
      return NextResponse.json({ error: '이미지가 존재하지 않습니다.' }, { status: 400 })
    }

    const ocrResult = await parseReceiptWithGemini(base64Image, mimeType || 'image/jpeg')

    if (!ocrResult) {
      return NextResponse.json(
        { error: '영수증 이미지를 분석하지 못했거나 API 키가 설정되지 않았습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: ocrResult })
  } catch (error) {
    console.error('OCR Route Error:', error)
    return NextResponse.json({ error: 'OCR 분석 도중 에러가 발생했습니다.' }, { status: 500 })
  }
}
