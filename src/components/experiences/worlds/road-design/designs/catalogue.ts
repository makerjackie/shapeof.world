import data from '../data/presentation.json'
import type { DesignSpec } from '../sim/types'
export type DesignInfo = Omit<DesignSpec, 'build'>
/** Main-thread catalogue contains no model builders or real-world source data. */
export const CATALOGUE = data
