// 역할: 지도와 검색이 함께 사용하는 카카오 SDK 타입과 로딩을 관리합니다.
type SearchDocument = {
  x: string
  y: string
  address_name: string
  road_address_name?: string
  place_name?: string
}
export type SearchCallback = (results: SearchDocument[], status: string) => void
export type PlaceDocument = SearchDocument & { id: string; place_name: string }
type PlacePagination = { hasNextPage: boolean; totalCount: number }
type SearchService = {
  addressSearch(query: string, callback: SearchCallback, options: { size: number }): void
  coord2Address(longitude: number, latitude: number, callback: (results: {
    address?: { address_name: string }
    road_address?: { address_name: string }
  }[], status: string) => void): void
}
type LatLng = { getLat(): number; getLng(): number }
type Bounds = { extend(position: LatLng): void }
export type MapInstance = {
  getCenter(): LatLng
  setCenter(position: LatLng): void
  setBounds(bounds: Bounds, top?: number, right?: number, bottom?: number, left?: number): void
}
type ShapeOptions = {
  map: MapInstance
  strokeWeight: number
  strokeColor: string
  strokeOpacity: number
  zIndex: number
}
type Overlay = { setMap(map: MapInstance | null): void }
export type KakaoMaps = {
  load(callback: () => void): void
  LatLng: new (latitude: number, longitude: number) => LatLng
  LatLngBounds: new () => Bounds
  Size: new (width: number, height: number) => object
  Point: new (x: number, y: number) => object
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => MapInstance
  MarkerImage: new (src: string, size: object, options: { offset: object }) => object
  Marker: new (options: { map: MapInstance; position: LatLng; title: string; image?: object; zIndex?: number; clickable?: boolean }) => Overlay
  CustomOverlay: new (options: { map: MapInstance; position: LatLng; content: HTMLElement; xAnchor: number; yAnchor: number; zIndex: number }) => Overlay
  Polygon: new (options: ShapeOptions & { path: LatLng[][]; fillColor: string; fillOpacity: number }) => Overlay
  Polyline: new (options: ShapeOptions & { path: LatLng[] }) => Overlay
  event: {
    addListener(target: MapInstance | Overlay, name: string, callback: () => void): void
    removeListener(target: MapInstance | Overlay, name: string, callback: () => void): void
  }
  services: {
    Status: { OK: string; ZERO_RESULT: string }
    Geocoder: new () => SearchService
    Places: new () => {
      keywordSearch(query: string, callback: SearchCallback, options: { size: number }): void
      categorySearch(code: string, callback: (results: PlaceDocument[], status: string, pagination?: PlacePagination) => void,
        options: { location: LatLng; radius: number; size: number; page: number; sort: 'distance' }): void
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
