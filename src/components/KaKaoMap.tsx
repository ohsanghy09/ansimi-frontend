// 역할: 지도 이동과 중심 주소 조회, 선택 안내 및 후보·확정 마커를 표시합니다.
import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../lib/kakaoMaps'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'
import type { Location, LocationType, SelectedLocations } from '../types/location'
import { riskStyles } from '../lib/routes'
import type { RecommendedRoute, ServiceArea } from '../lib/routes'
import currentLocationIcon from '../assets/icons/current-location.svg'

type KaKaoMapProps = {
  target?: Location | null
  onReady?: (maps: KakaoMaps) => void
  searchType?: LocationType | null
  locations?: SelectedLocations
  serviceArea?: ServiceArea | null
  showPilotArea?: boolean
  route?: RecommendedRoute | null
  currentPosition?: Location
  onCandidateChange?: (location: Location | null) => void
  onMessageChange?: (message: string) => void
}

function KaKaoMap({ target, onReady, searchType, locations, serviceArea, showPilotArea, route, currentPosition, onCandidateChange, onMessageChange }: KaKaoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const [maps, setMaps] = useState<KakaoMaps | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let active = true
    loadKakaoMaps().then((sdk) => {
      if (!active) return
      mapRef.current = new sdk.Map(container, {
        center: showPilotArea ? new sdk.LatLng(37.499, 127.062) : new sdk.LatLng(37.5665, 126.978),
        level: showPilotArea ? 7 : 2,
      })
      setMaps(sdk)
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : '지도를 불러오지 못했습니다.')
    })
    return () => {
      active = false
      mapRef.current = null
      container.replaceChildren()
    }
  }, [showPilotArea])

  useEffect(() => {
    if (maps) onReady?.(maps)
  }, [maps, onReady])

  // 대상을 바꾸거나 검색 결과를 선택하면 이전 조회를 폐기하고 새 중심을 조회합니다.
  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map) return
    if (target) map.setCenter(new maps.LatLng(target.latitude, target.longitude))
    if (!searchType) return
    const geocoder = new maps.services.Geocoder()
    let active = true
    let requestId = 0
    let timer: number | undefined

    function invalidate() {
      requestId += 1
      window.clearTimeout(timer)
      onCandidateChange?.(null)
      onMessageChange?.('지도를 움직여 위치를 맞춰주세요.')
    }

    function lookup() {
      if (!map || !maps) return
      const id = ++requestId
      const center = map.getCenter()
      window.clearTimeout(timer)
      onCandidateChange?.(null)
      onMessageChange?.('주소를 확인하고 있습니다…')
      timer = window.setTimeout(() => {
        if (!active || id !== requestId) return
        requestId += 1
        onMessageChange?.('주소 조회 시간이 초과되었습니다. 지도를 조금 움직여 다시 시도해주세요.')
      }, 10000)
      try {
        geocoder.coord2Address(center.getLng(), center.getLat(), (results, status) => {
          if (!active || id !== requestId) return
          window.clearTimeout(timer)
          const address = results[0]?.road_address?.address_name || results[0]?.address?.address_name
          if (status !== maps.services.Status.OK || !address) {
            onMessageChange?.('주소를 찾지 못했습니다. 다른 위치로 지도를 움직여주세요.')
            return
          }
          onCandidateChange?.({ latitude: center.getLat(), longitude: center.getLng(), address })
          onMessageChange?.('')
        })
      } catch {
        window.clearTimeout(timer)
        onMessageChange?.('주소 조회에 실패했습니다. 지도를 움직여 다시 시도해주세요.')
      }
    }

    maps.event.addListener(map, 'center_changed', invalidate)
    maps.event.addListener(map, 'zoom_start', invalidate)
    maps.event.addListener(map, 'idle', lookup)
    // 같은 좌표를 다시 선택한 경우에도 조회합니다.
    lookup()
    return () => {
      active = false
      window.clearTimeout(timer)
      maps.event.removeListener(map, 'center_changed', invalidate)
      maps.event.removeListener(map, 'zoom_start', invalidate)
      maps.event.removeListener(map, 'idle', lookup)
    }
  }, [maps, target, searchType, onCandidateChange, onMessageChange])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !locations) return
    const markers = (['start', 'end'] as const).flatMap((type) => {
      const location = locations[type]
      if (!location) return []
      return [new maps.Marker({ map,
        position: new maps.LatLng(location.latitude, location.longitude),
        title: `${type === 'start' ? '출발' : '도착'}: ${location.address}`,
      })]
    })
    return () => markers.forEach((marker) => marker.setMap(null))
  }, [maps, locations])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !currentPosition) return
    const marker = new maps.Marker({ map,
      position: new maps.LatLng(currentPosition.latitude, currentPosition.longitude),
      image: new maps.MarkerImage(currentLocationIcon, new maps.Size(36, 36), { offset: new maps.Point(18, 18) }),
      title: '현재 위치', zIndex: 3,
    })
    return () => marker.setMap(null)
  }, [maps, currentPosition])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !serviceArea) return
    const polygons = serviceArea.map((polygon) => new maps.Polygon({
      map,
      path: polygon.map((ring) => ring.map(([lng, lat]) => new maps.LatLng(lat, lng))),
      strokeWeight: 3, strokeColor: '#305787', strokeOpacity: 0.9,
      fillColor: '#5284be', fillOpacity: 0.13, zIndex: 1,
    }))
    return () => polygons.forEach((polygon) => polygon.setMap(null))
  }, [maps, serviceArea])

  useEffect(() => {
    const map = mapRef.current
    if (!maps || !map || !route) return
    const bounds = new maps.LatLngBounds()
    const paths = route.lines.length ? route.lines.map(({ level, path }) => ({ path, color: riskStyles[level].color }))
      : route.navigation ? [{ path: route.navigation.path, color: '#315981' }] : []
    if (!paths.length) return
    const lines = paths.map(({ path, color }) => {
      const points = path.map(([lng, lat]) => new maps.LatLng(lat, lng))
      points.forEach((point) => bounds.extend(point))
      return new maps.Polyline({ map, path: points, strokeWeight: 6,
        strokeColor: color, strokeOpacity: 0.95, zIndex: 2 })
    })
    map.setBounds(bounds, 32, 32, 32, 32)
    return () => lines.forEach((line) => line.setMap(null))
  }, [maps, route])

  function fitArea() {
    const map = mapRef.current
    if (!maps || !map || !serviceArea) return
    const bounds = new maps.LatLngBounds()
    for (const [outer] of serviceArea) {
      outer.forEach(([lng, lat]) => bounds.extend(new maps.LatLng(lat, lng)))
    }
    map.setBounds(bounds, 24, 24, 24, 24)
  }

  return (
    <div className="relative isolate overflow-hidden rounded-lg border-2 border-gray-300">
      <div ref={containerRef} aria-label="위치 선택 지도" className="h-[50dvh] w-full" />
      {maps && serviceArea && !searchType && (
        <button type="button" onClick={fitArea} className="absolute right-2 top-2 z-10 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#244569] shadow">
          시범 권역 보기
        </button>
      )}
      {!maps && <p role="status" className="absolute inset-0 z-10 flex items-center justify-center bg-[#EEF2E9] p-6 text-center text-sm text-[#183B36]">{error || '지도를 불러오고 있습니다…'}</p>}
      {maps && searchType && <>
        <p className="pointer-events-none absolute inset-x-3 top-3 z-10 rounded-xl bg-white/95 p-3 text-center text-sm font-semibold text-[#183B36] shadow">
          지도를 움직여 {searchType === 'start' ? '출발' : '도착'} 위치를 선택해주세요.
        </p>
        {/* 마커 끝은 지도 중심에 고정하고 지도만 움직입니다. */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-full">
          <svg width="40" height="48" viewBox="0 0 40 48" className="drop-shadow-lg">
            <path d="M20 47C16 40 2 27 2 19a18 18 0 1 1 36 0c0 8-14 21-18 28Z" fill={searchType === 'start' ? '#25A77A' : '#183B36'} stroke="white" strokeWidth="2" />
            <circle cx="20" cy="19" r="6" fill="white" />
          </svg>
        </div>
      </>}
    </div>
  )
}

export default KaKaoMap
