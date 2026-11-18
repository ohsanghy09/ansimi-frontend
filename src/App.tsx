// 역할: 앱의 화면별 라우팅을 관리합니다.
import { Route, Routes } from 'react-router'

import MainPage from './pages/MainPage'
import ExamplePage from './examples/ExamplePage'
import ExampleComponent from './examples/ExampleComponent'
import LocationCard from './components/location/LocationCard'
import KaKaoMap from './components/KaKaoMap'
import { useState } from 'react'
import type { LocationType } from './types/location'

// 독립 카드 확인 화면도 부모가 선택 상태를 관리합니다.
function LocationCardPreview() {
  const [searchType, setSearchType] = useState<LocationType | null>(null)
  return <LocationCard searchType={searchType} locations={{ start: null, end: null }}
    onSelect={(type) => setSearchType((previous) => previous === type ? null : type)} />
}






function App() {
  return (

    <main className='min-h-screen'>
      
      {/* 라우팅 화면 목록 */}
      <Routes>

        {/* 메인 화면 */}
        <Route path='/' element={<MainPage />} />

        {/* 예제 화면 */}
        <Route path='/example' element={<ExamplePage />}/>

        {/* 컴포넌트 예제 화면 */}
        <Route path='/exampleCo' element={<ExampleComponent />}/>




        {/* 출발·도착 카드 화면 */}
        <Route path='/card' element={<LocationCardPreview />} />

        {/* 카카오 맵 화면 */}
        <Route path='/map' element={<KaKaoMap />} />

      </Routes>

    </main>

  )
}

export default App
