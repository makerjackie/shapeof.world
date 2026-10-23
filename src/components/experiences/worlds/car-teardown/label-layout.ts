/** Screen-space leaders: choose the nearest side, preserve vertical anchor order,
 * then pack labels within the available height. Shared by every teardown level. */
export type LeaderAnchor = {id: string; x: number; y: number; visible: boolean}
export function layoutLeaders(
	anchors: LeaderAnchor[],
	bounds: {top: number; bottom: number; gap: number; centerX?: number},
) {
	const visible = anchors.filter((a) => a.visible && Number.isFinite(a.x) && Number.isFinite(a.y))
	if (!visible.length) return []
	const centerX =
		bounds.centerX ??
		(Math.min(...visible.map((a) => a.x)) + Math.max(...visible.map((a) => a.x))) / 2
	return ([true, false] as const).flatMap((left) => {
		const column = visible
			.filter((a) => a.x <= centerX === left)
			.sort((a, b) => a.y - b.y || a.id.localeCompare(b.id))
		const gap = Math.min(bounds.gap, (bounds.bottom - bounds.top) / Math.max(1, column.length - 1))
		const ys = column.map((a) => Math.max(bounds.top, Math.min(bounds.bottom, a.y)))
		for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + gap)
		if (ys.length) ys[ys.length - 1] = Math.min(ys[ys.length - 1], bounds.bottom)
		for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i], ys[i + 1] - gap)
		return column.map((anchor, i) => ({...anchor, left, labelY: ys[i]}))
	})
}
