import type { Instruments } from './measurements'
import type { AnatomyId } from './anatomy'
import type { Reading, Slice, Vec3 } from './fields'
export type CampfireStats = { fps: number; time: number; grid: string; pixelScale: number }
export type CampfireRuntime = {
  setSlice(patch: Partial<Slice>): void
  setPlayback(paused: boolean, speed: number): void
  setSound(on: boolean): Promise<boolean>
  setOccluded(on: boolean): void
  setFuel(factor: number): void
  gust(): void
  setGravity(g: number): void
  setBlue(on: boolean): void
  setAnnotations(on: boolean): void
  selectAnnotation(id: AnatomyId, cut?: boolean): { position: Vec3; slice: Slice } | null
  focusRoot(): void
  resetCamera(): void
  probeAt(point: Vec3): Promise<Reading | null>
  dispose(): void
}
export function createCampfire(canvas: HTMLCanvasElement, options: {
  quality?: 'low' | 'med'; onMetrics?(data: Instruments): void;
  signal: AbortSignal; onProgress(stage: number): void; onReading(reading: Reading | null): void;
  onStats(stats: CampfireStats): void; onError(error: Error): void; onInteract(): void;
}): Promise<CampfireRuntime>
