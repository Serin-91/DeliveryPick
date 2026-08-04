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

    if (!Array.isArray(deliveries) || deliveries.length === 0) {
      return NextResponse.json({ error: '추천할 배달 맛집 후보가 없습니다.' }, { status: 400 })
    }
    // 익명 사용자도 쓰는 공개 기능이므로 로그인 요구 대신 후보 개수만 제한해 남용 여지를 줄인다
    if (deliveries.length > 20 || deliveries.some((d) => typeof d?.name !== 'string')) {
      return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
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
