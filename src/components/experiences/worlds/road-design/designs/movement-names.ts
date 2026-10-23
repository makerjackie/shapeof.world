import type { Turn } from '../sim/types'

/** Complete source strings let the site's translation extractor see dynamic labels. */
export const MOVEMENT_NAMES: Record<string, Record<Turn, string>> = {
  north: { straight: '北侧直行', left: '北侧左转', right: '北侧右转' },
  east: { straight: '东侧直行', left: '东侧左转', right: '东侧右转' },
  south: { straight: '南侧直行', left: '南侧左转', right: '南侧右转' },
  west: { straight: '西侧直行', left: '西侧左转', right: '西侧右转' },
}
