// 역할: 카카오 주소·장소 검색 로직과 검색 결과, 검색 중 상태, 안내 메시지를 관리합니다.
import { useEffect, useRef, useState } from 'react'
import type { KakaoMaps, SearchCallback } from '../lib/kakaoMaps'
import type { SearchResult } from '../types/location'

export function useLocationSearch(maps: KakaoMaps | null) {
  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [message, setMessage] = useState('')
  const requestRef = useRef(0)
  const timerRef = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    requestRef.current += 1
    window.clearTimeout(timerRef.current)
  }, [])

  function resetSearch() {
    requestRef.current += 1
    window.clearTimeout(timerRef.current)
    setResults([])
    setSearching(false)
    setMessage('')
  }

  function search(query: string) {
    resetSearch()
    const keyword = query.trim()
    if (!keyword) { setMessage('주소 또는 장소 이름을 입력해주세요.'); return }
    if (!maps) { setMessage('지도를 불러온 뒤 검색해주세요.'); return }
    const id = requestRef.current
    const combined: SearchResult[] = []
    let remaining = 2
    let failed = false
    setSearching(true)
    setMessage('검색하고 있습니다…')
    timerRef.current = window.setTimeout(() => {
      if (id !== requestRef.current) return
      requestRef.current += 1
      setSearching(false)
      setMessage('검색 시간이 초과되었습니다. 다시 검색해주세요.')
    }, 10000)

    const receive: SearchCallback = (documents, status) => {
      if (id !== requestRef.current) return
      if (status === maps.services.Status.OK) {
        for (const document of documents) {
          const latitude = Number(document.y)
          const longitude = Number(document.x)
          const address = document.road_address_name || document.address_name
          if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !address) continue
          if (combined.some((item) => item.latitude === latitude && item.longitude === longitude)) continue
          combined.push({ latitude, longitude, address, name: document.place_name || address })
        }
      } else if (status !== 'ZERO_RESULT') failed = true
      remaining -= 1
      if (remaining > 0) return
      window.clearTimeout(timerRef.current)
      setSearching(false)
      setResults(combined)
      setMessage(combined.length
        ? `${combined.length}개 결과입니다. 위치를 선택한 뒤 지도에서 확인해주세요.${failed ? ' 일부 검색에 실패했습니다.' : ''}`
        : failed ? '검색하지 못했습니다. 네트워크와 카카오 API 설정을 확인해주세요.'
          : '검색 결과가 없습니다. 다른 주소나 장소 이름으로 검색해주세요.')
    }
    // 한쪽 요청에서 예외가 발생해도 다른 쪽 검색 결과를 사용할 수 있습니다.
    try { new maps.services.Geocoder().addressSearch(keyword, receive, { size: 5 }) }
    catch { receive([], 'ERROR') }
    try { new maps.services.Places().keywordSearch(keyword, receive, { size: 5 }) }
    catch { receive([], 'ERROR') }
  }

  return { results, searching, message, search, resetSearch }
}
