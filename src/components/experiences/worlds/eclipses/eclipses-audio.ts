/*
 * 食 · 程序化氛围声
 * 无音频文件、无版权负担。只在用户点开扬声器之后出声，
 * 强度随全食 / 环食 / 血月的深度轻轻呼吸。
 */

export type EclipseAudio = {
  readonly running: boolean
  toggle: () => boolean
  setIntensity: (value: number) => void
  dispose: () => void
}

const MASTER_LEVEL = 0.13
const FADE_SECONDS = 2.8

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

export function createEclipseAudio(): EclipseAudio {
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
    convolver.buffer = createImpulseResponse(ctx, 4.2, 2.6)
    const wet = ctx.createGain()
    wet.gain.value = 0.48
    const dry = ctx.createGain()
    dry.gain.value = 0.78
    convolver.connect(wet).connect(master)

    padFilter = ctx.createBiquadFilter()
    padFilter.type = 'lowpass'
    padFilter.frequency.value = 280
    padFilter.Q.value = 0.7
    padGain = ctx.createGain()
    padGain.gain.value = 0.18
    padFilter.connect(padGain)
    padGain.connect(dry)
    padGain.connect(convolver)
    dry.connect(master)

    subGain = ctx.createGain()
    subGain.gain.value = 0.36
    subGain.connect(dry)

    shimmerGain = ctx.createGain()
    shimmerGain.gain.value = 0.02
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

    // D 小调持续音：沉、暖，配日冕和血月
    addVoice('sine', 36.71, 0, subGain)
    addVoice('sine', 73.42, -3, subGain)
    addVoice('triangle', 146.83, -5, padFilter)
    addVoice('triangle', 146.83, 5, padFilter)
    addVoice('triangle', 174.61, -3, padFilter)
    addVoice('triangle', 220, 4, padFilter)
    addVoice('sine', 293.66, 0, shimmerGain)
    addVoice('sine', 440, 2, shimmerGain)

    const breath = ctx.createOscillator()
    breath.frequency.value = 0.04
    const breathDepth = ctx.createGain()
    breathDepth.gain.value = 90
    breath.connect(breathDepth).connect(padFilter.frequency)
    breath.start()
    oscillators.push(breath)
  }

  function ensureContext() {
    if (context) return context
    const AudioContextClass =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
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
        window.setTimeout(() => {
          if (!running) void ctx.suspend()
        }, FADE_SECONDS * 1000)
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
      padFilter?.frequency.setTargetAtTime(240 + v * 900, t, 0.7)
      padGain?.gain.setTargetAtTime(0.14 + v * 0.12, t, 0.7)
      subGain?.gain.setTargetAtTime(0.32 + v * 0.18, t, 0.7)
      shimmerGain?.gain.setTargetAtTime(0.016 + v * 0.06, t, 0.7)
    },
    dispose() {
      running = false
      for (const osc of oscillators) {
        try {
          osc.stop()
        } catch {
          /* already stopped */
        }
        osc.disconnect()
      }
      oscillators = []
      if (context) void context.close()
      context = null
    },
  }
}
