import { useEffect, useMemo, useRef, useState } from 'react'
import { FACILITY_DISTANCE_M, facilityTypes } from '../lib/facilities'
import type { Facility, FacilitySearch, FacilityType } from '../lib/facilities'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'

type FacilityPanel = { result: FacilitySearch | null; example: boolean; retry: () => void; visible: boolean }

type FacilityDetailsProps = {
  maps: KakaoMaps | null
  map: MapInstance | null
  panel: FacilityPanel
}

const facilityOrder = Object.keys(facilityTypes) as FacilityType[]

function FacilityGroup({ type, facilities, selected, onSelect }: {
  type: FacilityType
  facilities: Facility[]
  selected: Facility | null
  onSelect: (facility: Facility) => void
}) {
  const { icon, label } = facilityTypes[type]

  return <div className="space-y-2 border-t border-[#dbe5dc] pt-3">
    <h3 className="flex items-center gap-2 text-sm font-semibold">
      <img src={icon} alt="" className="size-5" />
      {label} {facilities.length}곳
    </h3>
    <ul className="space-y-1">
      {facilities.map((facility) => <li key={facility.id}>
        <button type="button" aria-pressed={selected?.id === facility.id}
          className="flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 rounded-lg px-2 py-2 text-left text-sm hover:bg-[#f0f5ef] aria-pressed:bg-[#e5efe8]"
          onClick={() => onSelect(facility)}>
          <span className="min-w-0 wrap-break-word">{facility.name}</span>
          {facility.distanceM !== undefined && <span className="shrink-0 text-xs text-[#426459]">
            경로에서 약 {Math.round(facility.distanceM)}m
          </span>}
        </button>
      </li>)}
    </ul>
  </div>
}

export default function FacilityDetails({ maps, map, panel }: FacilityDetailsProps) {
  const { result, example, retry } = panel
  const facilities = result?.facilities
  const [filter, setFilter] = useState<FacilityType | 'all'>('all')
  const [selection, setSelection] = useState<{ list: Facility[]; facility: Facility } | null>(null)
  const selected = selection && selection.list === facilities ? selection.facility : null
  const section = useRef<HTMLElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const groups = useMemo(() => facilityOrder.map((type) => ({
    type, facilities: facilities?.filter((facility) => facility.type === type) ?? [],
  })), [facilities])
  const visibleFacilities = filter === 'all' ? facilities : groups.find(({ type }) => type === filter)?.facilities

  useEffect(() => {
    if (!maps || !map || !facilities || !visibleFacilities?.length) return
    const markers = visibleFacilities.map((facility) => {
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
  }, [maps, map, facilities, visibleFacilities])

  function selectFilter(next: FacilityType | 'all') {
    if (next === filter) return
    setFilter(next)
    setSelection(null)
    list.current?.scrollTo(0, 0)
  }

  function selectFromList(facility: Facility) {
    if (!facilities) return
    setSelection({ list: facilities, facility })
    const [lng, lat] = facility.coordinate
    if (maps && map) map.setCenter(new maps.LatLng(lat, lng))
  }

  const filterClass = 'flex items-center gap-1 rounded-full border border-[#becdc3] px-2.5 py-1.5 text-xs font-semibold hover:bg-[#f0f5ef] aria-pressed:border-[#183B36] aria-pressed:bg-[#183B36] aria-pressed:text-white'

  return <section ref={section} aria-label="경로 주변 시설" className="space-y-3 rounded-xl bg-white p-4 text-[#183B36]">
    <div className="flex items-baseline justify-between gap-2">
      <h2 className="text-sm font-semibold">{example ? '개발용 예시 안전시설' : '경로 주변 시설'}</h2>
      {!example && <p className="text-xs text-[#426459]">경로에서 {FACILITY_DISTANCE_M}m 이내</p>}
    </div>
    {!!facilities?.length && <div role="group" aria-label="시설 유형 필터" className="flex flex-wrap gap-2">
      <button type="button" aria-pressed={filter === 'all'} className={filterClass} onClick={() => selectFilter('all')}>
        전체 {facilities.length}
      </button>
      {groups.map(({ type, facilities }) => <button type="button" key={type} aria-pressed={filter === type}
        className={filterClass} onClick={() => selectFilter(type)}>
        <img src={facilityTypes[type].icon} alt="" className="size-4" />
        {facilityTypes[type].label} {facilities.length}
      </button>)}
    </div>}
    {!result && <p role="status" className="text-sm">주변 시설을 찾고 있습니다…</p>}
    {result?.incomplete && <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
      <p role="status" className="text-[#9d3037]">{result.successful ? '일부 시설 정보를 확인하지 못했습니다.' : '시설 조회에 실패했습니다.'}</p>
      <button type="button" className="font-semibold underline" onClick={retry}>시설 다시 찾기</button>
    </div>}
    {result && !result.incomplete && !facilities?.length && <p role="status" className="text-sm">경로 주변에 표시할 시설이 없습니다.</p>}
    {!!facilities?.length && !visibleFacilities?.length && <p role="status" className="text-sm">선택한 유형의 시설이 없습니다.</p>}
    {selected && <div className="flex items-start justify-between gap-3 rounded-lg bg-[#EEF2E9] p-3">
      <div role="status">
        <h3 className="font-semibold">{selected.name}</h3>
        <p className="mt-1 text-sm">{facilityTypes[selected.type].label}</p>
        <p className="mt-1 text-sm">{selected.address || (example ? '예시 위치' : '주소 정보 없음')}</p>
        {selected.distanceM !== undefined && <p className="mt-1 text-xs text-[#426459]">
          경로에서 약 {Math.round(selected.distanceM)}m
        </p>}
      </div>
      <button type="button" className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold" onClick={() => setSelection(null)}>
        상세 닫기
      </button>
    </div>}
    {!!visibleFacilities?.length && <div ref={list} role="region" aria-label="시설 목록" tabIndex={0}
      className="max-h-[min(320px,40dvh)] space-y-3 overflow-y-auto rounded-sm pr-2 focus-visible:outline-2 focus-visible:outline-[#426459]">
      {groups.map(({ type, facilities }) => (filter === 'all' || filter === type) && !!facilities.length &&
        <FacilityGroup key={type} type={type} facilities={facilities} selected={selected} onSelect={selectFromList} />)}
    </div>}
  </section>
}

export type { FacilityPanel }
