import {describe,expect,it,vi} from 'vitest'
import {EffectPass,ToneMappingEffect,type Pass} from 'postprocessing'
import {PerspectiveCamera} from 'three'
import {disposeRetiredPass,trackComposerPasses} from './scene/composer-resources'

describe('postprocessing resource ownership',()=>{
  it('frees a retired effect program without disposing effects used by its replacement',()=>{
    const effect=new ToneMappingEffect(),retired=new EffectPass(new PerspectiveCamera(),effect)
    const dispose=vi.spyOn(effect,'dispose'),material=vi.spyOn(retired.fullscreenMaterial!,'dispose')
    disposeRetiredPass(retired)
    expect(material).toHaveBeenCalled();expect(dispose).not.toHaveBeenCalled()
    effect.dispose()
  })
  it('frees AO-owned targets/materials once, preserving shared geometry and depth',()=>{
    const target={dispose:vi.fn()},material={dispose:vi.fn()},sharedDepth={dispose:vi.fn()},geometry={dispose:vi.fn()}
    const pass={writeTargetInternal:target,effectShaderQuad:{material,_mesh:{geometry}},depthTexture:sharedDepth} as unknown as Pass
    disposeRetiredPass(pass);disposeRetiredPass(pass)
    expect(target.dispose).toHaveBeenCalledTimes(1);expect(material.dispose).toHaveBeenCalledTimes(1)
    expect(sharedDepth.dispose).not.toHaveBeenCalled();expect(geometry.dispose).not.toHaveBeenCalled()
  })
  it('does not dispose a primitive removed and re-added in the same commit',async()=>{
    const target={dispose:vi.fn()},pass={writeTargetInternal:target} as unknown as Pass
    const composer={passes:[pass],removePass(p:Pass){this.passes=this.passes.filter(x=>x!==p)}}
    const restore=trackComposerPasses(composer)
    composer.removePass(pass);composer.passes.push(pass);await Promise.resolve()
    expect(target.dispose).not.toHaveBeenCalled()
    composer.removePass(pass);await Promise.resolve();expect(target.dispose).toHaveBeenCalledTimes(1)
    restore()
  })
})
