import type { WorldExperience } from '../types'

import moonVoyage from './cosmos/moon-voyage'
import blackHoleFlyby from './cosmos/black-hole-flyby'
import formulaBloom from './math-signals/formula-bloom'
import doubleSlit from './physics/double-slit'
import pendulumWave from './physics/pendulum-wave'
import doublePendulum from './physics/double-pendulum'
import fireflySync from './life-body/firefly-sync'
import chemicalGarden from './chem-materials/chemical-garden'
import neuralPlayground from './ai-ml/neural-playground'
import robotIk from './computing-engineering/robot-ik'
import solarSystem from './cosmos/solar-system'
import threeBody from './physics/three-body'
import gravityAssist from './cosmos/gravity-assist'
import mandelbrotZoom from './math-signals/mandelbrot-zoom'
import newtonFractal from './math-signals/newton-fractal'
import cliffordDust from './math-signals/clifford-dust'
import kakeyaNeedle from './math-signals/kakeya-needle'
import strangeAttractors from './physics/strange-attractors'
import fluidSim from './physics/fluid-sim'
import electricField from './physics/electric-field'
import magneticLines from './physics/magnetic-lines'
import fourier from './math-signals/fourier'
import ferrofluid from './chem-materials/ferrofluid'
import soapBubble from './chem-materials/soap-bubble'
import poolCaustics from './physics/pool-caustics'
import pinholeCanopy from './physics/pinhole-canopy'
import lightningLab from './earth-climate/lightning-lab'
import snowCrystal from './earth-climate/snow-crystal'
import boidsFlocking from './computing-engineering/boids-flocking'
import phyllotaxis from './life-body/phyllotaxis'

export const worldCatalog: Array<WorldExperience> = [
  moonVoyage,
  blackHoleFlyby,
  formulaBloom,
  doubleSlit,
  pendulumWave,
  doublePendulum,
  fireflySync,
  chemicalGarden,
  neuralPlayground,
  robotIk,
  solarSystem,
  threeBody,
  gravityAssist,
  mandelbrotZoom,
  newtonFractal,
  cliffordDust,
  kakeyaNeedle,
  strangeAttractors,
  fluidSim,
  electricField,
  magneticLines,
  fourier,
  ferrofluid,
  soapBubble,
  poolCaustics,
  pinholeCanopy,
  lightningLab,
  snowCrystal,
  boidsFlocking,
  phyllotaxis,
]
