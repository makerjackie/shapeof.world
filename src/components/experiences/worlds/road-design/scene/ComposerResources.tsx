import {useContext,useLayoutEffect} from 'react'
import {EffectComposerContext} from '@react-three/postprocessing'
import {useThree} from '@react-three/fiber'
import {trackComposerPasses} from './composer-resources'

export function ComposerResources(){
  const {composer}=useContext(EffectComposerContext)
  const {gl,size,viewport}=useThree()
  useLayoutEffect(()=>trackComposerPasses(composer),[composer])
  // The installed wrapper watches CSS size, but not DPR. Otherwise only the
  // final canvas shrinks while all expensive offscreen passes stay at Retina.
  useLayoutEffect(()=>{
    composer.setSize(size.width,size.height)
    gl.domElement.dataset.postWidth=String(composer.inputBuffer.width)
    gl.domElement.dataset.postHeight=String(composer.inputBuffer.height)
  },[composer,gl,size.width,size.height,viewport.dpr])
  return null
}
