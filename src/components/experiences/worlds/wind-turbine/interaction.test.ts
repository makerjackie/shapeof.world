import {act,createElement} from 'react'
import {createRoot,type Root} from 'react-dom/client'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import type {ExperienceControls} from '~/components/ExperienceShell'
import {WindTurbine} from './WindTurbine'

// Exercise the real UI/state transitions without a WebGL context in JSDOM.
vi.mock('./Scene',()=>({WindScene:({sectionMode,bladeSkin}:{sectionMode:boolean;bladeSkin:boolean})=>createElement('div',{'data-testid':'scene','data-section':String(sectionMode),'data-skin':String(bladeSkin)})}))
vi.mock('~/i18n/experience',()=>({useExperienceI18n:()=>((text:string)=>text)}))
vi.mock('~/components/experiences/GuideTour',()=>({GuideTour:()=>null,GUIDE_REPLAY_EVENT:'oneworld:guide-replay'}))

let container:HTMLDivElement,root:Root
const byText=(text:string)=>Array.from(container.querySelectorAll('button')).find(b=>b.textContent?.includes(text))
const click=(button:HTMLButtonElement|undefined)=>{expect(button).toBeDefined();act(()=>button!.click())}
const scene=()=>container.querySelector('[data-testid=scene]')!
beforeEach(()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 vi.stubGlobal('matchMedia',()=>({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn()}))
 container=document.createElement('div');document.body.appendChild(container);root=createRoot(container)
 act(()=>root.render(createElement(WindTurbine,{controls:{registerInteraction:vi.fn(),finish:vi.fn()} as unknown as ExperienceControls})))
 click(byText('一片叶片'))
})
afterEach(()=>{act(()=>root.unmount());container.remove();vi.unstubAllGlobals()})

describe('blade inspection mode state',()=>{
 it('offers the skin control only where the skin is rendered and remembers the whole-blade preference',()=>{
  const skin=byText('透视叶片外形')!
  expect(skin.tabIndex).toBe(0);click(skin)
  expect(scene().getAttribute('data-skin')).toBe('false')
  click(byText('观察这个截面'))
  expect(scene().getAttribute('data-section')).toBe('true')
  expect(byText('透视叶片外形')).toBeUndefined()
  click(byText('完整叶片'))
  expect(scene().getAttribute('data-section')).toBe('false')
  expect(byText('透视叶片外形')?.getAttribute('aria-pressed')).toBe('true')
  expect(scene().getAttribute('data-skin')).toBe('false')
 })
 it('restores a solid blade and the default station after reset, with keyboard-addressable station buttons',()=>{
  click(byText('透视叶片外形'))
  const station=container.querySelector<HTMLButtonElement>('button[aria-label="站位 19"]')!
  expect(station.tabIndex).toBe(0);click(station)
  expect(station.getAttribute('aria-pressed')).toBe('true')
  click(byText('复原'));click(byText('一片叶片'))
  expect(scene().getAttribute('data-skin')).toBe('true')
  expect(byText('透视叶片外形')?.getAttribute('aria-pressed')).toBe('false')
  expect(container.querySelector('button[aria-label="站位 11"]')?.getAttribute('aria-pressed')).toBe('true')
 })
})
