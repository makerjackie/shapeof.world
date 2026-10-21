import { describe, it, expect } from 'vitest';
import { traceConnections, decodeNeurons, type NeuralMeta } from './neural-network';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

describe('anatomical graph tracing', () => {
	const adjacency = new Uint32Array(5 * 6);
	adjacency.set([1, 20, 2, 10], 0);
	adjacency.set([3, 9], 6);
	adjacency.set([3, 8], 12);
	adjacency.set([0, 7, 4, 4], 18);
	it('respects direction, cycles, contact threshold and hop limit', () => {
		expect(traceConnections({ adjacency }, 0, 1).map((e) => e.to)).toEqual([1, 2]);
		expect(traceConnections({ adjacency }, 0, 3).map((e) => e.to)).toEqual([1, 2, 3, 3, 0]);
		expect(traceConnections({ adjacency }, 4)).toEqual([]);
	});
	it('retains an alternative route when one intermediate cell is excluded', () => {
		const trace = traceConnections({ adjacency }, 0, 3, 1);
		expect(trace.some((e) => e.to === 3)).toBe(true);
		expect(trace.some((e) => e.to === 1 || e.from === 1)).toBe(false);
		expect(traceConnections({ adjacency }, 0, 3, 0)).toEqual([]);
	});
	it('checks shipped measured data hashes, IDs, coordinates and edges', () => {
		const root = 'public/assets/worlds/flybody/neural/';
		const meta = JSON.parse(readFileSync(root + 'manifest.json', 'utf8')) as NeuralMeta;
		const nodes = readFileSync(root + meta.nodes),
			edges = readFileSync(root + meta.edges);
		expect(createHash('sha256').update(nodes).digest('hex')).toBe(meta.nodeSha256);
		expect(createHash('sha256').update(edges).digest('hex')).toBe(meta.edgeSha256);
		const data = decodeNeurons(
			meta,
			nodes.buffer.slice(nodes.byteOffset, nodes.byteOffset + nodes.length),
			edges.buffer.slice(edges.byteOffset, edges.byteOffset + edges.length),
		);
		expect(new Set(data.ids).size).toBe(meta.count);
		expect(meta.count).toBeGreaterThan(130000);
		expect(data.ids[meta.presets[0]]).toBe(10001);
		// Validate every edge without creating hundreds of thousands of matcher objects.
		const invalidEdges: number[] = [];
		for (let i = 0; i < data.adjacency.length; i += 2)
			if (data.adjacency[i + 1]) {
				if (data.adjacency[i] >= meta.count || data.adjacency[i + 1] < 5) invalidEdges.push(i);
			}
		expect(invalidEdges).toEqual([]);
	});
});
