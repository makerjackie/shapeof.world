import { useCallback, useRef, useState } from 'react'
import type { ExperienceControls } from '~/components/ExperienceShell'

/** 五拍（问、猜、做、看、懂），走完之后是实验室。 */
export type Beat = 'ask' | 'guess' | 'do' | 'see' | 'know' | 'lab'

export const BEATS: ReadonlyArray<Beat> = ['ask', 'guess', 'do', 'see', 'know', 'lab']

/** 第几拍：问 0 … 懂 4，实验室 5。画布里比大小用。 */
export function beatIndex(beat: Beat) {
  return BEATS.indexOf(beat)
}

/**
 * 五拍的状态。世界自己决定什么时候进下一拍（拖够了、切完了），这里只管
 * 记住在哪一拍、猜了什么，并在走到“懂”或实验室时告诉外壳这个世界已经走完。
 *
 * `start` 是开场那一拍：开场先有一段自己会动的画面就从 'ask' 开始，
 * 画面一出来就让人猜就从 'guess' 开始。
 */
export function useFiveBeats<G extends string>(controls: ExperienceControls, { start = 'guess' as Beat } = {}) {
  const [beat, setBeat] = useState<Beat>(start)
  const [guess, setGuess] = useState<G | null>(null)
  // 动画循环里读的是 ref，不等 React 重新渲染。
  const beatRef = useRef<Beat>(beat)
  // 外壳每次渲染都给一份新的 controls；记住最新的，goto 就能一直不变。
  const controlsRef = useRef(controls)
  controlsRef.current = controls

  const goto = useCallback((next: Beat) => {
    beatRef.current = next
    setBeat(next)
    if (next === 'know' || next === 'lab') controlsRef.current.finish()
  }, [])

  /** 点了一个选项，或者点了“不猜”（null）：记下来，进入“做”。 */
  const choose = useCallback((value: G | null) => {
    controlsRef.current.registerInteraction()
    setGuess(value)
    goto('do')
  }, [goto])

  /** 从头再走一遍。世界自己的画面要另外复位。 */
  const restart = useCallback(() => {
    setGuess(null)
    goto(start)
  }, [goto, start])

  return { beat, beatRef, guess, goto, choose, restart }
}
