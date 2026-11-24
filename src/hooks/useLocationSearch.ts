// 역할: 카카오 주소·장소 검색 로직과 검색 결과, 검색 중 상태, 안내 메시지를 관리합니다.
import { useEffect, useRef, useState } from 'react'
import type { KakaoMaps, SearchCallback } from '../lib/kakaoMaps'
import type { SearchResult } from '../types/location'

type SearchUpdate = { results: SearchResult[]; searching: boolean; message: string }
type SearchSource = 'place' | 'address'

const idle: SearchUpdate = { results: [], searching: false, message: '' }

function normalizeKeyword(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/\s+/g, '')
}

export function searchLocationCandidates(maps: KakaoMaps, keyword: string, signal: AbortSignal, publish: (update: SearchUpdate) => void) {
  if (signal.aborted) return
  const pending = new Set<SearchSource>(['place', 'address'])
  const received: Record<SearchSource, SearchResult[]> = { place: [], address: [] }
  const normalizedKeyword = normalizeKeyword(keyword)
  let failed = false
  let finished = false
  const timeout = window.setTimeout(() => report(true), 10000)
  const cancel = () => window.clearTimeout(timeout)
  signal.addEventListener('abort', cancel, { once: true })

  function report(timedOut = false) {
    const searching = !timedOut && pending.size > 0
    if (!searching) {
      finished = true
      window.clearTimeout(timeout)
      signal.removeEventListener('abort', cancel)
    }
    // Exactly matching names or addresses come first. Matching place results retain their names.
    const ordered = [...received.place, ...received.address].map((result) => ({
      result,
      exact: normalizeKeyword(result.name) === normalizedKeyword || normalizeKeyword(result.address) === normalizedKeyword,
    })).sort((a, b) => Number(b.exact) - Number(a.exact))
    const seen = new Set<string>()
    const results = ordered.flatMap(({ result }) => {
      const key = `${result.latitude},${result.longitude}`
      if (seen.has(key)) return []
      seen.add(key)
      return [result]
    })
    let message: string
    if (searching) message = results.length ? `${results.length}개 결과 · 추가 결과를 찾는 중…` : '검색하고 있습니다…'
    else if (results.length) {
      message = `${results.length}개 결과 · 위치를 선택해주세요.`
      if (timedOut || failed) message += ' 일부 결과를 불러오지 못했습니다.'
    } else if (timedOut) message = '검색 시간이 초과되었습니다. 다시 검색해주세요.'
    else if (failed) message = '검색 결과를 불러오지 못했습니다. 다시 검색해주세요.'
    else message = '검색 결과가 없습니다. 다른 주소나 장소 이름을 입력해주세요.'
    publish({ results, searching, message })
  }

  function receive(source: SearchSource): SearchCallback {
    return (documents, status) => {
      if (signal.aborted || finished || !pending.delete(source)) return
      if (status === maps.services.Status.OK) {
        for (const document of documents) {
          const latitude = Number(document.y)
          const longitude = Number(document.x)
          const address = document.road_address_name || document.address_name
          if (!document.x.trim() || !document.y.trim() || !(Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) || !address) continue
          received[source].push({ latitude, longitude, address, name: document.place_name || address })
        }
      } else if (status !== maps.services.Status.ZERO_RESULT) failed = true
      report()
    }
  }

  const receiveAddress = receive('address')
  const receivePlace = receive('place')
  try { new maps.services.Geocoder().addressSearch(keyword, receiveAddress, { size: 5 }) }
  catch { receiveAddress([], 'ERROR') }
  try { new maps.services.Places().keywordSearch(keyword, receivePlace, { size: 5 }) }
  catch { receivePlace([], 'ERROR') }
}

export function useLocationSearch(maps: KakaoMaps | null) {
  const [update, setUpdate] = useState(idle)
  const request = useRef<AbortController | null>(null)

  useEffect(() => () => request.current?.abort(), [])

  function resetSearch() {
    request.current?.abort()
    setUpdate(idle)
  }

  function search(query: string) {
    request.current?.abort()
    const keyword = query.trim()
    if (!keyword || !maps) {
      setUpdate({ ...idle, message: !keyword ? '주소 또는 장소 이름을 입력해주세요.' : '지도를 불러온 뒤 검색해주세요.' })
      return
    }
    const controller = new AbortController()
    request.current = controller
    setUpdate({ results: [], searching: true, message: '검색하고 있습니다…' })
    searchLocationCandidates(maps, keyword, controller.signal, setUpdate)
  }

  return { ...update, search, resetSearch }
}
