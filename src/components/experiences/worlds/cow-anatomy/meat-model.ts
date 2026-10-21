/** Geometric teaching model. Length is a diagram ratio, never a tenderness score. */
export function fiberSpan(angleDegrees: number, thicknessMm: number) {
	const angle = (Math.max(0, Math.min(90, Number.isFinite(angleDegrees) ? angleDegrees : 90)) * Math.PI) / 180;
	const thickness = Math.max(0.5, Math.min(5, Number.isFinite(thicknessMm) ? thicknessMm : 1.5));
	return Math.min(30, thickness / Math.max(0.04, Math.sin(angle)));
}
export function seeded(index: number, seed: number) {
	const n = Math.sin(index * 127.1 + seed * 311.7) * 43758.5453123;
	return n - Math.floor(n);
}
