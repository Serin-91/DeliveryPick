export interface KakaoPlace {
  id: string
  place_name: string
  category_name: string
  address_name: string
  road_address_name: string
  x: string // 경도 lng
  y: string // 위도 lat
  place_url: string
}

const KAKAO_REST_KEY =
  process.env.KAKAO_REST_API_KEY ||
  ''

/**
 * 카카오 로컬 키워드 장소 검색 (식당명 검색)
 */
export async function searchKakaoPlaces(query: string): Promise<KakaoPlace[]> {
  if (!query || !query.trim()) return []

  try {
    const url = `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(
      query
    )}&category_group_code=FD6,CE7` // 음식점(FD6), 카페(CE7)

    const response = await fetch(url, {
      headers: KAKAO_REST_KEY
        ? { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
        : {},
    })

    if (!response.ok) {
      console.warn('Kakao Local API Call failed. Response status:', response.status)
      return []
    }

    const data = await response.json()
    return data.documents || []
  } catch (error) {
    console.error('Kakao Places Search Error:', error)
    return []
  }
}

/**
 * GPS 좌표 (lat, lng) 기반 카카오 행정동/지역명 구하기
 */
export async function getRegionFromCoords(
  lat: number,
  lng: number
): Promise<{ sido: string; sigungu: string; fullRegion: string } | null> {
  try {
    if (!KAKAO_REST_KEY) {
      console.error('KAKAO_REST_API_KEY가 설정되지 않았습니다.')
      return null
    }

    const headers = { Authorization: `KakaoAK ${KAKAO_REST_KEY}` }
    const url = `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`

    const response = await fetch(url, { headers, cache: 'no-store' })

    if (!response.ok) {
      console.error('Kakao coord2regioncode failed:', response.status)
    } else {
      const data = await response.json()
      const region = data.documents?.find((d: { region_type: string }) => d.region_type === 'H') || data.documents?.[0]

      if (region) {
        return {
          sido: region.region_1depth_name,
          sigungu: region.region_2depth_name,
          fullRegion: `${region.region_1depth_name} ${region.region_2depth_name} ${region.region_3depth_name || ''}`.trim(),
        }
      }
    }

    // 행정동 변환 결과가 비어 있는 좌표에서는 주소 변환 API로 한 번 더 확인한다.
    const addressResponse = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      { headers, cache: 'no-store' }
    )
    if (!addressResponse.ok) {
      console.error('Kakao coord2address failed:', addressResponse.status)
      return null
    }
    const addressData = await addressResponse.json()
    const address = addressData.documents?.[0]?.address
    if (!address) return null
    return {
      sido: address.region_1depth_name,
      sigungu: address.region_2depth_name,
      fullRegion: `${address.region_1depth_name} ${address.region_2depth_name} ${address.region_3depth_name || ''}`.trim(),
    }
  } catch (error) {
    console.error('Kakao Coord to Region Error:', error)
    return null
  }
}
