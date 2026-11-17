import { useState } from 'react'

type SearchType = 'start' | 'end'

// 출발지와 도착지가 같은 검색 UI를 사용하고 제목만 바뀝니다.
function LocationSearch({ searchType }: { searchType: SearchType }) {
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('주소 또는 장소 이름을 입력해주세요.')
  const label = searchType === 'start' ? '출발지' : '도착지'

  return (
    <section
      aria-label={`${label} 주소 및 장소 검색`}
      className="w-full rounded-2xl bg-white p-4 text-[#183B36] shadow-sm"
    >
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          setMessage(query.trim()
            ? '검색 UI 예제입니다. 실제 주소·장소 검색 기능은 아직 연결하지 않았습니다.'
            : '주소 또는 장소 이름을 입력해주세요.')
        }}
      >
        <label className="min-w-0 flex-1">
          <span className="mb-2 block text-sm font-semibold">{label} 주소·장소 검색</span>
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setMessage('주소 또는 장소 이름을 입력한 뒤 검색해주세요.')
            }}
            placeholder="예: 서울 중구 세종대로 110, 서울역"
            maxLength={100}
            className="min-h-12 w-full rounded-xl border border-[#CEDAD0] px-3 text-sm focus:outline-2 focus:outline-[#25A77A]"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 shrink-0 self-end rounded-xl bg-[#183B36] px-4 text-sm font-semibold text-white"
        >
          검색
        </button>
      </form>
      <p role="status" className="mt-2 text-sm text-[#55786A]">{message}</p>
    </section>
  )
}

function ExampleComponent() {
  // 출발·도착 선택 상태. 같은 버튼을 다시 누르면 선택을 해제합니다.
  const [searchType, setSearchType] = useState<SearchType | null>(null)

  return (
    <div className="space-y-4">
    <section className="rounded-2xl bg-white p-4 shadow-sm">
      <h1 className="text-xl font-bold text-[#183B36]">안심이</h1>

      <div className="mt-4 space-y-2">
        {/* 선택 상태에 따라 테두리와 배경색만 변경합니다. */}
        <button
          type="button"

          onClick={() => setSearchType(searchType === 'start' ? null : 'start')}

          // 공통 스타일과 조건부 스타일이 있는 건 해당 구조로 사용 {`공통 스타일 ${조건부 스타일}`}
          className={`flex h-12 w-full items-center rounded-xl border-2 px-3 text-left ${
            searchType === 'start'
              ? 'border-[#25A77A] bg-[#EDF8F2]'
              : 'border-transparent bg-[#F4F7F2]'
          }`}
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#25A77A]" />
          <span className="ml-2.5 w-11 text-[11px] text-[#7A8D81]">출발</span>
          <span className="text-sm text-[#86998C]">장소 또는 주소 검색</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchType(searchType === 'end' ? null : 'end')}
          className={`flex h-12 w-full items-center rounded-xl border-2 px-3 text-left ${
            searchType === 'end'
              ? 'border-[#25A77A] bg-[#EDF8F2]'
              : 'border-transparent bg-[#F4F7F2]'
          }`}
        >
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#183B36]" />
          <span className="ml-2.5 w-11 text-[11px] text-[#7A8D81]">도착</span>
          <span className="text-sm text-[#86998C]">장소 또는 주소 검색</span>
        </button>
      </div>
    </section>
    {/* 선택 대상 변경 시 검색어를 초기화하고, 선택 해제 시 검색창을 숨깁니다. */}
    {searchType && <LocationSearch key={searchType} searchType={searchType} />}
    </div>
  )
}

export default ExampleComponent
