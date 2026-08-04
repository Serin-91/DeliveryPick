import { NextResponse } from 'next/server'
import { generateAIDeliveryRecommendation } from '@/lib/gemini'
import { Delivery } from '@/lib/types'

export async function POST(req: Request) {
  try {
    const { deliveries, userLocationName, timeOfDay } = (await req.json()) as {
      deliveries: Delivery[]
      userLocationName?: string
      timeOfDay?: string
    }

    if (!deliveries || deliveries.length === 0) {
      return NextResponse.json({ error: '추천할 배달 맛집 후보가 없습니다.' }, { status: 400 })
    }

    const recommendation = await generateAIDeliveryRecommendation(
      deliveries,
      userLocationName || '내 동네',
      timeOfDay || '저녁'
    )

    if (!recommendation) {
      return NextResponse.json({ error: '추천 결과를 생성하지 못했습니다.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: recommendation })
  } catch (error) {
    console.error('Recommendation Route Error:', error)
    return NextResponse.json({ error: 'AI 추천 도중 오류가 발생했습니다.' }, { status: 500 })
  }
}
