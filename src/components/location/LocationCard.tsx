// 역할: 출발·도착 선택 버튼과 확정 주소를 표시합니다.
import type { LocationType, SelectedLocations } from '../../types/location'

type LocationCardProps = {
  searchType: LocationType | null
  locations: SelectedLocations
  onSelect: (type: LocationType) => void
}

function LocationCard({ searchType, locations, onSelect }: LocationCardProps) {
  return (
    <section aria-label="출발지와 도착지" className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="space-y-2">
        {(['start', 'end'] as const).map((type) => {
          const location = locations[type]
          return (
            <button key={type} type="button" aria-pressed={searchType === type}
              onClick={() => onSelect(type)}
              className={`flex min-h-12 w-full items-center rounded-xl border-2 px-3 py-2 text-left ${searchType === type ? 'border-[#25A77A] bg-[#EDF8F2]' : 'border-transparent bg-[#F4F7F2]'}`}>
              <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${type === 'start' ? 'bg-[#167553]' : 'bg-[#305787]'}`} />
              <span className="ml-2.5 w-14 shrink-0 text-sm font-semibold text-[#183B36]">{type === 'start' ? '출발지' : '도착지'}</span>
              <span className={`min-w-0 wrap-break-word text-sm ${location ? 'font-medium text-[#183B36]' : 'text-[#426459]'}`}>
                {location?.name || location?.address || '주소 또는 장소 선택'}
                {location?.name && location.name !== location.address && <span className="mt-0.5 block text-xs text-[#426459]">{location.address}</span>}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default LocationCard
