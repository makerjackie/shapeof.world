import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { replayFrame, replayValue, type ReplayTrack } from './neural-replay';
const root = 'public/assets/worlds/flybody/replay/v1/';
const manifest = JSON.parse(readFileSync(root + 'manifest.json', 'utf8'));
const buffer = (name: string) => {
	const b = gunzipSync(readFileSync(root + name + '.bin.gz'));
	return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
};
const read = (name: string): ReplayTrack => ({
	frames: new Float32Array(buffer(name + '-frames')),
	poses: new Float32Array(buffer(name + '-poses')),
	activity: new Uint32Array(buffer(name + '-activity')),
	offsets: new Uint32Array(buffer(name + '-offsets')),
	count: 250,
	dt: 0.01,
});
describe('computed neural and body recordings', () => {
	it('has silent baseline, actual responses, aligned clocks and finite body transforms', () => {
		for (const name of ['walk', 'left', 'right']) {
			const t = read(name);
			expect(t.frames.length).toBe(t.count * 12);
			expect(t.poses.length).toBe(t.count * manifest.segments.length * 16);
			expect(t.offsets[19]).toBe(0);
			expect(t.offsets[t.count] * 2).toBe(t.activity.length);
			expect(t.activity.length).toBeGreaterThan(1000);
			expect(Array.from(t.frames).every(Number.isFinite)).toBe(true);
			expect(Array.from(t.poses).every(Number.isFinite)).toBe(true);
			expect(Math.max(...Array.from({ length: 250 }, (_, i) => t.frames[i * 12 + 6]))).toBeGreaterThan(1);
			expect(replayFrame(t, 100)).toEqual({ a: 249, b: 249, mix: 0 });
			expect(replayValue(t, 0.305, 6)).toBeCloseTo((t.frames[30 * 12 + 6] + t.frames[31 * 12 + 6]) / 2);
		}
	});
	it('preserves opposing turn responses instead of relabelling one animation', () => {
		expect(replayValue(read('left'), 1, 8)).toBeGreaterThan(0.2);
		expect(replayValue(read('right'), 1, 8)).toBeLessThan(-0.2);
	});
});
