import {describe, expect, it} from 'vitest'

import {
  clampFlightJourneyIndex,
  flightJourney,
  flightJourneyBody,
  flightJourneyMetrics,
  sliceFlightNetwork,
  summarizeFlightNetwork,
  type FlightNetworkData,
} from './flight-network-journey'

const fixture: FlightNetworkData = {
  generatedFrom: 'test fixture',
  license: 'ODbL-1.0',
  locations: [
    {id: 'hub', name: 'Hub', city: 'Atlanta', country: 'United States', code: 'HUB', lat: 33.64, lon: -84.43, routes: 3},
    {id: 'near', name: 'Near', city: 'Chicago', country: 'United States', code: 'NEA', lat: 41.98, lon: -87.9, routes: 1},
    {id: 'far', name: 'Far', city: 'London', country: 'United Kingdom', code: 'FAR', lat: 51.47, lon: -0.46, routes: 1},
    {id: 'farthest', name: 'Farthest', city: 'Singapore', country: 'Singapore', code: 'MAX', lat: 1.35, lon: 103.99, routes: 1},
    {id: 'outside', name: 'Outside', city: 'Tokyo', country: 'Japan', code: 'OUT', lat: 35.68, lon: 139.76, routes: 1},
  ],
  flows: [
    {origin: 'hub', dest: 'near', count: 3},
    {origin: 'hub', dest: 'far', count: 2},
    {origin: 'farthest', dest: 'hub', count: 1},
    {origin: 'far', dest: 'outside', count: 4},
  ],
}

describe('flight network journey', () => {
  it('moves through one global view and four distinct hubs', () => {
    expect(flightJourney).toHaveLength(5)
    expect(flightJourney[0]?.hubId).toBeNull()
    expect(new Set(flightJourney.slice(1).map((stage) => stage.hubId)).size).toBe(4)
    expect(clampFlightJourneyIndex(-1)).toBe(0)
    expect(clampFlightJourneyIndex(99)).toBe(4)
  })

  it('slices the network to only flows touching the chosen hub', () => {
    const slice = sliceFlightNetwork(fixture, 'hub')
    expect(slice.flows).toHaveLength(3)
    expect(slice.locations.map(({id}) => id).sort()).toEqual(['far', 'farthest', 'hub', 'near'])
  })

  it('derives comparable hub facts from the displayed data', () => {
    const summary = summarizeFlightNetwork(fixture, 'hub')
    expect(summary).toMatchObject({
      airports: 3,
      connections: 3,
      countries: 3,
      domesticAirports: 1,
      internationalAirports: 2,
      records: 6,
    })
    expect(summary.longest?.airport.id).toBe('farthest')
    expect(flightJourneyMetrics(flightJourney[1]!, summary)).toHaveLength(3)
  })

  it('states the historical limitation in the opening explanation', () => {
    const globalSummary = summarizeFlightNetwork(fixture, null)
    expect(flightJourneyBody(flightJourney[0]!, globalSummary)).toContain('2014 年')
    expect(flightJourneyBody(flightJourney[0]!, globalSummary)).toContain('不是今日航班或客流图')
  })
})
