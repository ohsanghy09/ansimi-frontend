// 역할: 지도와 검색이 함께 사용하는 카카오 SDK 타입과 로딩을 관리합니다.
type SearchDocument = {
  x: string
  y: string
  address_name: string
  road_address_name?: string
  place_name?: string
}
export type SearchCallback = (results: SearchDocument[], status: string) => void
type SearchService = {
  addressSearch(query: string, callback: SearchCallback, options: { size: number }): void
  coord2Address(longitude: number, latitude: number, callback: (results: {
    address?: { address_name: string }
    road_address?: { address_name: string }
  }[], status: string) => void): void
}
type LatLng = { getLat(): number; getLng(): number }
export type MapInstance = { getCenter(): LatLng; setCenter(position: LatLng): void }
export type KakaoMaps = {
  load(callback: () => void): void
  LatLng: new (latitude: number, longitude: number) => LatLng
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => MapInstance
  Marker: new (options: { map: MapInstance; position: LatLng; title: string }) => { setMap(map: MapInstance | null): void }
  event: {
    addListener(map: MapInstance, name: string, callback: () => void): void
    removeListener(map: MapInstance, name: string, callback: () => void): void
  }
  services: {
    Status: { OK: string }
    Geocoder: new () => SearchService
    Places: new () => {
      keywordSearch(query: string, callback: SearchCallback, options: { size: number }): void
    }
  }
}

let sdkPromise: Promise<KakaoMaps> | undefined

export function loadKakaoMaps(): Promise<KakaoMaps> {
  if (sdkPromise) return sdkPromise
  sdkPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const key = import.meta.env.VITE_KAKAO_MAP_KEY?.trim()
    if (!key) {
      reject(new Error('VITE_KAKAO_MAP_KEY를 설정한 뒤 개발 서버를 다시 시작해주세요.'))
      return
    }
    const script = document.createElement('script')
    const timeout = window.setTimeout(() => fail('지도 로딩 시간이 초과되었습니다. 새로고침해주세요.'), 15000)
    function fail(message: string) {
      window.clearTimeout(timeout)
      script.onload = null
      script.onerror = null
      script.remove()
      reject(new Error(message))
    }
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`
    script.onerror = () => fail('지도를 불러오지 못했습니다. 네트워크와 카카오 키 설정을 확인해주세요.')
    script.onload = () => {
      const maps = (window as Window & { kakao?: { maps: KakaoMaps } }).kakao?.maps
      if (!maps) { fail('카카오 SDK를 사용할 수 없습니다.'); return }
      maps.load(() => {
        if (!maps.services?.Geocoder || !maps.services?.Places) {
          fail('주소·장소 검색 기능을 불러오지 못했습니다. 새로고침해주세요.')
          return
        }
        window.clearTimeout(timeout)
        resolve(maps)
      })
    }
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    sdkPromise = undefined
    throw error
  })
  return sdkPromise
}
