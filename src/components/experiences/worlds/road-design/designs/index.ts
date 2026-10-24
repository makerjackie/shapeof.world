import { createDefaultOD } from '../sim/demand'
import type { DesignSpec } from '../sim/types'
import { cloverleaf } from './cloverleaf'
import { crossroadsSignal } from './crossroads-signal'
import { crossroadsYield } from './crossroads-yield'
import { tJunction } from './t-junction'
import { roundabout } from './roundabout'
import { crossroadsChannelized } from './crossroads-channelized'
import { diamond } from './diamond'
import { ddi } from './ddi'
import { stack } from './stack'
import { turbine } from './turbine'
import { huangjuewan } from './huangjuewan'
import { trumpet } from './trumpet'
import { parclo } from './parclo'
import { continuousFlow } from './continuous-flow'

const entries = [tJunction, crossroadsYield, crossroadsSignal, roundabout, crossroadsChannelized, continuousFlow, diamond, ddi, parclo, trumpet, cloverleaf, turbine, stack, huangjuewan]
export const DESIGNS: DesignSpec[] = entries.map(design => ({ ...design, build: () => {
  const network = design.build()
  network.defaultOD ??= createDefaultOD(network, design.chapter === 1 ? { urbanPerApproach: design.defaultDemand } : design.id === 'cloverleaf' ? { highwayOffRampShare: 0.22 } : {})
  return network
} }))
export { cloverleaf, tJunction, crossroadsYield, crossroadsSignal, roundabout, crossroadsChannelized, diamond, ddi, turbine, stack, huangjuewan, trumpet, parclo, continuousFlow }
