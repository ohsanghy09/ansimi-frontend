// 역할: 여러 컴포넌트에서 공통으로 사용하는 위치 데이터 타입을 정의합니다.

// 현재 선택하거나 설정할 위치가 출발지인지 도착지인지 구분합니다.
export type LocationType = 'start' | 'end'

// 지도에서 확인 중인 후보 위치와 확정된 위치에 공통으로 사용합니다.
export type Location = {
  latitude: number // 위도
  longitude: number // 경도
  address: string // 도로명주소 또는 지번주소
  name?: string // 검색에서 선택한 장소 이름
}

// 주소·장소 검색 결과는 위치 정보에 표시할 이름을 추가합니다.
export type SearchResult = Location & {
  name: string // 장소 이름 또는 주소
}

// 출발지와 도착지의 확정 위치를 관리합니다. 선택 전에는 null입니다.
export type SelectedLocations = Record<LocationType, Location | null>
