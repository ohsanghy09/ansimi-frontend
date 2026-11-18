// 역할: 전체 위치 선택 상태를 관리하고 LocationCard, LocationSearch, KaKaoMap, LocationConfirm을 연결합니다.
import LocationCard from "../components/location/LocationCard"
import KaKaoMap from "../components/KaKaoMap"
import { useState } from 'react'
import LocationSearch from '../components/location/LocationSearch'
import LocationConfirm from '../components/location/LocationConfirm'
import type { Location, LocationType, SearchResult, SelectedLocations } from '../types/location'
import type { KakaoMaps } from '../lib/kakaoMaps'
import { useLocationSearch } from '../hooks/useLocationSearch'




function MainPage () {
    // 여러 컴포넌트가 공유하는 선택 상태는 부모 페이지에서 관리합니다.
    const [searchType, setSearchType] = useState<LocationType | null>(null)
    const [locations, setLocations] = useState<SelectedLocations>({ start: null, end: null })
    const [candidate, setCandidate] = useState<Location | null>(null)
    const [maps, setMaps] = useState<KakaoMaps | null>(null)
    const [mapTarget, setMapTarget] = useState<Location | null>(null)
    const { results, searching, message, search, resetSearch } = useLocationSearch(maps)

    function cancelSelection() {
        resetSearch()
        setMapTarget(null)
        setSearchType(null)
        setCandidate(null)
    }

    function selectLocation(type: LocationType) {
        if (searchType === type) {
            cancelSelection()
            return
        }
        // 확정 주소는 유지하고 새 후보는 다음 단계에서 지도와 연결합니다.
        setCandidate(null)
        resetSearch()
        setMapTarget(locations[type])
        setSearchType(type)
    }

    function selectSearchResult(result: SearchResult) {
        if (!searchType) return
        resetSearch()
        setCandidate(null)
        setMapTarget({ ...result })
    }

    function confirmLocation() {
        if (!searchType || !candidate) return
        setLocations((previous) => ({ ...previous, [searchType]: candidate }))
        cancelSelection()
    }

    return (

        // `메인 태그` 요소의 최소 높이를 화면 높이와 맞춰야함. min-h-screen
        <main className='min-h-screen bg-[#EEF2E9] p-8'>
            

            <header className="mb-6">

                {/* tracking-widest는 글자 간격 넓히기 */}
                <p className="text-xs font-medium tracking-widest text-[#55786A]">
                    당신의 일상에 안심을
                </p>

                {/* leading-snug는 줄 간격 좁힘 */}
                <h1 className="mt-2 text-2xl font-semibold leading-snug text-[#183B36]">
                    오늘의 귀갓길, <br />
                    어디로 향하시나요?
                </h1>
            </header>


            {/* 화면 상단 카드 컴포넌트*/}
            <LocationCard searchType={searchType} locations={locations} onSelect={selectLocation} />

            {searchType && (
                <div className="mt-6">
                    {/* 선택 대상 변경 시 입력 상태도 초기화합니다. */}
                    <LocationSearch key={searchType} searchType={searchType}
                        results={results} searching={searching} message={message} ready={!!maps}
                        onSearch={search} onQueryChange={resetSearch} onSelectResult={selectSearchResult} />
                </div>
            )}

            {/* 카카오맵 컴포넌트*/}
            <div className="mt-6">
                <KaKaoMap target={mapTarget} onReady={setMaps} />
            </div>

            {searchType && (
                <div className="mt-6">
                    <LocationConfirm
                        searchType={searchType}
                        candidate={candidate}
                        message="지도에서 선택 위치를 확인해주세요. 주소 조회 및 위치 확정 연결은 준비 중입니다."
                        onCancel={cancelSelection}
                        onConfirm={confirmLocation}
                    />
                </div>
            )}

            {/* 우측 하단 문구 */}
            <footer className="mt-6 text-right">
                <p className="text-sm font-medium tracking-wide text-[#55786A]">
                    집으로 향하는 길, 마음은 가볍게.
                </p>
            </footer>
        </main>


        
    )

}

export default MainPage
