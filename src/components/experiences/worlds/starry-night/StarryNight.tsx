import { useEffect, useRef, useState } from 'react'
import { FilmStrip } from '@phosphor-icons/react'
import type { ExperienceControls } from '~/components/ExperienceShell'
import { Freebar } from '~/components/experiences/Freebar'
import { useExperienceI18n } from '~/i18n/experience'
import { ScopedWorld } from '~/components/experiences/scoped-world/ScopedWorld'
import { mount } from './runtime'
import html from './stage.html?raw'
import css from './styles/starry-night.css?raw'
import './styles/flight-controls.css'

const dictionary = {}
type FlightState = { ready: boolean; mode: string; fly: boolean; lights: boolean; sound: boolean }
export function StarryNight({ controls }: { controls: ExperienceControls }) {
  const tx = useExperienceI18n()
  const host = useRef<HTMLDivElement>(null)
  const [flight, setFlight] = useState<FlightState>({ ready: false, mode: 'landing', fly: true, lights: true, sound: false })
  useEffect(() => {
    const element = host.current
    if (!element) return
    const sync = (event: Event) => setFlight((event as CustomEvent<FlightState>).detail)
    element.addEventListener('flight-state', sync)
    return () => element.removeEventListener('flight-state', sync)
  }, [])
  const command = (action: string, value?: string) => {
    controls.registerInteraction()
    host.current?.querySelector('.scoped-world-stage')?.shadowRoot?.dispatchEvent(new CustomEvent('flight-command', { detail: { action, value } }))
  }
  const free = flight.ready && flight.mode !== 'landing' && flight.mode !== 'tour'
  return <div ref={host} className="starry-flight-world">
    <ScopedWorld id="starry-night" label={tx('星月夜·走进笔触')} controls={controls} html={html} css={css} mount={mount} dictionary={dictionary} audio nativeLocale />
    {free && <Freebar ariaLabel={tx('星夜飞行')} primaryControlBudget={3} secondaryDefault="closed" secondary={<div className="starry-flight-options">
      <select aria-label={tx('前往景点')} defaultValue="" onChange={event => command('place', event.target.value)}>
        <option value="" disabled>{tx('前往景点')}</option>
        {[tx('全景'), tx('柏树'), tx('街巷'), tx('河湾'), tx('旋涡'), tx('笔触')].map((label, i) => <option key={i} value={i}>{label}</option>)}
      </select>
      <button onClick={() => command('models')}>{tx('近看物体')}</button>
      <button onClick={() => command('reference')}>{tx('原作对照')}</button>
      <button aria-pressed={flight.sound} onClick={() => command('sound')}>{tx(flight.sound ? '声音开' : '声音关')}</button>
      <button onClick={() => command('settings')}>{tx('设置')}</button>
    </div>}>
      <button className="experience-freebar-story" aria-label={tx('重播飞行')} onClick={() => command('tour')}><FilmStrip size={18} /><span>{tx('重播飞行')}</span></button>
      <button aria-pressed={flight.fly} onClick={() => command('fly')}>{tx(flight.fly ? '飞行' : '步行')}</button>
      <button aria-pressed={flight.lights} onClick={() => command('lights')}>{tx(flight.lights ? '熄灭灯火' : '点亮村庄')}</button>
    </Freebar>}
  </div>
}
