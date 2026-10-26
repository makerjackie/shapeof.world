import type { Reading, Slice, Vec3 } from './fields'
export type CampfireStats = { fps: number; time: number; grid: string; pixelScale: number }
export type CampfireRuntime = {
  setSlice(patch: Partial<Slice>): void
  setPlayback(paused: boolean, speed: number): void
  setSound(on: boolean): Promise<boolean>
  focusRoot(): void
  resetCamera(): void
  probeAt(point: Vec3): Promise<Reading | null>
  dispose(): void
}
export function createCampfire(canvas: HTMLCanvasElement, options: {
  signal: AbortSignal; onProgress(stage: number): void; onReading(reading: Reading | null): void;
  onStats(stats: CampfireStats): void; onError(error: Error): void; onInteract(): void;
}): Promise<CampfireRuntime>
