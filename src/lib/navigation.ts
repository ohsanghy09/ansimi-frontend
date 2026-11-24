import type { Coordinate, Navigation } from './routes'
import type { PositionFix } from '../hooks/useCurrentPosition'
import type { Location } from '../types/location'

export const MAX_ACCURACY_M = 35
export const FIX_MAX_AGE_MS = 15000

export type Progress = {
  meters: number
  remaining: number
  distanceFromRoute: number
  segment: number
}

export function metersBetween(a: Coordinate, b: Coordinate): [number, number] {
  const latitude = (a[1] + b[1]) / 2 * Math.PI / 180
  return [(b[0] - a[0]) * Math.cos(latitude) * 111195, (b[1] - a[1]) * 111195]
}

export function distanceBetween(a: Coordinate, b: Coordinate) {
  return Math.hypot(...metersBetween(a, b))
}

function coordinate({ longitude, latitude }: Location): Coordinate {
  return [longitude, latitude]
}

export function measureNavigation(navigation: Navigation) {
  const cumulative = [0]
  for (let index = 1; index < navigation.path.length; index++) {
    cumulative.push(cumulative[index - 1] + distanceBetween(navigation.path[index - 1], navigation.path[index]))
  }
  return { ...navigation, cumulative, length: cumulative[cumulative.length - 1] }
}

export function projectPosition(
  route: ReturnType<typeof measureNavigation>,
  fix: PositionFix,
  previous?: { fix: PositionFix; progress: Progress },
): Progress | null {
  const point = coordinate(fix.location)
  const movement = previous ? distanceBetween(coordinate(previous.fix.location), point) : 0
  const elapsed = previous ? Math.max(0, fix.timestamp - previous.fix.timestamp) / 1000 : 0
  const maxAdvance = Math.min(150, Math.max(45, movement + fix.accuracy, elapsed * 3 + fix.accuracy))
  let closest: Progress | null = null
  let penalty = Infinity

  for (let index = 0; index + 1 < route.path.length; index++) {
    const start = route.path[index]
    const [dx, dy] = metersBetween(start, route.path[index + 1])
    const [px, py] = metersBetween(start, point)
    const length = route.cumulative[index + 1] - route.cumulative[index]
    if (length === 0) continue
    const ratio = Math.max(0, Math.min(1, (dx * px + dy * py) / (length * length)))
    const meters = route.cumulative[index] + ratio * length
    if (previous && (meters < previous.progress.meters - 30 || meters > previous.progress.meters + maxAdvance)) continue
    const distanceFromRoute = Math.hypot(px - ratio * dx, py - ratio * dy)
    const movementPenalty = previous ? Math.abs(meters - previous.progress.meters - movement) * 0.15 : meters * 0.005
    if (distanceFromRoute + movementPenalty < penalty) {
      penalty = distanceFromRoute + movementPenalty
      closest = { meters, remaining: route.length - meters, distanceFromRoute, segment: index }
    }
  }
  return closest
}

export function isRouteArrival(progress: Progress, fix: PositionFix, destination: Location) {
  return fix.accuracy <= 20 && progress.remaining <= 20 && progress.distanceFromRoute <= 20
    && distanceBetween(coordinate(fix.location), coordinate(destination)) <= 20
}
