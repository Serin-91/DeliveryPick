import { NextRequest, NextResponse } from 'next/server'
import { getRegionFromCoords } from '@/lib/kakao'

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get('lat')
  const lng = req.nextUrl.searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat, lng 파라미터가 필요합니다.' }, { status: 400 })
  }

  const latitude = Number(lat)
  const longitude = Number(lng)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json({ error: '올바른 위치 좌표가 아닙니다.' }, { status: 400 })
  }

  const region = await getRegionFromCoords(latitude, longitude)
  if (!region) {
    return NextResponse.json(
      { error: '현재 위치의 지역명을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.' },
      { status: 502 }
    )
  }
  return NextResponse.json({ region })
}
