import { useEffect, useRef, useState } from 'react'

type Location = { latitude: number; longitude: number; address: string }
type Mode = 'start' | 'end'
type SearchResult = Location & { name: string }
type SearchDocument = {
  x: string; y: string; address_name: string
  road_address_name?: string; place_name?: string
}
type LatLng = { getLat(): number; getLng(): number }
type MapInstance = { getCenter(): LatLng; setCenter(position: LatLng): void }
type Maps = {
  load(callback: () => void): void
  LatLng: new (latitude: number, longitude: number) => LatLng
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => MapInstance
  Marker: new (options: { map: MapInstance; position: LatLng; title: string }) => { setMap(map: MapInstance | null): void }
  event: {
    addListener(map: MapInstance, name: string, callback: () => void): void
    removeListener(map: MapInstance, name: string, callback: () => void): void
    trigger(map: MapInstance, name: string): void
  }
  services: {
    Status: { OK: string }
    Places: new () => {
      keywordSearch(query: string, callback: (results: SearchDocument[], status: string) => void,
        options: { size: number }): void
    }
    Geocoder: new () => {
      addressSearch(query: string, callback: (results: SearchDocument[], status: string) => void,
        options: { size: number }): void
      coord2Address(lng: number, lat: number, callback: (results: {
        address?: { address_name: string }; road_address?: { address_name: string }
      }[], status: string) => void): void
    }
  }
}

