import type { Coordinate, RiskLevel } from './routes'

let requests = 0

export async function exampleRecommendation(origin: Coordinate, destination: Coordinate, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    signal.throwIfAborted()
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, 450)
    function abort() {
      window.clearTimeout(timer)
      reject(signal.reason)
    }
    signal.addEventListener('abort', abort, { once: true })
  })
  if (new URLSearchParams(window.location.search).get('routeError') === '1' && ++requests === 1) {
    throw new Error('경로 조회에 실패했습니다. 잠시 후 다시 시도해주세요.')
  }
  const point = (fraction: number): Coordinate => [
    origin[0] + (destination[0] - origin[0]) * fraction,
    origin[1] + (destination[1] - origin[1]) * fraction,
  ]
  return {
    modelVersion: 'development', recommendedIndex: 2,
    candidates: [{ index: 2, distanceM: 920, durationMin: 12, segments: {
      type: 'FeatureCollection',
      features: (['GREEN', 'YELLOW', 'RED'] as RiskLevel[]).map((level, index) => ({
        type: 'Feature', properties: { level, lengthM: 300 },
        geometry: { type: 'MultiLineString', coordinates: [[point(index / 3), point((index + 1) / 3)]] },
      })),
    } }],
  }
}
