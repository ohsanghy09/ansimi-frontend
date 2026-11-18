// 역할: 주소·장소 검색 입력창과 검색 결과 목록을 표시합니다.
import { useState } from 'react'
import type { FormEvent } from 'react'
import type { LocationType, SearchResult } from '../../types/location'

type LocationSearchProps = {
  searchType: LocationType
  results: SearchResult[]
  searching: boolean
  message: string
  ready: boolean
  onSearch: (query: string) => void
  onQueryChange: () => void
  onSelectResult: (result: SearchResult) => void
}

function LocationSearch(props: LocationSearchProps) {
  const [query, setQuery] = useState('')
  const label = props.searchType === 'start' ? '출발지' : '도착지'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    props.onSearch(query)
  }

  function selectResult(result: SearchResult) {
    setQuery(result.name)
    props.onSelectResult(result)
  }

  return (
    <section aria-label={`${label} 주소 및 장소 검색`} className="w-full rounded-2xl bg-white p-4 text-[#183B36] shadow-sm">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <label className="min-w-0 flex-1">
          <span className="mb-2 block text-sm font-semibold">{label} 주소·장소 검색</span>
          <input type="search" value={query}
            onChange={(event) => { setQuery(event.target.value); props.onQueryChange() }}
            placeholder="예: 서울 중구 세종대로 110, 서울역" maxLength={100}
            className="min-h-12 w-full rounded-xl border border-[#CEDAD0] px-3 text-sm focus:outline-2 focus:outline-[#25A77A]" />
        </label>
        <button type="submit" disabled={!props.ready || props.searching}
          className="min-h-12 shrink-0 self-end rounded-xl bg-[#183B36] px-4 text-sm font-semibold text-white disabled:opacity-40">
          {props.searching ? '검색 중' : '검색'}
        </button>
      </form>
      <p role="status" className="mt-2 text-sm text-[#55786A]">
        {props.message || (props.ready ? '주소 또는 장소 이름을 입력한 뒤 검색해주세요.' : '지도 로딩이 완료되면 검색할 수 있습니다.')}
      </p>
      {props.results.length > 0 && (
        <ul aria-label="검색 결과" className="mt-2 max-h-52 divide-y divide-[#E0E8DD] overflow-y-auto">
          {props.results.map((result) => (
            <li key={`${result.latitude},${result.longitude}`}>
              <button type="button" onClick={() => selectResult(result)} className="min-h-16 w-full rounded-lg p-3 text-left hover:bg-[#F4F7F2]">
                <span className="block text-sm font-semibold">{result.name}</span>
                <span className="mt-1 block text-xs text-[#55786A]">{result.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default LocationSearch
