import { useEffect, useRef, useState } from 'react'
import { FACILITY_DISTANCE_M, facilityTypes } from '../lib/facilities'
import type { Facility, FacilitySearch } from '../lib/facilities'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'

type FacilityPanel = { result: FacilitySearch | null; example: boolean; retry: () => void; visible: boolean }

type FacilityDetailsProps = {
  maps: KakaoMaps | null
  map: MapInstance | null
  panel: FacilityPanel
}

export default function FacilityDetails({ maps, map, panel }: FacilityDetailsProps) {
  const { result, example, retry } = panel
  const facilities = result?.facilities
  const [selection, setSelection] = useState<{ list: Facility[]; facility: Facility } | null>(null)
  const selected = selection?.list === facilities ? selection?.facility : null
  const section = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!maps || !map) return
    if (!facilities?.length) return
    const markers = facilities.map((facility) => {
      const { icon } = facilityTypes[facility.type]
      const [longitude, latitude] = facility.coordinate
      const marker = new maps.Marker({ map, title: facility.name, zIndex: 2, clickable: true,
        position: new maps.LatLng(latitude, longitude),
        image: new maps.MarkerImage(icon, new maps.Size(34, 34), { offset: new maps.Point(17, 17) }),
      })
      const select = () => {
        setSelection({ list: facilities, facility })
        section.current?.scrollIntoView({ block: 'nearest' })
      }
      maps.event.addListener(marker, 'click', select)
      return { marker, select }
    })
    return () => markers.forEach(({ marker, select }) => {
      maps.event.removeListener(marker, 'click', select)
      marker.setMap(null)
    })
  }, [maps, map, facilities])

  return <section ref={section} aria-label="경로 주변 시설" className="space-y-3 rounded-xl bg-white p-4 text-[#183B36]">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold">{example ? '개발용 예시 안전시설' : '경로 주변 시설'}</h2>
      {!example && <p className="text-xs text-[#426459]">경로에서 {FACILITY_DISTANCE_M}m 이내</p>}
    </div>
    {!result && <p role="status" className="text-sm">주변 시설을 찾고 있습니다…</p>}
    {result?.incomplete && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <p role="status" className="text-[#9d3037]">{result.successful ? '일부 시설 정보를 확인하지 못했습니다.' : '시설 조회에 실패했습니다.'}</p>
      <button type="button" className="font-semibold underline" onClick={retry}>시설 다시 찾기</button>
    </div>}
    {result && !result.incomplete && !facilities?.length && <p role="status" className="text-sm">경로 주변에 표시할 시설이 없습니다.</p>}
    {selected && <div className="flex items-start justify-between gap-3 rounded-lg bg-[#EEF2E9] p-3">
      <div role="status">
        <h3 className="font-semibold">{selected.name}</h3>
        <p className="mt-1 text-sm">{facilityTypes[selected.type].label}</p>
        <p className="mt-1 text-sm">{selected.address || (example ? '예시 위치' : '주소 정보 없음')}</p>
      </div>
      <button type="button" className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold" onClick={() => setSelection(null)}>
        상세 닫기
      </button>
    </div>}
    {!!facilities?.length && <ul className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
      {facilities.map((facility) => <li key={facility.id}>
        <button type="button" aria-pressed={selected?.id === facility.id}
          className="flex items-center gap-1 rounded-lg border border-[#becdc3] px-2 py-1 text-sm aria-pressed:bg-[#e5efe8]"
          onClick={() => {
            setSelection({ list: facilities, facility })
            const [lng, lat] = facility.coordinate
            if (maps && map) map.setCenter(new maps.LatLng(lat, lng))
          }}>
          <img aria-hidden="true" src={facilityTypes[facility.type].icon} alt="" className="size-6" />
          {facility.name}
        </button>
      </li>)}
    </ul>}
  </section>
}

export type { FacilityPanel }
