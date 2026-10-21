import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { MuseumExplore, MuseumNav, museumAreas } from './ui/MuseumExplore'
import { museumTopics } from './museum-topics'
import { parseMuseumRoute } from './museum-route'

describe('merged museum navigation', () => {
 it('keeps every article reachable once across the three reading sections', () => {
  const markup = museumAreas.map(([section]) => renderToStaticMarkup(createElement(MuseumExplore, {route:{view:'museum',section},en:true,onInteract:()=>{}}))).join('')
  for (const topic of museumTopics) {
   expect(markup.split(`href="#museum/read/${topic.id}"`).length - 1, topic.id).toBe(1)
  }
 })
 it.each([
  ['#museum/interactions', 'Matter &amp; forces'],
  ['#museum/experiments', 'Experiments &amp; discoveries'],
  ['#museum/read/strong-colour', 'Matter &amp; forces'],
  ['#museum/read/matter-excess', 'Open questions'],
  ['#museum/lab/oscillation', 'Experiments &amp; discoveries'],
 ])('highlights the new parent of %s', (hash, label) => {
  const route = parseMuseumRoute(hash)
  if (route.view !== 'museum') throw new Error('Expected museum route')
  const markup = renderToStaticMarkup(createElement(MuseumNav, {route,en:true}))
  expect(markup).toContain(`aria-current="page">${label}</a>`)
  expect(markup.match(/aria-current="page"/g)).toHaveLength(1)
 })
})
