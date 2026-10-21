import {ArrowLeft, ArrowRight} from '@phosphor-icons/react'
import {useEffect, useMemo, useState} from 'react'
import {FlyToInterpolator} from '@deck.gl/core'
import DeckGL from '@deck.gl/react'
import {GeoJsonLayer} from '@deck.gl/layers'
import {FlowmapLayer, PickingType, type FlowmapLayerPickingInfo} from '@flowmap.gl/layers'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {Freebar} from '~/components/experiences/Freebar'
import {
  clampFlightJourneyIndex,
  flightJourney,
  flightJourneyBody,
  flightJourneyMetrics,
  sliceFlightNetwork,
  summarizeFlightNetwork,
  type FlightAirport,
  type FlightNetworkData,
  type FlightRoute,
} from './flight-network-journey'
import { useExperienceI18n } from '~/i18n/experience'

type Selection = {
  eyebrow: string
  title: string
  detail: string
  clue: string
  metrics: Array<{label: string; value: string}>
  hubId?: string
}

type FlightViewState = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
  transitionDuration?: number
  transitionInterpolator?: FlyToInterpolator
}

export function GlobalFlightFlow({controls}: {controls: ExperienceControls}) {
  const tx = useExperienceI18n()
  const initialViewState = useMemo<FlightViewState>(() => ({
    longitude: 12,
    latitude: 21,
    zoom: (globalThis.innerWidth ?? 1440) <= 720 ? 0.15 : 1.15,
    pitch: 0,
    bearing: 0,
  }), [])
  const [data, setData] = useState<FlightNetworkData>()
  const [countries, setCountries] = useState<GeoJSON.FeatureCollection>()
  const [viewState, setViewState] = useState<FlightViewState>(initialViewState)
  const [journeyIndex, setJourneyIndex] = useState(0)
  const [selection, setSelection] = useState<Selection>()
  const journeyStage = flightJourney[journeyIndex] ?? flightJourney[0]!
  const activeHubId = selection?.hubId ?? journeyStage.hubId

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      fetch('/assets/flow/global-routes.json').then((response) => response.json() as Promise<FlightNetworkData>),
      fetch('/assets/flow/countries.geojson').then((response) => response.json() as Promise<GeoJSON.FeatureCollection>),
    ]).then(([flightData, countryData]) => {
      if (cancelled) return
      setData(flightData)
      setCountries(countryData)
    })
    return () => { cancelled = true }
  }, [])

  const visibleData = useMemo(() => {
    if (!data) return undefined
    return sliceFlightNetwork(data, activeHubId)
  }, [activeHubId, data])

  const journeySummary = useMemo(() => data ? summarizeFlightNetwork(data, journeyStage.hubId) : undefined, [data, journeyStage.hubId])
  const story = selection ?? {
    eyebrow: `${String(journeyIndex + 1).padStart(2, '0')} / ${String(flightJourney.length).padStart(2, '0')} · ${journeyStage.label}`,
    title: journeyStage.title,
    detail: journeySummary ? flightJourneyBody(journeyStage, journeySummary) : '正在读取这份历史网络切片……',
    clue: journeyStage.clue,
    metrics: journeySummary ? flightJourneyMetrics(journeyStage, journeySummary) : [],
  }

  const layers = useMemo(() => {
    const nextLayers = []
    if (countries) {
      nextLayers.push(new GeoJsonLayer({
        id: 'countries-underlay',
        data: countries,
        filled: true,
        stroked: true,
        pickable: false,
        getFillColor: [11, 24, 35, 235],
        getLineColor: [113, 145, 158, 70],
        lineWidthMinPixels: 0.5,
      }))
    }
    if (visibleData) {
      nextLayers.push(new FlowmapLayer<FlightAirport, FlightRoute>({
        id: 'oneworld-flight-network',
        data: visibleData,
        pickable: true,
        darkMode: true,
        colorScheme: 'Teal',
        highlightColor: '#ffb070',
        locationsEnabled: true,
        locationTotalsEnabled: true,
        locationLabelsEnabled: false,
        clusteringEnabled: false,
        adaptiveScalesEnabled: true,
        fadeEnabled: true,
        fadeAmount: 28,
        flowLineCurviness: 0.7,
        flowLinesRenderingMode: 'curved',
        flowLineThicknessScale: 0.8,
        maxTopFlowsDisplayNum: 1800,
        getLocationId: (airport) => airport.id,
        getLocationLat: (airport) => airport.lat,
        getLocationLon: (airport) => airport.lon,
        getLocationName: (airport) => `${airport.city} · ${airport.code}`,
        getFlowOriginId: (route) => route.origin,
        getFlowDestId: (route) => route.dest,
        getFlowMagnitude: (route) => route.count,
        onClick: (info) => selectObject(info),
      }))
    }
    return nextLayers
  }, [countries, visibleData])

  function focusJourney(index: number) {
    const nextIndex = clampFlightJourneyIndex(index)
    const stage = flightJourney[nextIndex] ?? flightJourney[0]!
    setJourneyIndex(nextIndex)
    setSelection(undefined)
    setViewState({
      longitude: stage.longitude,
      latitude: stage.latitude,
      zoom: (globalThis.innerWidth ?? 1440) <= 720 ? (stage.mobileZoom ?? stage.zoom) : stage.zoom,
      pitch: 0,
      bearing: 0,
      transitionDuration: 1100,
      transitionInterpolator: new FlyToInterpolator(),
    })
    controls.registerInteraction()
    if (nextIndex === flightJourney.length - 1) controls.finish()
  }

  function selectObject(info: FlowmapLayerPickingInfo<FlightAirport, FlightRoute>) {
    controls.registerInteraction()
    if (info.object?.type === PickingType.LOCATION) {
      const airport = info.object.location
      if (!('city' in airport)) return
      setViewState({longitude: airport.lon, latitude: airport.lat, zoom: 2.7, pitch: 0, bearing: 0, transitionDuration: 900, transitionInterpolator: new FlyToInterpolator()})
      const summary = data ? summarizeFlightNetwork(data, airport.id) : undefined
      setSelection({
        eyebrow: `自由探索 · ${airport.country}`,
        title: `${airport.city} · ${airport.code}`,
        detail: summary
          ? `当前主要连接切片收束为 ${summary.airports} 座直连机场、${summary.countries} 个国家；原始历史数据库为这座机场记录了 ${airport.routes.toLocaleString('zh-CN')} 条有向航线。`
          : '正在读取这座机场的网络位置……',
        clue: '继续点击一条弧线读出城市对，或用下方箭头回到五站导览。',
        metrics: summary ? flightJourneyMetrics({...journeyStage, hubId: airport.id}, summary) : [],
        hubId: airport.id,
      })
      controls.finish()
    } else if (info.object?.type === PickingType.FLOW) {
      const originName = 'name' in info.object.origin ? info.object.origin.name : info.object.origin.id
      const destinationName = 'name' in info.object.dest ? info.object.dest.name : info.object.dest.id
      setSelection({
        eyebrow: '自由探索 · 一组城市连接',
        title: `${originName} → ${destinationName}`,
        detail: `这对城市之间记录了 ${info.object.count} 条航空公司航线记录。它表示历史数据库里的连接丰富度，不是班次、座位数或客流量。`,
        clue: '点击另一条弧线继续比较，或用下方箭头返回枢纽导览。',
        metrics: [
          {label: '航线记录', value: info.object.count.toLocaleString('zh-CN')},
          {label: '数据时间', value: '2014'},
          {label: '含义', value: '连接丰富度'},
        ],
      })
      controls.finish()
    }
  }

  return (
    <div className="oss-experience flowmap-experience">
      {!data && <div className="oss-loading">{tx("正在展开 1,800 组主要城市连接……")}</div>}
      <DeckGL
        viewState={viewState}
        controller
        layers={layers}
        onViewStateChange={({viewState: nextViewState}) => {
          setViewState(nextViewState as FlightViewState)
          controls.registerInteraction()
        }}
      />
      <div className="flowmap-grid" aria-hidden="true" />
      <Freebar
        className="flowmap-freebar"
        ariaLabel={tx("全球航线探索")}
        primaryControlBudget={2}
        secondaryDefault="closed"
        mobileDensity="comfortable"
        secondary={(
          <div className="oss-freebar-copy flowmap-story" aria-live="polite">
            <div className="flowmap-meta">
              <p>{tx(story.eyebrow)}</p>
              <span>{tx(selection ? '点击箭头返回导览' : '拖动地图也可自由探索')}</span>
            </div>
            <strong>{tx(story.title)}</strong>
            <div className="flowmap-metrics">
              {story.metrics.map((metric) => (
                <div key={metric.label}>
                  <small>{tx(metric.label)}</small>
                  <b>{tx(metric.value)}</b>
                </div>
              ))}
            </div>
            <div className="flowmap-clue">
              <small>{tx("在图里找")}</small>
              <p>{tx(story.clue)}</p>
            </div>
            <div className="flowmap-progress" role="progressbar" aria-label={tx("全球航线枢纽导览进度")} aria-valuemin={1} aria-valuemax={flightJourney.length} aria-valuenow={journeyIndex + 1}>
              {flightJourney.map((stage, index) => <i key={stage.id} className={index <= journeyIndex ? 'is-active' : undefined} />)}
            </div>
          </div>
        )}
      >
        <button type="button" disabled={journeyIndex === 0 && !selection} onClick={() => focusJourney(selection ? journeyIndex : journeyIndex - 1)} aria-label={tx(selection ? '返回当前导览' : '上一个枢纽')}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <button type="button" className="is-accent" disabled={journeyIndex === flightJourney.length - 1} onClick={() => focusJourney(journeyIndex + 1)} aria-label={tx("下一个枢纽")}>
          <span>{tx("下一站")}</span>
          <ArrowRight aria-hidden="true" />
        </button>
      </Freebar>
    </div>
  )
}
