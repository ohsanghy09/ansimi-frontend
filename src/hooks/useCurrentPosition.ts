import { useEffect, useEffectEvent, useState } from 'react'
import type { Location } from '../types/location'

export type PositionFix = { location: Location; accuracy: number; timestamp: number }

export function toPositionFix({ coords, timestamp }: GeolocationPosition): PositionFix {
  return {
    location: { latitude: coords.latitude, longitude: coords.longitude, address: '현재 위치' },
    accuracy: coords.accuracy,
    timestamp,
  }
}

export function positionError(error: GeolocationPositionError) {
  return error.code === 1
    ? '위치 권한을 허용해주세요. 출발지는 검색이나 지도로도 설정할 수 있습니다.'
    : '현재 위치를 확인하지 못했습니다. 위치 설정을 확인한 뒤 다시 시도해주세요.'
}

export const positionOptions: PositionOptions = { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }

export function useCurrentPosition(onFix: (fix: PositionFix | null) => void, maxAge: number) {
  const [fix, setFix] = useState<PositionFix | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const receiveFix = useEffectEvent(onFix)

  useEffect(() => {
    const geolocation = navigator.geolocation
    if (!geolocation) return
    let active = true
    let timeout: number | undefined
    let latestTimestamp = 0
    function clearFix() {
      setFix(null)
      receiveFix(null)
    }
    const subscription = geolocation.watchPosition((position) => {
      if (!active) return
      if (position.timestamp <= latestTimestamp || Date.now() - position.timestamp >= maxAge) return
      latestTimestamp = position.timestamp
      window.clearTimeout(timeout)
      setError('')
      const fix = toPositionFix(position)
      setFix(fix)
      receiveFix(fix)
      timeout = window.setTimeout(clearFix, Math.max(0, maxAge - (Date.now() - position.timestamp)))
    }, (reason) => {
      if (!active) return
      window.clearTimeout(timeout)
      clearFix()
      setError(positionError(reason))
    }, positionOptions)
    return () => {
      active = false
      window.clearTimeout(timeout)
      geolocation.clearWatch(subscription)
    }
  }, [attempt, maxAge])

  function retry() {
    setError('')
    setFix(null)
    setAttempt((previous) => previous + 1)
  }

  return { fix, error: navigator.geolocation ? error : '이 브라우저에서는 현재 위치를 사용할 수 없습니다.', retry }
}
