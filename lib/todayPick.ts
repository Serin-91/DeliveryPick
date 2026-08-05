import type { Delivery } from './types'

export interface UserLocation {
  lat: number
  lng: number
  sido: string
  sigungu: string
  fullRegion: string
}

export interface TodayPickCandidate {
  delivery: Delivery
  distanceKm: number | null
}

export interface TodayPickSelection {
  candidates: TodayPickCandidate[]
  mode: 'gps' | 'manual' | 'none'
  locationLabel: string
}

const GPS_RECOMMENDATION_RADIUS_KM = 15
const MAX_GPS_CANDIDATES = 20

function isValidCoordinate(lat: unknown, lng: unknown): lat is number {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  )
}

function toRadians(value: number) {
  return (value * Math.PI) / 180
}

export function getDistanceKm(
  from: Pick<UserLocation, 'lat' | 'lng'>,
  to: Pick<UserLocation, 'lat' | 'lng'>
): number {
  const earthRadiusKm = 6371
  const latDelta = toRadians(to.lat - from.lat)
  const lngDelta = toRadians(to.lng - from.lng)
  const fromLat = toRadians(from.lat)
  const toLat = toRadians(to.lat)
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(lngDelta / 2) ** 2

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
}

function matchesRegion(value: string | null | undefined, selected: string): boolean {
  const normalizedValue = value?.trim() || ''
  const normalizedSelected = selected.trim()
  if (!normalizedSelected) return true

  return (
    normalizedValue === normalizedSelected ||
    normalizedValue.startsWith(`${normalizedSelected} `) ||
    normalizedSelected.startsWith(`${normalizedValue} `)
  )
}

function filterByRegion(deliveries: Delivery[], sido: string, sigungu: string) {
  return deliveries.filter(
    (delivery) =>
      matchesRegion(delivery.sido, sido) && matchesRegion(delivery.sigungu, sigungu)
  )
}

export function getTodayPickSelection(
  deliveries: Delivery[],
  options: {
    userLocation?: UserLocation | null
    manualSido?: string
    manualSigungu?: string
  }
): TodayPickSelection {
  const { userLocation, manualSido = '', manualSigungu = '' } = options

  if (userLocation && isValidCoordinate(userLocation.lat, userLocation.lng)) {
    const candidatesWithDistance = deliveries
      .filter((delivery) => isValidCoordinate(delivery.lat, delivery.lng))
      .map((delivery) => ({
        delivery,
        distanceKm: getDistanceKm(userLocation, {
          lat: delivery.lat as number,
          lng: delivery.lng as number,
        }),
      }))
      .filter((candidate) => candidate.distanceKm <= GPS_RECOMMENDATION_RADIUS_KM)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, MAX_GPS_CANDIDATES)

    // 예전 등록 데이터처럼 매장 좌표가 없는 경우에도 GPS로 확인한 행정구역 안에서 추천한다.
    const candidates = candidatesWithDistance.length
      ? candidatesWithDistance
      : filterByRegion(deliveries, userLocation.sido, userLocation.sigungu).map((delivery) => ({
          delivery,
          distanceKm: null,
        }))

    return {
      candidates,
      mode: 'gps',
      locationLabel: userLocation.fullRegion,
    }
  }

  if (manualSido) {
    return {
      candidates: filterByRegion(deliveries, manualSido, manualSigungu).map((delivery) => ({
        delivery,
        distanceKm: null,
      })),
      mode: 'manual',
      locationLabel: [manualSido, manualSigungu].filter(Boolean).join(' '),
    }
  }

  return { candidates: [], mode: 'none', locationLabel: '' }
}

export function isUserLocation(value: unknown): value is UserLocation {
  if (!value || typeof value !== 'object') return false
  const location = value as Partial<UserLocation>
  return (
    isValidCoordinate(location.lat, location.lng) &&
    typeof location.sido === 'string' &&
    typeof location.sigungu === 'string' &&
    typeof location.fullRegion === 'string'
  )
}
