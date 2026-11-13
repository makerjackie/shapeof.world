import { describe, expect, it } from 'vitest'

import entries from './films.json'
import bilibiliVideos from './bilibili-videos.json'
import { bilibiliBvid } from '~/lib/film-player'
import type { FilmEntry } from './films'
import { loadFilm, loadFilmCatalog, loadFilms, loadFilmsForWorld } from './films.server'
import { getWorld } from './worlds'

describe('films', () => {
  it('combines Bilibili and site films once, newest first', () => {
    const catalog = loadFilmCatalog()
    expect(new Set(catalog.map((film) => film.id)).size).toBe(catalog.length)
    expect(new Set(bilibiliVideos.map((film) => film.bvid)).size).toBe(bilibiliVideos.length)
    const siteBvids = new Set((entries as FilmEntry[]).filter((film) => film.publishedAt).map((film) => bilibiliBvid(film.watch.bilibili)))
    for (const card of catalog) {
      if (card.kind === 'bilibili') expect(siteBvids.has(card.film.bvid)).toBe(false)
      expect(Number.isFinite(Date.parse(card.publishedAt))).toBe(true)
    }
    const expectedCount = loadFilms().length + bilibiliVideos.filter((film) => !siteBvids.has(film.bvid)).length
    expect(catalog).toHaveLength(expectedCount)
    for (let index = 1; index < catalog.length; index += 1) {
      expect(Date.parse(catalog[index - 1].publishedAt)).toBeGreaterThanOrEqual(Date.parse(catalog[index].publishedAt))
    }
    for (const video of bilibiliVideos) {
      expect(video.bvid).toMatch(/^BV[0-9A-Za-z]{10}$/)
      expect(video.titleEn.trim()).not.toBe('')
      expect(video.durationSeconds).toBeGreaterThan(0)
      expect(new URL(video.poster).hostname).toMatch(/(^|\.)hdslb\.com$/)
    }
  })

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
    const listed = loadFilms().map((film) => film.slug)
    for (const entry of unpublished) expect(listed).not.toContain(entry.slug)
  })

  it('finds the films that point to a world', () => {
    expect(loadFilmsForWorld('follow-the-money').map((film) => film.slug)).toContain('house')
    expect(loadFilmsForWorld('no-such-world')).toEqual([])
  })
})
