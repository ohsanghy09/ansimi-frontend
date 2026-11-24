import { useState } from 'react'
import { useCurrentPosition } from '../hooks/useCurrentPosition'
import type { RecommendedRoute, ServiceArea } from '../lib/routes'
import type { Location, SelectedLocations } from '../types/location'
import KaKaoMap from './KaKaoMap'

type HomeGuideProps = {
  route: RecommendedRoute
  locations: SelectedLocations
  serviceArea: ServiceArea | null
  onEnd: () => void
}

export default function HomeGuide({ route, locations, serviceArea, onEnd }: HomeGuideProps) {
  const { fix, error, retry } = useCurrentPosition()
  const [target, setTarget] = useState<Location | null>(null)

  return (
    <div className="min-h-dvh bg-[#EEF2E9] text-[#183B36]">
      <div className="mx-auto w-full max-w-[480px] space-y-4 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-3 rounded-2xl bg-white p-4">
          <div>
            <h1 className="text-xl font-semibold">귀가 안내</h1>
            <p className="mt-1 text-sm text-[#426459]">{locations.end?.address}</p>
          </div>
          <button type="button" onClick={onEnd} className="shrink-0 rounded-lg bg-[#EEF2E9] px-3 py-2 text-sm font-semibold">안내 종료</button>
        </header>
        <KaKaoMap target={target} locations={locations} currentPosition={fix?.location} serviceArea={serviceArea} showPilotArea route={route} />
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold">전체 {route.distanceM.toLocaleString('ko-KR')} m · 약 {route.durationMin}분</p>
          {error ? <div className="mt-2 space-y-2">
            <p role="alert" className="text-sm text-[#9d3037]">{error}</p>
            <button type="button" className="text-sm font-semibold underline" onClick={retry}>위치 다시 확인</button>
          </div> : !fix && <p role="status" className="mt-2 text-sm">현재 위치를 확인하고 있습니다…</p>}
          {fix && !error && <button type="button" className="mt-3 rounded-lg bg-[#EEF2E9] px-3 py-2 text-sm font-semibold"
            onClick={() => setTarget({ ...fix.location })}>현재 위치로 이동</button>}
        </div>
      </div>
    </div>
  )
}
