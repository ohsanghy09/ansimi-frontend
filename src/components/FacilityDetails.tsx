import { useEffect } from 'react'
import { facilityTypes } from '../lib/facilities'
import type { Facility } from '../lib/facilities'
import type { KakaoMaps, MapInstance } from '../lib/kakaoMaps'

type FacilityDetailsProps = {
  facilities: Facility[]
  maps: KakaoMaps | null
  map: MapInstance | null
  selected: Facility | null
  onSelect: (facility: Facility | null) => void
}

export default function FacilityDetails({ facilities, maps, map, selected, onSelect }: FacilityDetailsProps) {
  useEffect(() => {
    if (!maps || !map) return
    const markers = facilities.map((facility) => {
      const { icon } = facilityTypes[facility.type]
      const [longitude, latitude] = facility.coordinate
      const marker = new maps.Marker({ map, title: facility.name, zIndex: 2,
        position: new maps.LatLng(latitude, longitude),
        image: new maps.MarkerImage(icon, new maps.Size(34, 34), { offset: new maps.Point(17, 17) }),
      })
      const select = () => onSelect(facility)
      maps.event.addListener(marker, 'click', select)
      return { marker, select }
    })
    return () => markers.forEach(({ marker, select }) => {
      maps.event.removeListener(marker, 'click', select)
      marker.setMap(null)
    })
  }, [maps, map, facilities, onSelect])

  return <section aria-label="안전시설" className="mt-4 space-y-3 rounded-xl bg-white p-4 text-[#183B36]">
    <h2 className="text-sm font-semibold">개발용 예시 안전시설</h2>
    <ul className="flex flex-wrap gap-2">
      {facilities.map((facility) => <li key={facility.id}>
        <button type="button" aria-pressed={selected?.id === facility.id}
          className="flex items-center gap-1 rounded-lg border border-[#becdc3] px-2 py-1 text-sm aria-pressed:bg-[#e5efe8]"
          onClick={() => onSelect(facility)}>
          <img aria-hidden="true" src={facilityTypes[facility.type].icon} alt="" className="size-6" />
          {facility.name}
        </button>
      </li>)}
    </ul>
    {selected && <div className="flex items-start justify-between gap-3 rounded-lg bg-[#EEF2E9] p-3">
      <div role="status">
        <h3 className="font-semibold">{selected.name}</h3>
        <p className="mt-1 text-sm">{facilityTypes[selected.type].label} · 예시 위치</p>
      </div>
      <button type="button" className="shrink-0 rounded-lg bg-white px-3 py-2 text-sm font-semibold" onClick={() => onSelect(null)}>
        상세 닫기
      </button>
    </div>}
  </section>
}
