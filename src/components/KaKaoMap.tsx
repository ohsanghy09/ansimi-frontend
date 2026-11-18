// 역할: 카카오 지도를 표시하고 검색에서 선택한 좌표로 이동합니다.
import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps } from '../lib/kakaoMaps'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'
import type { Location } from '../types/location'

type KaKaoMapProps = {
  target?: Location | null
  onReady?: (maps: KakaoMaps) => void
}

function KaKaoMap({ target, onReady }: KaKaoMapProps) {
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
        center: new sdk.LatLng(37.5665, 126.978), level: 2,
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
  }, [])

  useEffect(() => {
    if (maps) onReady?.(maps)
  }, [maps, onReady])

  // 같은 좌표라도 새로운 검색 결과 객체를 전달하면 다시 이동합니다.
  useEffect(() => {
    if (!maps || !target) return
    mapRef.current?.setCenter(new maps.LatLng(target.latitude, target.longitude))
  }, [maps, target])

  return (
    <div className="relative overflow-hidden rounded-lg border-2 border-gray-300">
      <div ref={containerRef} aria-label="위치 선택 지도" className="h-[50dvh] w-full" />
      {!maps && <p role="status" className="absolute inset-0 flex items-center justify-center bg-[#EEF2E9] p-6 text-center text-sm text-[#183B36]">{error || '지도를 불러오고 있습니다…'}</p>}
    </div>
  )
}

export default KaKaoMap
