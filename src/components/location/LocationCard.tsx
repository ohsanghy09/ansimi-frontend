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
      <h1 className="text-xl font-bold text-[#183B36]">안심이</h1>
      <div className="mt-4 space-y-2">
        {(['start', 'end'] as const).map((type) => (
          <button key={type} type="button" aria-pressed={searchType === type}
            onClick={() => onSelect(type)}
            className={`flex min-h-12 w-full items-center rounded-xl border-2 px-3 py-2 text-left ${searchType === type ? 'border-[#25A77A] bg-[#EDF8F2]' : 'border-transparent bg-[#F4F7F2]'}`}>
            <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${type === 'start' ? 'bg-[#25A77A]' : 'bg-[#183B36]'}`} />
            <span className="ml-2.5 w-11 shrink-0 text-[11px] text-[#7A8D81]">{type === 'start' ? '출발' : '도착'}</span>
            <span className={`min-w-0 break-words text-sm ${locations[type] ? 'font-medium text-black' : 'text-[#86998C]'}`}>
              {locations[type]?.address ?? '장소 또는 주소 검색'}
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default LocationCard
