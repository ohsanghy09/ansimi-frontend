import convenienceStoreIcon from '../assets/icons/convenience-store-marker.svg'
import hospitalIcon from '../assets/icons/hospital-marker.svg'
import pharmacyIcon from '../assets/icons/pharmacy-marker.svg'
import storeIcon from '../assets/icons/store-marker.svg'
import { distanceBetween, metersBetween } from './navigation'
import type { Coordinate, RecommendedRoute } from './routes'
import type { KakaoMaps, PlaceDocument } from './kakaoMaps'

export const facilityTypes = {
  CONVENIENCE_STORE: { label: '편의점', icon: convenienceStoreIcon },
  HOSPITAL: { label: '병원', icon: hospitalIcon },
  PHARMACY: { label: '약국', icon: pharmacyIcon },
  STORE: { label: '가게', icon: storeIcon },
}

export type Facility = {
  id: string
  name: string
  type: keyof typeof facilityTypes
  coordinate: Coordinate
  address?: string
}

export type FacilitySearch = { facilities: Facility[]; incomplete: boolean; successful: boolean }

const categories = [['CONVENIENCE_STORE', 'CS2'], ['HOSPITAL', 'HP8'], ['PHARMACY', 'PM9']] as const
export const FACILITY_DISTANCE_M = 100
const CENTER_SPACING_M = 200
// Covers the spacing between samples, the nearest search center, and the route buffer.
const SEARCH_RADIUS_M = 425
const PAGE_SIZE = 15
const MAX_PAGES = 3

type Segment = { start: Coordinate; end: Coordinate; vector: Coordinate; length: number }

function getSegments(route: RecommendedRoute): Segment[] {
  const paths = route.lines.length ? route.lines.map(({ path }) => path) : [route.navigation?.path ?? []]
  return paths.flatMap((path) => path.slice(1).map((end, index) => {
    const start = path[index]
    const vector = metersBetween(start, end)
    return { start, end, vector, length: Math.hypot(...vector) }
  })).filter(({ length }) => length > 0)
}

function getCenters(segments: Segment[]): Coordinate[] {
  const centers: Coordinate[] = []
  for (const { start, end, length } of segments) {
    const steps = Math.ceil(length / CENTER_SPACING_M)
    for (let step = 0; step <= steps; step++) {
      const ratio = step / steps
      const point: Coordinate = [start[0] + (end[0] - start[0]) * ratio, start[1] + (end[1] - start[1]) * ratio]
      if (!centers.some((center) => distanceBetween(center, point) <= CENTER_SPACING_M)) centers.push(point)
    }
  }
  return centers
}

function distanceToRoute(point: Coordinate, segments: Segment[]) {
  let nearest = Infinity
  for (const { start, vector: [dx, dy], length } of segments) {
    const [x, y] = metersBetween(start, point)
    const fraction = Math.max(0, Math.min(1, (x * dx + y * dy) / (length * length)))
    nearest = Math.min(nearest, Math.hypot(x - fraction * dx, y - fraction * dy))
  }
  return nearest
}

export async function searchRouteFacilities(maps: KakaoMaps, route: RecommendedRoute, signal: AbortSignal): Promise<FacilitySearch> {
  signal.throwIfAborted()
  const segments = getSegments(route)
  const centers = getCenters(segments)
  if (!centers.length) return { facilities: [], incomplete: false, successful: true }
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(18000)])

  const batches = await Promise.all(categories.map(async ([type, code]) => {
    const byId = new Map<string, { facility: Facility; distance: number }>()
    let incomplete = false
    let successful = false
    try {
      const places = new maps.services.Places()
      for (const [lng, lat] of centers) {
        if (deadline.aborted) break
        const location = new maps.LatLng(lat, lng)
        for (let page = 1; page <= MAX_PAGES; page++) {
          try {
            const result = await searchPage(places, code, location, page, maps.services.Status, deadline)
            successful = true
            for (const place of result.places) {
              if (!place.id || !place.place_name || byId.has(place.id) || !place.x.trim() || !place.y.trim()) continue
              const coordinate: Coordinate = [Number(place.x), Number(place.y)]
              if (!(Math.abs(coordinate[0]) <= 180 && Math.abs(coordinate[1]) <= 90)) continue
              const distance = distanceToRoute(coordinate, segments)
              if (distance > FACILITY_DISTANCE_M) continue
              byId.set(place.id, { distance, facility: { id: place.id, name: place.place_name, type, coordinate,
                address: place.road_address_name || place.address_name } })
            }
            if (result.truncated) incomplete = true
            if (!result.hasNextPage) break
          } catch {
            incomplete = true
            break
          }
        }
      }
    } catch {
      incomplete = true
    }
    return { results: [...byId.values()], incomplete: incomplete || deadline.aborted, successful }
  }))
  signal.throwIfAborted()
  const facilities = new Map<string, Facility>()
  for (const { facility } of batches.flatMap(({ results }) => results).sort((a, b) => a.distance - b.distance)) {
    if (!facilities.has(facility.id)) facilities.set(facility.id, facility)
  }
  return { facilities: [...facilities.values()], incomplete: batches.some((batch) => batch.incomplete),
    successful: batches.some((batch) => batch.successful) }
}

function searchPage(
  places: InstanceType<KakaoMaps['services']['Places']>, code: string, location: InstanceType<KakaoMaps['LatLng']>,
  page: number, statusCodes: KakaoMaps['services']['Status'], signal: AbortSignal,
) {
  return new Promise<{ places: PlaceDocument[]; hasNextPage: boolean; truncated: boolean }>((resolve, reject) => {
    signal.throwIfAborted()
    function abort() { reject(signal.reason) }
    signal.addEventListener('abort', abort, { once: true })
    try {
      places.categorySearch(code, (results, status, pagination) => {
        signal.removeEventListener('abort', abort)
        if (signal.aborted) return
        if (status === statusCodes.ZERO_RESULT) {
          resolve({ places: [], hasNextPage: false, truncated: false })
        } else if (status === statusCodes.OK) {
          resolve({ places: results, hasNextPage: !!pagination?.hasNextPage,
            truncated: !!pagination && pagination.totalCount > PAGE_SIZE * MAX_PAGES })
        } else reject(new Error('카카오 장소 검색에 실패했습니다.'))
      }, { location, radius: SEARCH_RADIUS_M, sort: 'distance', size: PAGE_SIZE, page })
    } catch (error) {
      signal.removeEventListener('abort', abort)
      reject(error)
    }
  })
}

const examples: Facility[] = [
  { id: 'example-convenience', name: '시범 편의점', type: 'CONVENIENCE_STORE', coordinate: [127.0294, 37.4988] },
  { id: 'example-hospital', name: '시범 병원', type: 'HOSPITAL', coordinate: [127.0332, 37.5002] },
  { id: 'example-store', name: '시범 가게', type: 'STORE', coordinate: [127.0375, 37.5014] },
]

export const facilityExamples = import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('facilityExample') === '1' ? examples : undefined
