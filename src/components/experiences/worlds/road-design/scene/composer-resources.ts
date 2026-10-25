import { EffectPass, type Effect, type Pass } from 'postprocessing'

type Disposable = { dispose:()=>void }
const disposed = new WeakSet<object>()

/** R3F intentionally does not dispose <primitive> objects. The installed
 * postprocessing wrapper removes passes without disposing them, and n8ao 1.10
 * has nested fullscreen materials that Pass.dispose does not visit. Ownership
 * matters here: effect instances, scene/camera and the composer's depth texture
 * can still be in use by the replacement pass. */
export function disposeRetiredPass(pass:Pass) {
  if(disposed.has(pass))return
  disposed.add(pass)
  if(pass instanceof EffectPass){
    // Detach listeners and borrowed effects before freeing the old program.
    // Protected in the typings, present in the installed 6.x runtime. Keep this
    // compatibility access here and cover it with a real EffectPass in tests.
    ;(pass as unknown as {setEffects:(effects:Effect[])=>void}).setEffects([])
    pass.dispose()
    return
  }
  const resources=pass as unknown as Record<string,unknown>
  if(!resources.writeTargetInternal)return
  for(const name of ['writeTargetInternal','readTargetInternal','outputTargetInternal','accumulationRenderTarget','depthDownsampleTarget','transparencyRenderTargetDWFalse','transparencyRenderTargetDWTrue','bluenoise']){
    (resources[name] as Disposable|undefined)?.dispose()
  }
  for(const name of ['copyQuad','accumulationQuad','effectShaderQuad','poissonBlurQuad','effectCompositerQuad','depthDownsampleQuad','depthCopyPass']){
    // FullScreenTriangle.geometry is module-global; only its material is owned.
    (resources[name] as {material:Disposable}|undefined)?.material.dispose()
  }
}

export function trackComposerPasses(composer:{passes:Pass[];removePass:(pass:Pass)=>void}) {
  const remove=composer.removePass,pending=new Set<Pass>()
  const flush=()=>{
    for(const pass of pending)if(!composer.passes.includes(pass))disposeRetiredPass(pass)
    pending.clear()
  }
  composer.removePass=function(pass){
    remove.call(composer,pass);pending.add(pass)
    // The same primitive can be removed and re-added in one React commit.
    queueMicrotask(flush)
  }
  return ()=>{composer.removePass=remove;flush()}
}
