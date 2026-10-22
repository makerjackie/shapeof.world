import { describe, expect, it } from 'vitest'

import entries from './films.json'
import type { FilmEntry } from './films'
import { loadFilm, loadFilms, loadFilmsForWorld } from './films.server'
import { getWorld } from './worlds'

describe('films', () => {
  it('names a press kit and public worlds for every film', () => {
    for (const entry of entries as FilmEntry[]) {
      expect(entry.slug, entry.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      for (const id of entry.relatedWorldIds) expect(getWorld(id)?.publication, `${entry.slug} → ${id}`).toBe('public')
    }
    // loadFilm reads each published film's kit and throws on a missing one.
    for (const film of loadFilms()) expect(loadFilm(film.slug)?.video).toMatch(/^https:\/\/press\.shapeof\.world\/media\/.+\.mp4$/)
  })

  it('keeps unpublished films off the site', () => {
    const unpublished = (entries as FilmEntry[]).filter((entry) => !entry.publishedAt)
    for (const entry of unpublished) expect(loadFilm(entry.slug)).toBeUndefined()
    expect(loadFilms().map((film) => film.slug)).not.toEqual(expect.arrayContaining(unpublished.map((entry) => entry.slug)))
  })

  it('finds the films that point to a world', () => {
    expect(loadFilmsForWorld('follow-the-money').map((film) => film.slug)).toContain('house')
    expect(loadFilmsForWorld('no-such-world')).toEqual([])
  })
})
