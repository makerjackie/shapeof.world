export type FlightAirport = {
  id: string
  name: string
  city: string
  country: string
  code: string
  lat: number
  lon: number
  routes: number
}

export type FlightRoute = {
  origin: string
  dest: string
  count: number
}

export type FlightNetworkData = {
  generatedFrom: string
  license: string
  locations: Array<FlightAirport>
  flows: Array<FlightRoute>
}

export type FlightNetworkSummary = {
  airports: number
  connections: number
  countries: number
  domesticAirports: number
  internationalAirports: number
  records: number
  longest?: {
    airport: FlightAirport
    distanceKm: number
  }
}

export type FlightJourneyStage = {
  id: string
  hubId: string | null
  label: string
  title: string
  clue: string
  longitude: number
  latitude: number
  zoom: number
  mobileZoom?: number
}

export const flightJourney: Array<FlightJourneyStage> = [
  {
    id: 'world',
    hubId: null,
    label: '全球网络',
    title: '世界先长成三个密集的亮区',
    clue: '先找北美、欧洲和东亚三块亮斑：连接密度比国土面积更早暴露全球网络的重心。',
    longitude: 12,
    latitude: 21,
    zoom: 1.15,
    mobileZoom: 0.15,
  },
  {
    id: 'atlanta',
    hubId: '3682',
    label: '亚特兰大',
    title: '先把国内支线汇到一个点',
    clue: '看弧线怎样密集铺向美国东部，再用少数长线跨过大西洋。',
    longitude: -84.43,
    latitude: 33.64,
    zoom: 2.6,
    mobileZoom: 1.65,
  },
  {
    id: 'london',
    hubId: '507',
    label: '伦敦',
    title: '这里的网络几乎从一开始就是国际的',
    clue: '注意弧线同时伸向北美、欧洲、亚洲与非洲，而不是只在一个国家内部收束。',
    longitude: -0.46,
    latitude: 51.47,
    zoom: 2.5,
    mobileZoom: 1.55,
  },
  {
    id: 'beijing',
    hubId: '3364',
    label: '北京',
    title: '国内干线与洲际长线叠在一起',
    clue: '先看中国境内的密集短线，再找跨过北太平洋抵达北美的最长弧线。',
    longitude: 116.58,
    latitude: 40.08,
    zoom: 2.55,
    mobileZoom: 1.6,
  },
  {
    id: 'singapore',
    hubId: '3316',
    label: '新加坡',
    title: '城市很小，网络半径却横跨半个地球',
    clue: '它没有国内航线；看每一条弧线怎样越过国界，把东亚、南亚、澳洲与欧洲串在一起。',
    longitude: 103.99,
    latitude: 1.35,
    zoom: 2.6,
    mobileZoom: 1.65,
  },
]

export function clampFlightJourneyIndex(index: number): number {
  return Math.max(0, Math.min(flightJourney.length - 1, index))
}

export function sliceFlightNetwork(data: FlightNetworkData, hubId: string | null): FlightNetworkData {
  if (!hubId) return data
  const flows = data.flows.filter((route) => route.origin === hubId || route.dest === hubId)
  const locationIds = new Set(flows.flatMap((route) => [route.origin, route.dest]))
  return {...data, flows, locations: data.locations.filter((airport) => locationIds.has(airport.id))}
}

export function summarizeFlightNetwork(data: FlightNetworkData, hubId: string | null): FlightNetworkSummary {
  const airportById = new Map(data.locations.map((airport) => [airport.id, airport]))
  const hub = hubId ? airportById.get(hubId) : undefined
  const slice = sliceFlightNetwork(data, hubId)
  const peerAirports = hub
    ? slice.locations.filter((airport) => airport.id !== hub.id)
    : slice.locations
  const countries = new Set(peerAirports.map((airport) => airport.country))
  const internationalAirports = hub
    ? peerAirports.filter((airport) => airport.country !== hub.country).length
    : 0

  let longest: FlightNetworkSummary['longest']
  if (hub) {
    for (const airport of peerAirports) {
      const distanceKm = haversineDistanceKm(hub, airport)
      if (!longest || distanceKm > longest.distanceKm) longest = {airport, distanceKm}
    }
  }

  return {
    airports: peerAirports.length,
    connections: slice.flows.length,
    countries: countries.size,
    domesticAirports: hub ? peerAirports.length - internationalAirports : 0,
    internationalAirports,
    records: slice.flows.reduce((sum, route) => sum + route.count, 0),
    longest,
  }
}

export function flightJourneyBody(stage: FlightJourneyStage, summary: FlightNetworkSummary): string {
  if (!stage.hubId) {
    return `这张图从 2014 年 OpenFlights 历史快照中保留了 ${formatCount(summary.airports)} 座高连接机场与 ${formatCount(summary.connections)} 组主要城市连接。它不是今日航班或客流图。`
  }
  if (stage.id === 'atlanta') {
    return `在当前切片里，${summary.airports} 座直连机场中有 ${summary.domesticAirports} 座位于美国、${summary.internationalAirports} 座在境外。枢纽首先是一台把分散需求汇拢起来的中转机器。`
  }
  if (stage.id === 'london') {
    return `${summary.airports} 座直连机场中有 ${summary.internationalAirports} 座位于英国之外，覆盖 ${summary.countries} 个国家。伦敦的连接不是向一侧辐射，而是同时穿过多个区域。`
  }
  if (stage.id === 'beijing') {
    return `${summary.airports} 座直连机场中有 ${summary.domesticAirports} 座在中国、${summary.internationalAirports} 座在境外。国内网络提供密度，洲际航线把半径拉到一万公里之外。`
  }
  return `${summary.airports} 座直连机场全部位于境外，却覆盖 ${summary.countries} 个国家。国土大小没有限制它成为横跨亚洲、澳洲与欧洲的转机节点。`
}

export function flightJourneyMetrics(stage: FlightJourneyStage, summary: FlightNetworkSummary): Array<{label: string; value: string}> {
  if (!stage.hubId) {
    return [
      {label: '机场', value: formatCount(summary.airports)},
      {label: '国家 / 地区', value: formatCount(summary.countries)},
      {label: '主要连接', value: formatCount(summary.connections)},
    ]
  }
  return [
    {label: '直连机场', value: formatCount(summary.airports)},
    {label: '覆盖国家', value: formatCount(summary.countries)},
    {
      label: '最远连接',
      value: summary.longest
        ? `${localizedCity(summary.longest.airport.city)} · ${formatDistance(summary.longest.distanceKm)}`
        : '—',
    },
  ]
}

function formatCount(value: number): string {
  return value.toLocaleString('zh-CN')
}

function formatDistance(distanceKm: number): string {
  return `约 ${Math.round(distanceKm / 100) * 100} km`
}

function localizedCity(city: string): string {
  const names: Record<string, string> = {
    London: '伦敦',
    'New York': '纽约',
    Rome: '罗马',
    Singapore: '新加坡',
  }
  return names[city] ?? city
}

function haversineDistanceKm(origin: FlightAirport, destination: FlightAirport): number {
  const earthRadiusKm = 6371
  const degreesToRadians = Math.PI / 180
  const originLatitude = origin.lat * degreesToRadians
  const destinationLatitude = destination.lat * degreesToRadians
  const latitudeDelta = (destination.lat - origin.lat) * degreesToRadians
  const longitudeDelta = (destination.lon - origin.lon) * degreesToRadians
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(originLatitude) * Math.cos(destinationLatitude) * Math.sin(longitudeDelta / 2) ** 2
  return earthRadiusKm * 2 * Math.asin(Math.sqrt(haversine))
}
