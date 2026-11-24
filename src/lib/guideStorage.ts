import { parseStoredRoute } from './routes'
import type { RecommendedRoute } from './routes'
import type { Location } from '../types/location'

const key = 'ansimi-active-guide-v1'
export const GUIDE_MAX_AGE_MS = 2 * 60 * 60 * 1000

export type StoredGuide = {
  id: string
  savedAt: number
  start: Location
  end: Location
  route: RecommendedRoute
}

function isLocation(value: unknown): value is Location {
  if (!value || typeof value !== 'object') return false
  const location = value as Partial<Location>
  return typeof location.latitude === 'number' && Math.abs(location.latitude) <= 90
    && typeof location.longitude === 'number' && Math.abs(location.longitude) <= 180
    && typeof location.address === 'string' && !!location.address.trim()
    && (location.name === undefined || typeof location.name === 'string')
}

export function readStoredGuide(): StoredGuide | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const value = JSON.parse(raw) as Partial<StoredGuide> | null
    const route = parseStoredRoute(value?.route)
    if (value && typeof value.id === 'string' && value.id && typeof value.savedAt === 'number'
      && Number.isFinite(value.savedAt) && value.savedAt <= Date.now() && Date.now() - value.savedAt < GUIDE_MAX_AGE_MS
      && isLocation(value.start) && isLocation(value.end) && route) {
      return { id: value.id, savedAt: value.savedAt, start: value.start, end: value.end, route }
    }
  } catch {
    // 저장소를 읽을 수 없는 환경에서도 경로 검색과 귀가 안내는 가능하다.
  }
  try { localStorage.removeItem(key) } catch { /* 저장소 사용 불가 */ }
  return null
}

export function saveGuide(guide: StoredGuide, replace: boolean): boolean {
  try {
    if (!replace && readStoredGuide()?.id !== guide.id) return false
    localStorage.setItem(key, JSON.stringify(guide))
    return true
  } catch {
    return false
  }
}

export function discardGuide(id: string) {
  try {
    if (readStoredGuide()?.id === id) localStorage.removeItem(key)
  } catch { /* 저장소 사용 불가 */ }
}
