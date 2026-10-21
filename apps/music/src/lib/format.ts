export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  if (seconds > 0 && seconds < 10) return `${seconds.toFixed(2)}s`
  const whole = Math.floor(seconds)
  const minutes = Math.floor(whole / 60)
  const rest = whole % 60
  return `${minutes}:${rest.toString().padStart(2, '0')}`
}

export function modelLabel(model: string, locale: 'en' | 'zh' = 'en'): string {
  if (model === 'procedural-dsp') return locale === 'zh' ? '程序合成' : 'Procedural synthesis'
  if (model.includes('lyria-3-pro')) return 'Google Lyria 3 Pro'
  if (model.includes('lyria')) return 'Google Lyria 3'
  return model
}

export function hashUnit(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return (hash % 1000) / 1000
}
