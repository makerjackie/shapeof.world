/** Set VITE_CAR_ASSET_BASE to a versioned R2 directory at publication time.
 * Local development serves the prepared .local/car-assets/v2 directory via Vite /@fs.
 * Asset files are intentionally not bundled into the Worker or committed. */
export const CAR_ASSET_BASE = (import.meta.env.VITE_CAR_ASSET_BASE || '/assets/car-teardown/v2').replace(/\/$/, '')
export const carAssetUrl = (file: string) => `${CAR_ASSET_BASE}/${file}`
export const ASSET_INSTALL = {
	engineCenterX: 1.56,
	crankY: 0.305,
	sumpY: 0.08,
	cylinder1X: 1.704,
	cylinderSpacing: 0.096,
} as const
export type AssetProgress = {phase: 'body' | 'mechanisms'; loaded: number; total: number; ready: boolean; error?: string}

export const CAR_ASSET_BYTES: Record<string, number> = {
	'car.glb': 1845852,
	'studio.hdr': 1529320,
	'engine.glb': 685492,
}
