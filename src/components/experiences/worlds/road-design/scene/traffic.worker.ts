import { createDefaultOD } from '../sim/demand'
import type { DesignSpec } from '../sim/types'
import { TrafficRuntime } from './runtime'
import { packFrame, packetBuffers, type RenderPacket } from './frame-packet'
import { calculateConflicts } from '../sim/conflicts'

import { buildRoadGeometry, packRoadGeometry, roadGeometryBuffers } from './road-geometry'
import { buildLamps, makeLightingBitmap } from './lights-data'
import { contextLayout } from './context-layout'
import { cityLayout } from './city-layout'
import { highestDeckPixels } from './deck-shadow'
import {buildBlueprintData,packBlueprint,blueprintBuffers} from './blueprint-data'

let runtime: TrafficRuntime | undefined
self.onmessage = async (event: MessageEvent) => {
  const message = event.data
  try {
    if (message.type === 'init') {
      const design = await loadDesign(message.id)
      if (!design) throw Error(`Unknown road design: ${message.id}`)
      const network = design.build()
      network.defaultOD ??= createDefaultOD(network, design.chapter === 1 ? { urbanPerApproach: design.defaultDemand } : design.id === 'cloverleaf' ? { highwayOffRampShare: .22 } : {})
      const lamps=buildLamps(network), geometry=packRoadGeometry(buildRoadGeometry(network,lamps)), roof=highestDeckPixels(network)
      const context=contextLayout(network),city=cityLayout(network.carriageways.every(road=>road.kind==='urban'),['diamond','ddi','parclo'].includes(network.id),network.carriageways,network)
      const blueprint=packBlueprint(buildBlueprintData(network))
      const lighting=await makeLightingBitmap(lamps)
      runtime = new TrafficRuntime(network, message.demand)
      const packet = packFrame(runtime, 15)
      self.postMessage({type:'ready',network,conflicts:calculateConflicts(network),packet,lamps,geometry,roof,lighting,context,city,blueprint}, {transfer:[...packetBuffers(packet),...roadGeometryBuffers(geometry),...blueprintBuffers(blueprint),roof.buffer,...(lighting?[lighting]:[])]})
    } else if (runtime) {
      if (message.type === 'demand') { runtime.stopPressure(); runtime.simulation.setDemandMultiplier(message.value); runtime.simulation.refreshMetrics(); return }
      if (message.type === 'stop-pressure') { runtime.stopPressure(); return }
      if (message.type === 'pressure') runtime.startPressure(message.to)
      if (message.type === 'advance') runtime.advance(message.seconds)
      const packet = packFrame(runtime, 15, message.recycle as RenderPacket | undefined)
      self.postMessage({type:'frame',packet,epoch:message.epoch??0}, {transfer:packetBuffers(packet)})
    }
  } catch (error) { self.postMessage({type:'error',message:error instanceof Error ? error.message : String(error)}) }
}

async function loadDesign(id:string):Promise<DesignSpec> {
  switch(id) {
    case 'cloverleaf': return (await import('../designs/cloverleaf')).cloverleaf
    case 't-junction': return (await import('../designs/t-junction')).tJunction
    case 'crossroads-yield': return (await import('../designs/crossroads-yield')).crossroadsYield
    case 'crossroads-signal': return (await import('../designs/crossroads-signal')).crossroadsSignal
    case 'roundabout': return (await import('../designs/roundabout')).roundabout
    case 'crossroads-channelized': return (await import('../designs/crossroads-channelized')).crossroadsChannelized
    case 'continuous-flow': return (await import('../designs/continuous-flow')).continuousFlow
    case 'diamond': return (await import('../designs/diamond')).diamond
    case 'ddi': return (await import('../designs/ddi')).ddi
    case 'parclo': return (await import('../designs/parclo')).parclo
    case 'trumpet': return (await import('../designs/trumpet')).trumpet
    case 'turbine': return (await import('../designs/turbine')).turbine
    case 'stack': return (await import('../designs/stack')).stack
    case 'huangjuewan': {
      const [{createHuangjuewan},{decodeHuangjuewan},response]=await Promise.all([
        import('../designs/huangjuewan-core'),import('../designs/packed-data'),
        fetch(new URL('../data/huangjuewan-runtime.json',import.meta.url)),
      ])
      if(!response.ok)throw Error(`Huangjuewan data: HTTP ${response.status}`)
      return createHuangjuewan(decodeHuangjuewan(await response.json())).huangjuewan
    }
    default:throw Error(`Unknown road design: ${id}`)
  }
}
