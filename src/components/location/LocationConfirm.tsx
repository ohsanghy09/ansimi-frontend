// 역할: 선택 중인 후보 주소와 취소·확정 버튼을 표시합니다.
import type { Location, LocationType } from '../../types/location'

type LocationConfirmProps = {
  searchType: LocationType
  candidate: Location | null
  message: string
  onCancel: () => void
  onConfirm: () => void
}

function LocationConfirm({ searchType, candidate, message, onCancel, onConfirm }: LocationConfirmProps) {
  const label = searchType === 'start' ? '출발지' : '도착지'
  return (
    <section aria-label={`${label} 확정`} className="rounded-2xl bg-white p-4 text-[#183B36] shadow-sm">
      <p className="text-sm font-semibold">선택한 {label}</p>
      <div role="status" className="mt-1 min-h-5 text-sm">
        {candidate?.name && candidate.name !== candidate.address && <p className="font-semibold">{candidate.name}</p>}
        <p className="text-[#426459]">{candidate?.address ?? message}</p>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onCancel} className="min-h-12 rounded-xl bg-[#F0F3EE] px-5 font-semibold">취소</button>
        <button type="button" disabled={!candidate} onClick={onConfirm} className="min-h-12 flex-1 rounded-xl bg-[#183B36] px-3 font-semibold text-white disabled:opacity-40">{label} 확정</button>
      </div>
    </section>
  )
}

export default LocationConfirm
