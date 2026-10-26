import type { DemoReplay } from './replay'

/** A main-thread recording is an opaque resource in component props. Samples
 * can contain thousands of background poses; dev performance tracks need only
 * the recording identity, not a recursive copy of every vehicle in every frame. */
export class DemoRecording implements DemoReplay {
  #recording:DemoReplay
  constructor(recording:DemoReplay){this.#recording=recording}
  get movementId(){return this.#recording.movementId}
  get samples(){return this.#recording.samples}
  get duration(){return this.#recording.duration}
  get complete(){return this.#recording.complete}
}
