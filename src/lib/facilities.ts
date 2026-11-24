import convenienceStoreIcon from '../assets/icons/convenience-store-marker.svg'
import hospitalIcon from '../assets/icons/hospital-marker.svg'
import storeIcon from '../assets/icons/store-marker.svg'
import type { Coordinate } from './routes'

export const facilityTypes = {
  CONVENIENCE_STORE: { label: '편의점', icon: convenienceStoreIcon },
  HOSPITAL: { label: '병원', icon: hospitalIcon },
  STORE: { label: '가게', icon: storeIcon },
}

export type Facility = {
  id: string
  name: string
  type: keyof typeof facilityTypes
  coordinate: Coordinate
}

const examples: Facility[] = [
  { id: 'example-convenience', name: '시범 편의점', type: 'CONVENIENCE_STORE', coordinate: [127.0294, 37.4988] },
  { id: 'example-hospital', name: '시범 병원', type: 'HOSPITAL', coordinate: [127.0332, 37.5002] },
  { id: 'example-store', name: '시범 가게', type: 'STORE', coordinate: [127.0375, 37.5014] },
]

export const facilityExamples = import.meta.env.DEV && typeof window !== 'undefined'
  && new URLSearchParams(window.location.search).get('facilityExample') === '1' ? examples : undefined
