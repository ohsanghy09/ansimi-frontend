import { useState } from 'react'

function ExampleComponent() {
  // 출발·도착 선택 상태. 같은 버튼을 다시 누르면 선택을 해제합니다.
  const [searchType, setSearchType] = useState<'start' | 'end' | null>(null)

  return (
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
  )
}

export default ExampleComponent
