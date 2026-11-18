// 역할: 주소·장소 검색 입력창과 검색 결과 목록을 표시합니다.
import { useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import type { LocationType } from '../../types/location'

// 부모가 전달하는 선택 대상과 검색 함수입니다.
type LocationSearchProps = {
  searchType: LocationType
  onSearch?: (query: string) => void
}



function LocationSearch(props: LocationSearchProps) {
  const searchType = props.searchType
  const onSearch = props.onSearch

  // 입력한 검색어와 입력창 아래의 안내 문구를 관리합니다.
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('주소 또는 장소 이름을 입력해주세요.')

  let label = '도착지'
  if (searchType === 'start') {
    label = '출발지'
  }

  // 입력값이 바뀔 때 상태와 안내 문구를 갱신합니다.
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value)
    setMessage('주소 또는 장소 이름을 입력한 뒤 검색해주세요.')
  }

  // 검색 버튼과 Enter 키 모두 이 함수를 실행합니다.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    // 폼 제출로 페이지가 이동하거나 새로고침되는 것을 막습니다.
    event.preventDefault()

    const keyword = query.trim()

    if (keyword === '') {
      setMessage('주소 또는 장소 이름을 입력해주세요.')
      return
    }

    if (onSearch === undefined) {
      setMessage('검색 기능은 준비 중입니다.')
      return
    }

    // 실제 검색은 부모가 전달한 함수에서 처리합니다.
    setMessage('')
    onSearch(keyword)
  }




  return (
    <section
      aria-label={`${label} 주소 및 장소 검색`}
      className="w-full rounded-2xl bg-white p-4 text-[#183B36] shadow-sm"
    >
      <form onSubmit={handleSubmit} className="flex gap-2">
        {/* 제목과 입력창: 검색 버튼을 제외한 남은 너비를 채웁니다. */}
        <label className="min-w-0 flex-1">
          <span className="mb-2 block text-sm font-semibold">
            {label} 주소·장소 검색
          </span>

          {/* query를 표시하고, 선택 시 초록색 외곽선을 보여줍니다. */}
          <input
            type="search"
            value={query}
            onChange={handleChange}
            placeholder="예: 서울 중구 세종대로 110, 서울역"
            maxLength={100}
            className="min-h-12 w-full rounded-xl border border-[#CEDAD0] px-3 text-sm focus:outline-2 focus:outline-[#25A77A]"
          />
        </label>

        {/* submit 버튼을 누르면 form의 handleSubmit이 실행됩니다. */}
        <button
          type="submit"
          className="min-h-12 shrink-0 self-end rounded-xl bg-[#183B36] px-4 text-sm font-semibold text-white"
        >
          검색
        </button>
      </form>

      {/* 안내 문구가 바뀌면 스크린 리더에도 알립니다. */}
      <p role="status" className="mt-2 text-sm text-[#55786A]">
        {message}
      </p>
    </section>
  )
}

export default LocationSearch
