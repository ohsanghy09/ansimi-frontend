// 역할: 전체 위치 선택 상태를 관리하고 LocationCard, LocationSearch, KaKaoMap, LocationConfirm을 연결합니다.
import LocationCard from "../components/location/LocationCard"
import FacilityDetails from '../components/FacilityDetails'
import KaKaoMap from "../components/KaKaoMap"
import { useCallback, useEffect, useRef, useState } from 'react'
import LocationSearch from '../components/location/LocationSearch'
import LocationConfirm from '../components/location/LocationConfirm'
import type { Location, LocationType, SearchResult, SelectedLocations } from '../types/location'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'
import { useLocationSearch } from '../hooks/useLocationSearch'
import { useRouteFacilities } from '../hooks/useRouteFacilities'
import { getServiceArea, recommendRoute, riskStyles, routeExample, unassessedRouteColor } from '../lib/routes'
import type { RecommendedRoute, ServiceArea } from '../lib/routes'
import HomeGuide from '../components/HomeGuide'
import { positionError, positionOptions, toPositionFix } from '../hooks/useCurrentPosition'
import { discardGuide, readStoredGuide, saveGuide } from '../lib/guideStorage'
import type { StoredGuide } from '../lib/guideStorage'




function MainPage () {
    // 여러 컴포넌트가 공유하는 선택 상태는 부모 페이지에서 관리합니다.
    const [searchType, setSearchType] = useState<LocationType | null>(null)
    const [facilityMap, setFacilityMap] = useState<MapInstance | null>(null)
    const [locations, setLocations] = useState<SelectedLocations>({ start: null, end: null })
    const [candidate, setCandidate] = useState<Location | null>(null)
    const [candidateMessage, setCandidateMessage] = useState('')
    const [maps, setMaps] = useState<KakaoMaps | null>(null)
    const [mapTarget, setMapTarget] = useState<Location | null>(null)
    const [area, setArea] = useState<ServiceArea | null>(null)
    const [areaFailed, setAreaFailed] = useState(false)
    const [areaAttempt, setAreaAttempt] = useState(0)
    const [route, setRoute] = useState<RecommendedRoute | null>(null)
    const [loadingRoute, setLoadingRoute] = useState(false)
    const [routeError, setRouteError] = useState('')
    const routeRequest = useRef<AbortController | null>(null)
    const positionRequest = useRef(0)
    const [locating, setLocating] = useState(false)
    const [positionMessage, setPositionMessage] = useState('')
    const [guiding, setGuiding] = useState(false)
    const [arrived, setArrived] = useState(false)
    const [resumable, setResumable] = useState<StoredGuide | null>(() => readStoredGuide())
    const [storageMessage, setStorageMessage] = useState('')
    const guideId = useRef<string | null>(null)
    const { results, searching, message, search, resetSearch } = useLocationSearch(maps)
    const facilityPanel = useRouteFacilities(maps, route)
    const handleMapReady = useCallback((sdk: KakaoMaps, map: MapInstance) => {
        setMaps(sdk)
        setFacilityMap(map)
    }, [])

    useEffect(() => {
        const controller = new AbortController()
        getServiceArea(controller.signal).then((result) => {
            if (!controller.signal.aborted) setArea(result)
        }).catch(() => {
            if (!controller.signal.aborted) setAreaFailed(true)
        })
        return () => controller.abort()
    }, [areaAttempt])

    useEffect(() => () => routeRequest.current?.abort(), [])
    useEffect(() => () => { positionRequest.current += 1 }, [])

    function clearRoute() {
        routeRequest.current?.abort()
        routeRequest.current = null
        setRoute(null)
        setArrived(false)
        setRouteError('')
        setLoadingRoute(false)
    }

    async function findRoute() {
        const { start, end } = locations
        if (!start || !end || searchType || routeRequest.current) return
        clearRoute()
        if (start.latitude === end.latitude && start.longitude === end.longitude) {
            setRouteError('출발지와 도착지를 서로 다른 위치로 선택해주세요.')
            return
        }
        const controller = new AbortController()
        routeRequest.current = controller
        setLoadingRoute(true)
        try {
            const recommendation = await recommendRoute(start, end, controller.signal)
            if (routeRequest.current === controller) setRoute(recommendation)
        } catch (reason) {
            if (routeRequest.current === controller && !controller.signal.aborted) {
                setRouteError(reason instanceof Error && !(reason instanceof TypeError || reason instanceof DOMException)
                    ? reason.message : '경로 조회에 실패했습니다. 연결을 확인하고 다시 시도해주세요.')
            }
        } finally {
            if (routeRequest.current === controller) {
                routeRequest.current = null
                setLoadingRoute(false)
            }
        }
    }

    function cancelSelection() {
        resetSearch()
        setMapTarget(null)
        setSearchType(null)
        setCandidate(null)
        setCandidateMessage('')
    }

    function selectLocation(type: LocationType) {
        positionRequest.current += 1
        setLocating(false)
        setPositionMessage('')
        if (searchType === type) {
            cancelSelection()
            return
        }
        // 확정 주소는 유지하고 지도 중심의 주소를 새 후보로 조회합니다.
        setCandidate(null)
        setCandidateMessage(maps ? '주소를 확인하고 있습니다…' : '지도를 불러온 뒤 위치를 선택해주세요.')
        resetSearch()
        setMapTarget(locations[type])
        setSearchType(type)
    }

    function selectSearchResult(result: SearchResult) {
        if (!searchType) return
        resetSearch()
        setCandidate(null)
        setCandidateMessage('주소를 확인하고 있습니다…')
        setMapTarget({ ...result })
    }

    function confirmLocation() {
        if (!searchType || !candidate) return
        clearRoute()
        setLocations((previous) => ({ ...previous, [searchType]: candidate }))
        cancelSelection()
    }

    function usePositionAsStart() {
        if (locating) return
        if (!navigator.geolocation) {
            setPositionMessage('이 브라우저에서는 현재 위치를 사용할 수 없습니다.')
            return
        }
        const request = ++positionRequest.current
        setLocating(true)
        setPositionMessage('')
        navigator.geolocation.getCurrentPosition((position) => {
            if (request !== positionRequest.current) return
            const { location } = toPositionFix(position)
            clearRoute()
            setLocations((previous) => ({ ...previous, start: location }))
            setMapTarget(location)
            setLocating(false)
        }, (reason) => {
            if (request !== positionRequest.current) return
            setPositionMessage(positionError(reason))
            setLocating(false)
        }, positionOptions)
    }

    function startGuide() {
        const { start, end } = locations
        if (!start || !end || !route) return
        const id = crypto.randomUUID()
        guideId.current = id
        setResumable(null)
        setStorageMessage(saveGuide({ id, savedAt: Date.now(), start, end, route }, true) ? ''
            : '이 기기에는 귀가 상태를 저장할 수 없습니다.')
        setFacilityMap(null)
        setGuiding(true)
    }

    function restoreGuide() {
        const stored = readStoredGuide()
        setResumable(null)
        if (!stored || stored.id !== resumable?.id) {
            setStorageMessage('이전 귀가 안내의 저장 시간이 지났거나 상태가 변경됐습니다.')
            return
        }
        positionRequest.current += 1
        setLocating(false)
        clearRoute()
        cancelSelection()
        guideId.current = stored.id
        setStorageMessage('')
        setLocations({ start: stored.start, end: stored.end })
        setRoute(stored.route)
        setFacilityMap(null)
        setGuiding(true)
    }

    function finishGuide(didArrive: boolean) {
        if (guideId.current) discardGuide(guideId.current)
        guideId.current = null
        setStorageMessage('')
        setGuiding(false)
        setArrived(didArrive)
    }

    if (guiding && route) {
        return <HomeGuide route={route} locations={locations} serviceArea={area} facilityPanel={facilityPanel} onMapReady={setMaps}
            storageMessage={storageMessage} onEnd={() => finishGuide(false)}
            onArrive={() => finishGuide(true)}
            onRouteChange={(result, start) => {
                setRoute(result)
                setLocations((previous) => ({ ...previous, start }))
                const id = guideId.current
                const end = locations.end
                if (id && end && !saveGuide({ id, savedAt: Date.now(), start, end, route: result }, false)) {
                    setStorageMessage('업데이트된 귀가 상태를 이 기기에 저장할 수 없습니다.')
                }
            }} />
    }

    return (

        // 배경은 화면을 채우고 콘텐츠는 패딩을 포함해 최대 480px로 가운데 정렬합니다.
        <main className='min-h-dvh bg-[#EEF2E9]'>
            <div className="mx-auto w-full max-w-[480px] px-4 py-6 sm:px-6">
            

            <header className="mb-6">

                {/* tracking-widest는 글자 간격 넓히기 */}
                <p className="text-xs font-medium tracking-widest text-[#55786A]">
                    당신의 일상에 안심을
                </p>

                {/* leading-snug는 줄 간격 좁힘 */}
                <h1 className="mt-2 text-2xl font-semibold leading-snug text-[#183B36]">
                    오늘의 귀갓길, <br />
                    어디로 향하시나요?
                </h1>
            </header>

            {resumable && <section aria-label="귀가 안내 복원" className="mb-5 space-y-3 rounded-2xl bg-white p-4 text-[#183B36]">
                <h2 className="font-semibold">이전 귀가 안내를 이어갈까요?</h2>
                <p className="text-sm">목적지 · {resumable.end.address}</p>
                <div className="flex flex-wrap gap-2">
                    <button type="button" className="rounded-lg bg-[#183B36] px-3 py-2 text-sm font-semibold text-white" onClick={restoreGuide}>이어가기</button>
                    <button type="button" className="rounded-lg bg-[#EEF2E9] px-3 py-2 text-sm font-semibold" onClick={() => {
                        discardGuide(resumable.id)
                        setResumable(null)
                    }}>저장된 안내 종료</button>
                </div>
            </section>}
            {storageMessage && <p role="status" className="mb-5 text-sm text-[#426459]">{storageMessage}</p>}

            {/* 화면 상단 카드 컴포넌트*/}
            <LocationCard searchType={searchType} locations={locations} onSelect={selectLocation} />

            {!searchType && <div className="mt-3">
                <button type="button" onClick={usePositionAsStart} disabled={locating}
                    className="rounded-lg bg-white px-3 py-2 text-sm font-semibold text-[#183B36] disabled:opacity-50">
                    {locating ? '현재 위치 확인 중…' : '현재 위치를 출발지로 사용'}
                </button>
                {positionMessage && <p role="alert" className="mt-2 text-sm text-[#9d3037]">{positionMessage}</p>}
            </div>}

            {searchType && (
                <div className="mt-6">
                    {/* 선택 대상 변경 시 입력 상태도 초기화합니다. */}
                    <LocationSearch key={searchType} searchType={searchType}
                        results={results} searching={searching} message={message} ready={!!maps}
                        onSearch={search} onQueryChange={resetSearch} onSelectResult={selectSearchResult} />
                </div>
            )}

            {/* 카카오맵 컴포넌트*/}
            <div className="mt-6">
                <KaKaoMap target={mapTarget} onReady={handleMapReady}
                    searchType={searchType} locations={locations} showPilotArea serviceArea={area} route={route}
                    onCandidateChange={setCandidate} onMessageChange={setCandidateMessage} />
                {area && maps && <p className="mt-2 flex items-center gap-2 text-xs font-medium text-[#244569]">
                    <span aria-hidden="true" className="size-3 rounded-sm border border-[#305787] bg-[#5284be]/20" />
                    강남구 시범 서비스 권역
                </p>}
                {areaFailed && <p className="mt-2 text-xs text-[#244569]">
                    서비스 권역을 불러오지 못했습니다.{' '}
                    <button type="button" className="font-semibold underline" onClick={() => {
                        setAreaFailed(false)
                        setAreaAttempt((attempt) => attempt + 1)
                    }}>다시 불러오기</button>
                </p>}
            </div>

            {!searchType && facilityPanel.visible && <div className="mt-4">
                <FacilityDetails panel={facilityPanel} maps={maps} map={facilityMap} />
            </div>}

            {searchType && (
                <div className="mt-6">
                    <LocationConfirm
                        searchType={searchType}
                        candidate={candidate}
                        message={candidateMessage}
                        onCancel={cancelSelection}
                        onConfirm={confirmLocation}
                    />
                </div>
            )}

            {!searchType && <section aria-label="추천 경로" className="mt-5 space-y-3">
                {arrived && <p role="status" className="rounded-xl bg-white p-4 font-semibold text-[#183B36]">목적지에 도착했습니다.</p>}
                {routeExample && <p className="text-sm font-semibold text-[#825900]">개발용 예시 경로</p>}
                {routeError && <p role="alert" className="rounded-xl bg-white p-3 text-sm text-[#9d3037]">{routeError}</p>}
                {route && <div role="status" className="rounded-xl bg-white p-4 text-[#183B36]">
                    <p className="font-semibold">{route.lines.length ? '추천 경로' : '일반 도보 경로'} · {route.distanceM.toLocaleString('ko-KR')} m · 약 {route.durationMin}분</p>
                    {route.lines.length ? <ul aria-label="경로 위험도 범례" className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs">
                        {Object.entries(riskStyles).map(([level, { color, label }]) => <li key={level} className="flex items-center gap-1.5">
                            <span aria-hidden="true" className="h-1 w-4 rounded" style={{ backgroundColor: color }} />{label}
                        </li>)}
                        {route.navigation && <li className="flex items-center gap-1.5">
                            <span aria-hidden="true" className="h-1 w-4 rounded" style={{ backgroundColor: unassessedRouteColor }} />위험도 평가 정보 없음
                        </li>}
                    </ul> : <p className="mt-2 text-sm">이 경로의 위험도 평가 데이터가 없습니다.</p>}
                </div>}
                <button type="button" disabled={!locations.start || !locations.end || loadingRoute}
                    onClick={findRoute} className="w-full rounded-xl bg-[#183B36] px-4 py-3 font-semibold text-white disabled:opacity-50">
                    {loadingRoute ? '경로를 찾고 있습니다…' : route || routeError ? '경로 다시 찾기' : '경로 찾기'}
                </button>
                {!arrived && route && (route.lines.length > 0 || route.navigation) && <button type="button" disabled={locating} onClick={startGuide}
                    className="w-full rounded-xl bg-[#167553] px-4 py-3 font-semibold text-white disabled:opacity-50">
                    귀가 시작
                </button>}
            </section>}

            {/* 우측 하단 문구 */}
            <footer className="mt-6 text-right">
                <p className="text-sm font-medium tracking-wide text-[#55786A]">
                    집으로 향하는 길, 마음은 가볍게.
                </p>
            </footer>
            </div>
        </main>


        
    )

}

export default MainPage
