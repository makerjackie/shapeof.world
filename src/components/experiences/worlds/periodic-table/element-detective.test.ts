import {act,createElement} from 'react'
import {createRoot} from 'react-dom/client'
import {expect,it,vi} from 'vitest'
import {ElementDetective} from './element-detective'
const language=vi.hoisted(()=>({locale:'zh'}))
vi.mock('~/i18n',()=>({useI18n:()=>language}))
vi.mock('~/i18n/experience',()=>({useExperienceI18n:()=>(text:string)=>text}))
it('lets a wrong guess lead to a hint and a correct guess lead to the real specimen',()=>{
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const host=document.createElement('div'),root=createRoot(host),choose=vi.fn()
 try{
  act(()=>root.render(createElement(ElementDetective,{picture:e=>e.symbol,onChoose:choose,onInteract:()=>{}})))
  act(()=>host.querySelector<HTMLButtonElement>('[data-element="Ag"]')!.click())
  expect(host.textContent).toContain('它的熔点不到 30°C')
  expect(choose).not.toHaveBeenCalled()
  const ga=host.querySelector<HTMLButtonElement>('[data-element="Ga"]')!
  act(()=>ga.click());expect(host.textContent).toContain('找到了！');expect(choose).not.toHaveBeenCalled()
  act(()=>ga.click());expect(choose.mock.calls[0][0].symbol).toBe('Ga')
  act(()=>host.querySelector<HTMLButtonElement>('footer button:last-child')!.click())
  expect(host.textContent).toContain('铅笔和钻石');expect(host.querySelector('[data-miss=true]')).toBeNull()
 }finally{act(()=>root.unmount());vi.unstubAllGlobals()}
})

it('shows English clues, hints and explanations in English mode',()=>{
 language.locale='en'
 vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true)
 const host=document.createElement('div'),root=createRoot(host)
 try{
  act(()=>root.render(createElement(ElementDetective,{picture:e=>e.symbol,onChoose:()=>{},onInteract:()=>{}})))
  expect(host.textContent).toContain('Which metal melts at just 35°C?')
  expect(host.textContent).toContain('Give me a hint')
  act(()=>host.querySelector<HTMLButtonElement>('[data-element="Ag"]')!.click())
  expect(host.textContent).toContain('Its melting point is below 30°C.')
  act(()=>host.querySelector<HTMLButtonElement>('[data-element="Ga"]')!.click())
  expect(host.textContent).toContain('Gallium! It melts at about 29.8°C.')
 }finally{act(()=>root.unmount());language.locale='zh';vi.unstubAllGlobals()}
})
