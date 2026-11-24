import { useEffect, useState } from 'react'
import { facilityExamples, searchRouteFacilities } from '../lib/facilities'
import type { FacilitySearch } from '../lib/facilities'
import type { KakaoMaps } from '../lib/kakaoMaps'
import type { RecommendedRoute } from '../lib/routes'

const failed: FacilitySearch = { facilities: [], incomplete: true, successful: false }
const example: FacilitySearch | null = facilityExamples
  ? { facilities: facilityExamples, incomplete: false, successful: true } : null

export function useRouteFacilities(maps: KakaoMaps | null, route: RecommendedRoute | null) {
  const [attempt, setAttempt] = useState(0)
  const [response, setResponse] = useState<{ route: RecommendedRoute; attempt: number; result: FacilitySearch } | null>(null)
  const canSearch = !!maps && !!(route?.lines.length || route?.navigation)

  useEffect(() => {
    if (example || !canSearch || !maps || !route) return
    const controller = new AbortController()
    queueMicrotask(() => {
      if (controller.signal.aborted) return
      searchRouteFacilities(maps, route, controller.signal).catch(() => failed).then((result) => {
        if (!controller.signal.aborted) setResponse({ route, attempt, result })
      })
    })
    return () => controller.abort()
  }, [canSearch, maps, route, attempt])

  return {
    visible: !!example || canSearch,
    result: example ?? (response?.route === route && response.attempt === attempt ? response.result : null),
    example: !!example,
    retry: () => setAttempt((previous) => previous + 1),
  }
}
