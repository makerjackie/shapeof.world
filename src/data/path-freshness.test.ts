import { expect, it } from 'vitest'
import type { Path } from './content-graph'
import { pathReleaseDate, sortPathsByRecentUpdate } from './path-freshness'
const path = (id: string, order: number, worldIds: string[], updatedAt?: string): Path => ({ id, slug: id, title:id, titleEn:id, description:'',descriptionEn:'',publication:'public',order,worldIds,updatedAt })
it('ranks series by the latest public member update instead of editorial priority', () => {
  const dates: Record<string,string> = { old:'2026-08-01', recent:'2026-09-23' }
  const items = [path('editorial-first',1,['old']),path('new-content',9,['recent'])]
  expect(sortPathsByRecentUpdate(items,id=>dates[id]).map(x=>x.id)).toEqual(['new-content','editorial-first'])
  expect(items[0].id).toBe('editorial-first')
})
it('includes explicit series curation dates and breaks equal-date ties deterministically', () => {
  const items = [path('z',2,['unknown']),path('a',2,[]),path('curated',9,[],'2026-09-23')]
  expect(sortPathsByRecentUpdate(items,()=>undefined).map(x=>x.id)).toEqual(['curated','a','z'])
  expect(pathReleaseDate(path('x',0,['new'],'2026-09-01'),()=> '2026-09-22')).toBe('2026-09-22')
})
