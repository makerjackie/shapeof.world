// 程序化氛围配乐：A 小调持续音 + 低通管风琴质感 + 生成混响。
// 无音频资源、无版权负担；强度随轨道速度实时驱动（近日点自动渐强）。

export type FlybyAudio = {
  readonly running: boolean
  toggle: () => boolean
  setIntensity: (value: number) => void
  dispose: () => void
}

const MASTER_LEVEL = 0.16
const FADE_SECONDS = 3.5

function createImpulseResponse(context: AudioContext, seconds: number, decay: number) {
  const rate = context.sampleRate
  const length = Math.floor(rate * seconds)
  const impulse = context.createBuffer(2, length, rate)
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel)
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay)
    }
  }
  return impulse
}

export function createFlybyAudio(): FlybyAudio {
  let context: AudioContext | null = null
  let master: GainNode | null = null
  let padFilter: BiquadFilterNode | null = null
  let padGain: GainNode | null = null
  let subGain: GainNode | null = null
  let shimmerGain: GainNode | null = null
  let oscillators: Array<OscillatorNode> = []
  let running = false

  function buildGraph(ctx: AudioContext) {
    master = ctx.createGain()
    master.gain.value = 0
    master.connect(ctx.destination)

    const convolver = ctx.createConvolver()
    convolver.buffer = createImpulseResponse(ctx, 3.2, 2.4)
    const wet = ctx.createGain()
    wet.gain.value = 0.4
    const dry = ctx.createGain()
    dry.gain.value = 0.85
    convolver.connect(wet).connect(master)

    padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 320
    padFilter.Q.value = 0.8
    padGain = ctx.createGain()
    padGain.gain.value = 0.2
    padFilter.connect(padGain)
    padGain.connect(dry)
    padGain.connect(convolver)
    dry.connect(master)

    subGain = ctx.createGain()
    subGain.gain.value = 0.42
    subGain.connect(dry)

    shimmerGain = ctx.createGain()
    shimmerGain.gain.value = 0.025
    shimmerGain.connect(convolver)
    shimmerGain.connect(dry)

    const addVoice = (type: OscillatorType, frequency: number, detune: number, destination: AudioNode) => {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.value = frequency
      osc.detune.value = detune
      osc.connect(destination)
      osc.start()
      oscillators.push(osc)
    }

    // 低音持续 drone：A1 + E2
    addVoice('sine', 55, 0, subGain)
    addVoice('sine', 82.41, 0, subGain)
    // 管风琴 pad：A2 / C3 / E3 / A3，成对微失谐
    addVoice('triangle', 110, -4, padFilter)
    addVoice('triangle', 110, 4, padFilter)
    addVoice('triangle', 130.81, -3, padFilter)
    addVoice('triangle', 164.81, 3, padFilter)
    addVoice('triangle', 220, -5, padFilter)
    // 高频泛音微光
    addVoice('sine', 659.26, 0, shimmerGain)
    addVoice('sine', 880, 0, shimmerGain)

    // 滤波器缓慢呼吸
    const breath = ctx.createOscillator()
    breath.frequency.value = 0.045
    const breathDepth = ctx.createGain()
    breathDepth.gain.value = 130
    breath.connect(breathDepth).connect(padFilter.frequency)
    breath.start()
    oscillators.push(breath)
  }

  function ensureContext() {
    if (context) return context
    const AudioContextClass = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return null
    context = new AudioContextClass()
    buildGraph(context)
    return context
  }

  function fadeTo(level: number) {
    if (!context || !master) return
    master.gain.cancelScheduledValues(context.currentTime)
    master.gain.setTargetAtTime(level, context.currentTime, FADE_SECONDS / 3)
  }

  return {
    get running() {
      return running
    },
    toggle() {
      const ctx = ensureContext()
      if (!ctx) return false
      if (running) {
        running = false
        fadeTo(0)
        window.setTimeout(() => { if (!running) void ctx.suspend() }, FADE_SECONDS * 1000)
      } else {
        running = true
        void ctx.resume()
        fadeTo(MASTER_LEVEL)
      }
      return running
    },
    setIntensity(value: number) {
      if (!context || !running) return
      const v = Math.min(Math.max(value, 0), 1)
      const t = context.currentTime
      padFilter?.frequency.setTargetAtTime(280 + v * 1300, t, 0.6)
      padGain?.gain.setTargetAtTime(0.16 + v * 0.14, t, 0.6)
      subGain?.gain.setTargetAtTime(0.38 + v * 0.2, t, 0.6)
      shimmerGain?.gain.setTargetAtTime(0.02 + v * 0.07, t, 0.6)
    },
    dispose() {
      running = false
      for (const osc of oscillators) {
        try { osc.stop() } catch { /* already stopped */ }
        osc.disconnect()
      }
      oscillators = []
      if (context) void context.close()
      context = null
    },
  }
}
