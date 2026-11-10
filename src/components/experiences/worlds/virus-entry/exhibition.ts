import type { Part, View } from './model'

/** Readability dimensions only, with deliberately separated layers. Not molecular scale. */
export const BILAYER_DISPLAY = { headY: .18, tailY: .09, tailLength: .15, tailOffset: .023, headRadius: .057 }

export function membranePatch(closeup: boolean): [number, number, number][] {
  const columns = closeup ? 22 : 64, rows = closeup ? 16 : 40, step = .2
  return Array.from({ length: columns * rows }, (_, i) => [(i % columns - (columns - 1) / 2) * step, 0, (Math.floor(i / columns) - (rows - 1) / 2) * step])
}

/** A camera/display bookmark. It does not alter the underlying entry choreography. */
export function structureBookmark(part: Part): { view: View; progress?: number; route?: 'endosome' } {
  if (part === 'cell') return { view: 'membrane' }
  if (part === 'vesicle') return { view: 'inside', progress: .5, route: 'endosome' }
  return { view: 'particle' }
}

export function viewSelection(view: View): Part {
  return view === 'membrane' ? 'cell' : view === 'inside' ? 'vesicle' : 'envelope'
}
