import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentPosition } from '../hooks/useCurrentPosition'
import type { PositionFix } from '../hooks/useCurrentPosition'
import { FIX_MAX_AGE_MS, isRouteArrival, MAX_ACCURACY_M, measureNavigation, projectPosition } from '../lib/navigation'
import type { Progress } from '../lib/navigation'
import { recommendRoute } from '../lib/routes'
import type { RecommendedRoute, ServiceArea } from '../lib/routes'
import type { Location, SelectedLocations } from '../types/location'
import KaKaoMap from './KaKaoMap'
import FacilityDetails from './FacilityDetails'
import type { FacilityPanel } from './FacilityDetails'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'

type HomeGuideProps = {
  route: RecommendedRoute
  locations: SelectedLocations
  serviceArea: ServiceArea | null
  facilityPanel: FacilityPanel
  onMapReady: (maps: KakaoMaps) => void
  storageMessage: string
  onEnd: () => void
  onArrive: () => void
  onRouteChange: (route: RecommendedRoute, start: Location) => void
}

export default function HomeGuide({ route, locations, serviceArea, facilityPanel, onMapReady, storageMessage, onEnd, onArrive, onRouteChange }: HomeGuideProps) {
  const [target, setTarget] = useState<Location | null>(null)
  const [progress, setProgress] = useState<Progress | null>(null)
  const [rerouting, setRerouting] = useState(false)
  const [rerouteError, setRerouteError] = useState(false)
  const [facilityMap, setFacilityMap] = useState<{ maps: KakaoMaps; map: MapInstance } | null>(null)
  const handleMapReady = useCallback((maps: KakaoMaps, map: MapInstance) => {
    setFacilityMap({ maps, map })
    onMapReady(maps)
  }, [onMapReady])
  const previous = useRef<{ route: RecommendedRoute; fix: PositionFix; progress: Progress } | undefined>(undefined)
  const missedFixes = useRef(0)
  const arrivalFixes = useRef(0)
  const rerouteRequest = useRef<AbortController | null>(null)
  const lastReroute = useRef(0)
  const navigation = useMemo(() => route.navigation ? measureNavigation(route.navigation) : null, [route])

  useEffect(() => () => {
    rerouteRequest.current?.abort()
    rerouteRequest.current = null
  }, [])

  async function reroute(fix: PositionFix) {
    const end = locations.end
    if (!end || rerouteRequest.current) return
    const controller = new AbortController()
    rerouteRequest.current = controller
    lastReroute.current = Date.now()
    missedFixes.current = 0
    arrivalFixes.current = 0
    setProgress(null)
    setRerouteError(false)
    setRerouting(true)
    try {
      const result = await recommendRoute(fix.location, end, controller.signal)
      if (!result.lines.length && !result.navigation) throw new Error('No route geometry')
      if (rerouteRequest.current === controller) {
        previous.current = undefined
        onRouteChange(result, fix.location)
      }
    } catch {
      if (rerouteRequest.current === controller) setRerouteError(true)
    } finally {
      if (rerouteRequest.current === controller) {
        rerouteRequest.current = null
        setRerouting(false)
      }
    }
  }

  function handleFix(fix: PositionFix | null) {
    if (!fix || !(fix.accuracy <= MAX_ACCURACY_M)) {
      missedFixes.current = 0
      arrivalFixes.current = 0
      setProgress(null)
      if (!fix && document.visibilityState !== 'visible' && rerouteRequest.current) {
        rerouteRequest.current.abort()
        rerouteRequest.current = null
        lastReroute.current = 0
        setRerouting(false)
      }
      return
    }
    if (!navigation?.length || rerouteRequest.current) return
    const last = previous.current?.route === route ? previous.current : undefined
    const projected = projectPosition(navigation, fix, last)
    if (!projected || projected.distanceFromRoute > Math.max(35, fix.accuracy * 1.5)) {
      setProgress(null)
      arrivalFixes.current = 0
      missedFixes.current += 1
      if (missedFixes.current >= 3 && !rerouteError && Date.now() - lastReroute.current >= 15000) void reroute(fix)
      return
    }
    missedFixes.current = 0
    previous.current = { route, fix, progress: projected }
    setProgress(projected)
    setRerouteError(false)
    if (locations.end && isRouteArrival(projected, fix, locations.end)) {
      arrivalFixes.current += 1
      if (arrivalFixes.current >= 2) onArrive()
    } else arrivalFixes.current = 0
  }

  const { fix, error, retry } = useCurrentPosition(handleFix, FIX_MAX_AGE_MS)
  const upcomingIndex = progress && navigation
    ? navigation.steps.findIndex(({ pathIndex }) => navigation.cumulative[pathIndex] > progress.meters)
    : -1
  const next = upcomingIndex >= 0 ? navigation?.steps[upcomingIndex] : undefined
  const current = upcomingIndex < 0 ? navigation?.steps.at(-1) : navigation?.steps[upcomingIndex - 1]

  return (
    <div className="min-h-dvh bg-[#EEF2E9] text-[#183B36]">
      <div className="mx-auto w-full max-w-[480px] space-y-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
          <div>
            <h1 className="text-xl font-semibold">귀가 안내</h1>
            <p className="mt-1 text-sm text-[#426459]">{locations.end?.name || locations.end?.address}</p>
          </div>
          <button type="button" onClick={onEnd} className="shrink-0 rounded-lg bg-[#EEF2E9] px-3 py-2 text-sm font-semibold">안내 종료</button>
        </header>
        {storageMessage && <p role="status" className="text-sm text-[#426459]">{storageMessage}</p>}
        <section aria-label="다음 안내" className="rounded-2xl bg-white p-4">
          <h2 className="text-sm font-semibold text-[#426459]">다음 안내</h2>
          {error ? <div className="mt-2 space-y-2">
            <p role="alert" className="text-sm text-[#9d3037]">{error}</p>
            <button type="button" className="text-sm font-semibold underline" onClick={retry}>위치 다시 확인</button>
          </div> : !fix && <p role="status" className="mt-2 text-sm">현재 위치를 확인하고 있습니다…</p>}
          {fix && fix.accuracy > MAX_ACCURACY_M && <p role="status" className="mt-2 text-sm">위치 정확도를 확인하고 있습니다…</p>}
          {rerouting && <p role="status" className="mt-2 text-sm">현재 위치에서 경로를 다시 찾고 있습니다…</p>}
          {rerouteError && <div className="mt-2 text-sm">
            <p role="alert" className="text-[#9d3037]">새 경로를 찾지 못했습니다. 기존 경로를 참고해주세요.</p>
            <button type="button" disabled={!fix || fix.accuracy > MAX_ACCURACY_M} className="mt-2 font-semibold underline disabled:opacity-50"
              onClick={() => { if (fix) void reroute(fix) }}>경로 다시 찾기</button>
          </div>}
          {!navigation?.length && <p className="mt-2 text-sm">이 경로의 실시간 구간 안내 데이터가 없습니다.</p>}
          {fix && fix.accuracy <= MAX_ACCURACY_M && !!navigation?.length && !rerouting && !rerouteError && <div className="mt-2 text-sm">
            {progress ? <>
              {next ? <p className="text-lg font-semibold leading-snug">
                약 {Math.round(navigation.cumulative[next.pathIndex] - progress.meters)} m 앞 <span aria-live="polite">{next.instruction}</span>
              </p> : current && <p className="text-lg font-semibold leading-snug" aria-live="polite">{current.instruction}</p>}
              {next && current && <p className="mt-1 text-[#426459]">현재 구간 · {current.instruction}</p>}
              <p className="mt-1 text-[#426459]">남은 경로 약 {Math.round(progress.remaining)} m</p>
            </> : <p>현재 위치와 경로를 확인하고 있습니다…</p>}
          </div>}
        </section>
        <KaKaoMap target={target} locations={locations} currentPosition={fix?.location} serviceArea={serviceArea} showPilotArea route={route} onReady={handleMapReady} />
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold">전체 {route.distanceM.toLocaleString('ko-KR')} m · 약 {route.durationMin}분</p>
          {!route.lines.length && <p className="mt-1 text-sm text-[#426459]">일반 도보 안내 · 위험도 평가 데이터 없음</p>}
          {fix && !error && <button type="button" className="mt-3 rounded-lg bg-[#EEF2E9] px-3 py-2 text-sm font-semibold"
            onClick={() => setTarget({ ...fix.location })}>현재 위치로 이동</button>}
        </div>
        {facilityPanel.visible && facilityMap && <FacilityDetails
          panel={rerouting ? { ...facilityPanel, result: null } : facilityPanel} {...facilityMap} />}
      </div>
    </div>
  )
}
