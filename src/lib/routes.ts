import type { Location } from '../types/location'

export type Coordinate = [longitude: number, latitude: number]
export type ServiceArea = Coordinate[][][]

export const riskStyles = {
  GREEN: { color: '#167553', label: '위험도 낮음' },
  YELLOW: { color: '#946600', label: '위험도 보통' },
  RED: { color: '#bc353e', label: '위험도 높음' },
}

export type RiskLevel = keyof typeof riskStyles
export type RouteLine = { level: RiskLevel; path: Coordinate[] }
export type Navigation = { path: Coordinate[]; steps: { pathIndex: number; instruction: string }[] }
export type RecommendedRoute = { distanceM: number; durationMin: number; lines: RouteLine[]; navigation?: Navigation }

const backend = 'https://ansimi-backend-production.up.railway.app'

export const routeExample = import.meta.env.DEV
  && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('routeExample') === '1'

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? value as Record<string, unknown> : undefined
}

function isCoordinate(value: unknown): value is Coordinate {
  return Array.isArray(value) && value.length >= 2
    && typeof value[0] === 'number' && Math.abs(value[0]) <= 180
    && typeof value[1] === 'number' && Math.abs(value[1]) <= 90
}

function isPath(value: unknown, minimum: number): value is Coordinate[] {
  return Array.isArray(value) && value.length >= minimum && value.every(isCoordinate)
}

function isPolygon(value: unknown): value is Coordinate[][] {
  return Array.isArray(value) && value.length > 0 && value.every((ring) => isPath(ring, 4))
}

function isRiskLevel(value: unknown): value is RiskLevel {
  return value === 'GREEN' || value === 'YELLOW' || value === 'RED'
}

function parseNavigation(value: unknown): Navigation | undefined {
  const navigation = record(value)
  const path = navigation?.path
  if (!isPath(path, 2)) return undefined
  const steps: Navigation['steps'] = []
  if (Array.isArray(navigation?.steps)) {
    for (const value of navigation.steps) {
      const step = record(value)
      const pathIndex = step?.pathIndex
      if (typeof pathIndex === 'number' && Number.isInteger(pathIndex) && pathIndex >= 0 && pathIndex < path.length
        && typeof step?.instruction === 'string' && step.instruction.trim()) {
        steps.push({ pathIndex, instruction: step.instruction })
      }
    }
  }
  return { path, steps: steps.sort((a, b) => a.pathIndex - b.pathIndex) }
}

export function parseStoredRoute(value: unknown): RecommendedRoute | undefined {
  const route = record(value)
  if (!route) return undefined
  const { distanceM, durationMin, lines } = route
  if (typeof distanceM !== 'number' || !Number.isFinite(distanceM) || distanceM < 0
    || typeof durationMin !== 'number' || !Number.isFinite(durationMin) || durationMin < 0 || !Array.isArray(lines)) return undefined
  const normalized: RouteLine[] = []
  for (const value of lines) {
    const line = record(value)
    if (!isRiskLevel(line?.level) || !isPath(line?.path, 2)) return undefined
    normalized.push({ level: line.level, path: line.path })
  }
  const navigation = parseNavigation(route.navigation)
  if ((!navigation && route.navigation !== undefined) || (!normalized.length && !navigation)) return undefined
  return { distanceM, durationMin, lines: normalized, navigation }
}

function parseRecommendation(value: unknown): RecommendedRoute {
  const response = record(value)
  if (!response || !Number.isInteger(response.recommendedIndex) || !Array.isArray(response.candidates)) {
    throw new Error('경로 응답을 읽지 못했습니다. 다시 시도해주세요.')
  }
  const candidate = response.candidates.map(record).find((item) => item?.index === response.recommendedIndex)
  if (!candidate) throw new Error('추천할 경로를 찾지 못했습니다. 다른 위치를 선택해주세요.')
  const { distanceM, durationMin, segments } = candidate
  if (typeof distanceM !== 'number' || !Number.isFinite(distanceM) || distanceM < 0
    || typeof durationMin !== 'number' || !Number.isFinite(durationMin) || durationMin < 0) {
    throw new Error('경로 거리와 시간을 읽지 못했습니다. 다시 시도해주세요.')
  }
  const lines: RouteLine[] = []
  if (segments != null) {
    const collection = record(segments)
    if (collection?.type !== 'FeatureCollection' || !Array.isArray(collection.features)) {
      throw new Error('경로 구간을 읽지 못했습니다. 다시 시도해주세요.')
    }
    for (const item of collection.features) {
      const feature = record(item)
      const level = record(feature?.properties)?.level
      const geometry = record(feature?.geometry)
      const paths = geometry?.coordinates
      if (feature?.type !== 'Feature' || !isRiskLevel(level) || geometry?.type !== 'MultiLineString'
        || !Array.isArray(paths) || !paths.every((path): path is Coordinate[] => isPath(path, 2))) {
        throw new Error('경로 구간을 읽지 못했습니다. 다시 시도해주세요.')
      }
      paths.forEach((path) => lines.push({ level, path }))
    }
  }
  return { distanceM, durationMin, lines, navigation: parseNavigation(candidate.navigation) }
}

export async function getServiceArea(signal: AbortSignal): Promise<ServiceArea> {
  const response = await fetch(`${backend}/api/service-area`, { signal: AbortSignal.any([signal, AbortSignal.timeout(10000)]) })
  if (!response.ok) throw new Error('서비스 권역을 불러오지 못했습니다.')
  const feature = record(await response.json())
  const geometry = record(feature?.geometry)
  if (feature?.type !== 'Feature' || geometry?.type !== 'MultiPolygon'
    || !Array.isArray(geometry.coordinates) || !geometry.coordinates.length || !geometry.coordinates.every(isPolygon)) {
    throw new Error('서비스 권역을 읽지 못했습니다.')
  }
  return geometry.coordinates
}

function place(location: Location) {
  return { coord: [location.longitude, location.latitude] as Coordinate, name: location.address }
}

function insideRing([lng, lat]: Coordinate, ring: Coordinate[]): boolean {
  let inside = false
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index]
    const [lastX, lastY] = ring[previous]
    if ((y > lat) !== (lastY > lat) && lng < x + (lastX - x) * (lat - y) / (lastY - y)) inside = !inside
  }
  return inside
}

export function withinServiceArea(location: Location, area: ServiceArea): boolean {
  const point = place(location).coord
  return area.some(([outer, ...holes]) => insideRing(point, outer) && !holes.some((hole) => insideRing(point, hole)))
}

export async function recommendRoute(origin: Location, destination: Location, signal: AbortSignal): Promise<RecommendedRoute> {
  const body = { origin: place(origin), destination: place(destination) }
  if (import.meta.env.DEV && routeExample) {
    const { exampleRecommendation } = await import('./routeExample')
    return parseRecommendation(await exampleRecommendation(body.origin.coord, body.destination.coord, signal))
  }
  const response = await fetch(`${backend}/api/routes/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.any([signal, AbortSignal.timeout(30000)]),
  })
  if (response.status === 400 || response.status === 422) {
    const error = record(await response.json().catch(() => null))
    if (error?.code === 'INVALID_DISTANCE') {
      throw new Error('출발지와 도착지 사이의 거리는 50 m 이상 5 km 이하여야 합니다.')
    }
    throw new Error('강남구 시범 권역 안에서 출발지와 도착지를 선택하고, 두 위치 사이의 거리를 조정해주세요.')
  }
  if (!response.ok) throw new Error('경로 조회에 실패했습니다. 잠시 후 다시 시도해주세요.')
  return parseRecommendation(await response.json())
}