function ExamplePage() {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const mapsRef = useRef<Maps | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(() => import.meta.env.VITE_KAKAO_MAP_KEY?.trim()
    ? '' : '.env.local에 VITE_KAKAO_MAP_KEY를 설정한 뒤 개발 서버를 다시 시작해주세요.')
  const [mode, setMode] = useState<Mode | null>(null)
  const [locations, setLocations] = useState<Record<Mode, Location | null>>({ start: null, end: null })
  // 후보 위치와 확정 위치를 분리하므로 취소해도 카드 주소는 유지됩니다.
  const [candidate, setCandidate] = useState<Location | null>(null)
  const [message, setMessage] = useState('')
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searchMessage, setSearchMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const searchRequestRef = useRef(0)
  const searchTimerRef = useRef<number | undefined>(undefined)

  // 화면 이탈 시 진행 중인 검색 응답과 타이머를 정리합니다.
  useEffect(() => () => {
    searchRequestRef.current += 1
    window.clearTimeout(searchTimerRef.current)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    const key = import.meta.env.VITE_KAKAO_MAP_KEY?.trim()
    if (!container) return
    if (!key) return
    let cancelled = false
    const script = document.createElement('script')
    // 좌표를 주소로 바꾸기 위해 services를 함께 불러옵니다.
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`
    const timeout = window.setTimeout(() => {
      if (!cancelled) setError('지도 로딩이 지연됩니다. 네트워크와 SDK 등록 도메인을 확인하고 새로고침해주세요.')
    }, 15000)
    script.onerror = () => {
      window.clearTimeout(timeout)
      if (!cancelled) setError('지도를 불러오지 못했습니다. 네트워크와 카카오 키 설정을 확인해주세요.')
    }
    script.onload = () => {
      const maps = (window as Window & { kakao?: { maps: Maps } }).kakao?.maps
      if (!maps) {
        window.clearTimeout(timeout)
        if (!cancelled) setError('카카오 SDK를 사용할 수 없습니다. 키 설정을 확인해주세요.')
        return
      }
      maps.load(() => {
        if (cancelled) return
        window.clearTimeout(timeout)
        if (!maps.services?.Geocoder) {
          setError('주소 조회 기능을 불러오지 못했습니다. 새로고침해주세요.')
          return
        }
        mapsRef.current = maps
        mapRef.current = new maps.Map(container, { center: new maps.LatLng(37.5665, 126.978), level: 3 })
        setError('')
        setReady(true)
      })
    }
    document.head.appendChild(script)
    return () => {
      cancelled = true
      window.clearTimeout(timeout)
      script.onload = null
      script.onerror = null
      script.remove()
      mapRef.current = null
      mapsRef.current = null
      container.replaceChildren()
    }
  }, [])

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (!ready || !mode || !maps || !map) return
    const geocoder = new maps.services.Geocoder()
    let active = true
    let requestId = 0
    let timeout: number | undefined
    function invalidate() {
      requestId += 1
      window.clearTimeout(timeout)
      setCandidate(null)
      setMessage('지도를 움직여 위치를 맞춰주세요.')
    }
    function lookup() {
      if (!map || !maps) return
      const id = ++requestId
      const center = map.getCenter()
      setCandidate(null)
      setMessage('주소를 확인하고 있습니다…')
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => {
        if (!active || id !== requestId) return
        requestId += 1
        setMessage('주소 조회 시간이 초과되었습니다. 지도를 조금 움직여 다시 시도해주세요.')
      }, 10000)
      geocoder.coord2Address(center.getLng(), center.getLat(), (results, status) => {
        // 이전 좌표에 대한 응답이나 선택 취소 후 도착한 응답은 무시합니다.
        if (!active || id !== requestId) return
        window.clearTimeout(timeout)
        const address = results[0]?.road_address?.address_name ?? results[0]?.address?.address_name
        if (status !== maps.services.Status.OK || !address) {
          setMessage('주소를 찾지 못했습니다. 다른 위치로 지도를 움직여주세요.')
          return
        }
        setCandidate({ latitude: center.getLat(), longitude: center.getLng(), address })
        setMessage('')
      })
    }
    maps.event.addListener(map, 'center_changed', invalidate)
    maps.event.addListener(map, 'zoom_start', invalidate)
    maps.event.addListener(map, 'idle', lookup)
    lookup()
    return () => {
      active = false
      window.clearTimeout(timeout)
      maps.event.removeListener(map, 'center_changed', invalidate)
      maps.event.removeListener(map, 'zoom_start', invalidate)
      maps.event.removeListener(map, 'idle', lookup)
    }
  }, [ready, mode])

  useEffect(() => {
    const maps = mapsRef.current
    const map = mapRef.current
    if (!ready || !maps || !map) return
    const markers = (['start', 'end'] as const).flatMap((key) => {
      const location = locations[key]
      if (!location) return []
      return [new maps.Marker({ map, position: new maps.LatLng(location.latitude, location.longitude),
        title: `${key === 'start' ? '출발' : '도착'}: ${location.address}` })]
    })
    return () => markers.forEach((marker) => marker.setMap(null))
  }, [ready, locations])

  function beginSelection(nextMode: Mode) {
    resetSearch()
    setQuery('')
    const saved = locations[nextMode]
    setCandidate(null)
    setMessage('주소를 확인하고 있습니다…')
    if (saved && mapsRef.current) {
      mapRef.current?.setCenter(new mapsRef.current.LatLng(saved.latitude, saved.longitude))
    }
    setMode(nextMode)
  }
  function confirm() {
    if (!mode || !candidate) return
    resetSearch()
    setLocations((previous) => ({ ...previous, [mode]: candidate }))
    setMode(null)
    setCandidate(null)
  }

  function resetSearch() {
    searchRequestRef.current += 1
    window.clearTimeout(searchTimerRef.current)
    setSearching(false)
    setSearchResults([])
    setSearchMessage('')
  }

  function search() {
    const maps = mapsRef.current
    if (!maps || !mode) return
    resetSearch()
    const keyword = query.trim()
    if (!keyword) {
      setSearchMessage('주소 또는 장소 이름을 입력해주세요.')
      return
    }
    const id = searchRequestRef.current
    setSearching(true)
    setSearchMessage('검색하고 있습니다…')
    const combined: SearchResult[] = []
    let remaining = 2
    let failed = false
    searchTimerRef.current = window.setTimeout(() => {
      if (id !== searchRequestRef.current) return
      searchRequestRef.current += 1
      setSearching(false)
      setSearchMessage('검색 시간이 초과되었습니다. 다시 검색해주세요.')
    }, 10000)

    // 주소 검색과 장소 이름 검색 결과를 합쳐서 보여줍니다.
    function receive(results: SearchDocument[], status: string) {
      if (id !== searchRequestRef.current || !maps) return
      if (status === maps.services.Status.OK) {
        for (const result of results) {
          const latitude = Number(result.y)
          const longitude = Number(result.x)
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue
          const address = result.road_address_name || result.address_name
          if (!address) continue
          if (combined.some((item) => item.latitude === latitude && item.longitude === longitude)) continue
          combined.push({ latitude, longitude, address, name: result.place_name || address })
        }
      } else if (status !== 'ZERO_RESULT') failed = true
      remaining -= 1
      if (remaining > 0) return
      window.clearTimeout(searchTimerRef.current)
      setSearching(false)
      setSearchResults(combined)
      setSearchMessage(combined.length
        ? `${combined.length}개 결과입니다. 위치를 선택한 뒤 지도에서 확인해주세요.${failed ? ' 일부 검색에 실패했습니다.' : ''}`
        : failed ? '검색하지 못했습니다. 네트워크와 카카오 API 설정을 확인한 뒤 다시 시도해주세요.'
          : '검색 결과가 없습니다. 다른 주소나 장소 이름으로 검색해주세요.')
    }
    new maps.services.Geocoder().addressSearch(keyword, receive, { size: 5 })
    new maps.services.Places().keywordSearch(keyword, receive, { size: 5 })
  }

  function selectSearchResult(result: SearchResult) {
    const map = mapRef.current
    const maps = mapsRef.current
    if (!mode || !map || !maps) return
    resetSearch()
    setQuery(result.name)
    setCandidate(null)
    map.setCenter(new maps.LatLng(result.latitude, result.longitude))
    // 같은 중심 좌표를 다시 선택해도 주소를 조회하도록 합니다.
    maps.event.trigger(map, 'idle')
  }
  const label = mode === 'start' ? '출발지' : '도착지'

  return (
    <div className="min-h-dvh bg-[#EEF2E9] p-4 text-[#183B36] sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <header><p className="text-sm text-[#55786A]">위치 선택 예제</p><h1 className="mt-1 text-2xl font-bold">안심이</h1></header>
        <section aria-label="출발지와 도착지" className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          {(['start', 'end'] as const).map((key) => (
            <button key={key} type="button" disabled={!ready || !!error || mode === key}
              aria-pressed={mode === key} onClick={() => beginSelection(key)}
              className={`flex min-h-16 w-full items-center gap-3 rounded-xl border-2 p-3 text-left disabled:cursor-default ${mode === key ? 'border-[#25A77A] bg-[#EDF8F2]' : 'border-transparent bg-[#F4F7F2]'}`}>
              <span className={`h-3 w-3 shrink-0 rounded-full ${key === 'start' ? 'bg-[#25A77A]' : 'bg-[#183B36]'}`} />
              <span className="shrink-0 text-sm font-semibold">{key === 'start' ? '출발' : '도착'}</span>
              <span className="text-sm">{locations[key]?.address ?? '눌러서 지도에서 위치 선택'}</span>
            </button>
          ))}
        </section>
        {mode && (
          <section aria-label={`${label} 주소 및 장소 검색`} className="rounded-2xl bg-white p-4 shadow-sm">
            <form onSubmit={(event) => { event.preventDefault(); search() }} className="flex gap-2">
              <label className="min-w-0 flex-1">
                <span className="mb-2 block text-sm font-semibold">{label} 주소·장소 검색</span>
                <input value={query} onChange={(event) => { resetSearch(); setQuery(event.target.value) }}
                  placeholder="예: 서울 중구 세종대로 110, 서울역" maxLength={100}
                  className="min-h-12 w-full rounded-xl border border-[#CEDAD0] px-3 text-sm focus:outline-2 focus:outline-[#25A77A]" />
              </label>
              <button type="submit" disabled={searching} className="min-h-12 self-end rounded-xl bg-[#183B36] px-4 text-sm font-semibold text-white disabled:opacity-40">{searching ? '검색 중' : '검색'}</button>
            </form>
            <p role="status" className="mt-2 text-sm text-[#55786A]">{searchMessage}</p>
            {searchResults.length > 0 && (
              <ul aria-label="검색 결과" className="mt-2 max-h-52 overflow-y-auto divide-y divide-[#E0E8DD]">
                {searchResults.map((result) => (
                  <li key={`${result.latitude},${result.longitude}`}>
                    <button type="button" onClick={() => selectSearchResult(result)} className="min-h-16 w-full rounded-lg p-3 text-left hover:bg-[#F4F7F2]">
                      <span className="block text-sm font-semibold">{result.name}</span>
                      <span className="mt-1 block text-xs text-[#55786A]">{result.address}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
        <div className="relative isolate overflow-hidden rounded-2xl border border-[#CEDAD0] bg-[#E0E8DD]">
          <div ref={containerRef} className="h-[50dvh] min-h-72 w-full" aria-label="위치 선택 지도" />
          {!ready && <p role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-[#EEF2E9] p-6 text-center">{error || '지도를 불러오고 있습니다…'}</p>}
          {mode && <>
            <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl bg-white/95 p-3 text-center text-sm font-semibold shadow">지도를 움직여 {mode === 'start' ? '출발' : '도착'} 위치를 선택해주세요!</p>
            {/* 마커 끝을 지도 중앙에 고정합니다. 지도만 움직입니다. */}
            <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
              <svg width="40" height="48" viewBox="0 0 40 48" className="drop-shadow-lg">
                <path d="M20 47C16 40 2 27 2 19a18 18 0 1 1 36 0c0 8-14 21-18 28Z" fill={mode === 'start' ? '#25A77A' : '#183B36'} stroke="white" strokeWidth="2" />
                <circle cx="20" cy="19" r="6" fill="white" />
              </svg>
            </div>
          </>}
        </div>
        {mode ? (
          <section aria-label={`${label} 확정`} className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="text-xs text-[#55786A]">선택 중인 {label}</p>
            <p role="status" className="mt-2 min-h-12 text-sm font-medium">{candidate?.address ?? message}</p>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={() => { resetSearch(); setMode(null); setCandidate(null) }} className="min-h-12 rounded-xl bg-[#F0F3EE] px-5 font-semibold">취소</button>
              <button type="button" disabled={!candidate} onClick={confirm} className="min-h-12 flex-1 rounded-xl bg-[#183B36] px-3 font-semibold text-white disabled:opacity-40">이 위치로 {label} 설정</button>
            </div>
          </section>
        ) : <p role="status" className="text-center text-sm text-[#55786A]">출발 또는 도착 카드를 눌러 위치를 선택해보세요.</p>}
        <p className="text-xs text-[#55786A]">지도 이동 또는 주소·장소 검색으로 위치를 선택하는 예제입니다. 경로 탐색은 포함하지 않습니다.</p>
      </div>
    </div>
  )
}

export default ExamplePage
