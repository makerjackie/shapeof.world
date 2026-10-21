/** Directed, thresholded anatomical graph; this module does not simulate neurons. */
export type NeuralMeta = {
	count: number;
	types: string[];
	groups: string[];
	nodes: string;
	edges: string;
	nodeSha256: string;
	edgeSha256: string;
	sourceRows: number;
	retainedEdges: number;
	presets: number[];
};
export type NeuralData = {
	meta: NeuralMeta;
	positions: Float32Array;
	ids: Uint32Array;
	groups: Uint8Array;
	types: Uint32Array;
	adjacency: Uint32Array;
};
export type TraceEdge = { from: number; to: number; weight: number; depth: number };
export function decodeNeurons(meta: NeuralMeta, buffer: ArrayBuffer, edges: ArrayBuffer): NeuralData {
	if (buffer.byteLength !== meta.count * 24 || edges.byteLength !== meta.count * 24) throw new Error('Invalid MaleCNS data length');
	const view = new DataView(buffer),
		positions = new Float32Array(meta.count * 3),
		ids = new Uint32Array(meta.count),
		groups = new Uint8Array(meta.count),
		types = new Uint32Array(meta.count);
	for (let i = 0; i < meta.count; i++) {
		for (let j = 0; j < 3; j++) {
			const p = view.getFloat32(i * 24 + j * 4, true);
			if (!Number.isFinite(p)) throw new Error('Invalid soma position');
			positions[i * 3 + j] = p;
		}
		ids[i] = view.getUint32(i * 24 + 12, true);
		groups[i] = view.getUint32(i * 24 + 16, true);
		types[i] = view.getUint32(i * 24 + 20, true);
	}
	const adjacency = new Uint32Array(meta.count * 6),
		edgeView = new DataView(edges);
	for (let i = 0; i < adjacency.length; i++) adjacency[i] = edgeView.getUint32(i * 4, true);
	return { meta, positions, ids, groups, types, adjacency };
}
export function traceConnections(data: Pick<NeuralData, 'adjacency'>, start: number, hops = 3, blocked = -1): TraceEdge[] {
	const count = data.adjacency.length / 6;
	if (!Number.isInteger(start) || start < 0 || start >= count || start === blocked) return [];
	const found: TraceEdge[] = [],
		seen = new Set([start]);
	let frontier = [start];
	for (let depth = 0; depth < Math.min(4, Math.max(0, hops)); depth++) {
		const next: number[] = [];
		for (const from of frontier)
			for (let slot = 0; slot < 3; slot++) {
				const to = data.adjacency[from * 6 + slot * 2],
					weight = data.adjacency[from * 6 + slot * 2 + 1];
				if (weight < 5 || to >= count || to === blocked) continue;
				found.push({ from, to, weight, depth });
				if (!seen.has(to)) {
					seen.add(to);
					next.push(to);
				}
			}
		frontier = next;
	}
	return found;
}
