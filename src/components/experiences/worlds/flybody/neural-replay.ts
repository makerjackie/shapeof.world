/** Precomputed upstream model outputs. Neural time is shared by every visual channel. */
export type ReplayMode = 'walk' | 'left' | 'right';
export type ReplayStatus = { time: number; duration: number; channels: number[]; speed: number; mode: ReplayMode };
export const emptyReplay = (): ReplayStatus => ({ time: 0, duration: 2.5, channels: [0, 0, 0, 0, 0, 0], speed: 0, mode: 'walk' });
export type ReplayTrack = {
	frames: Float32Array;
	poses: Float32Array;
	activity: Uint32Array;
	offsets: Uint32Array;
	count: number;
	dt: number;
};
export type ReplayData = { segments: string[]; tracks: Record<ReplayMode, ReplayTrack> };
export function replayFrame(track: ReplayTrack, time: number) {
	const sample = Math.max(0, Math.min(track.count - 1, time / track.dt));
	const a = Math.floor(sample),
		b = Math.min(track.count - 1, a + 1);
	return { a, b, mix: sample - a };
}
export function replayValue(track: ReplayTrack, time: number, column: number) {
	const { a, b, mix } = replayFrame(track, time);
	return track.frames[a * 12 + column] * (1 - mix) + track.frames[b * 12 + column] * mix;
}
export async function loadReplay(signal: AbortSignal): Promise<ReplayData> {
	const base = '/assets/worlds/flybody/replay/v1/';
	const get = async (name: string) => {
		const r = await fetch(base + name, { signal });
		if (!r.ok) throw Error(`Replay HTTP ${r.status}`);
		return r;
	};
	const manifest = (await (await get('manifest.json')).json()) as {
		segments: string[];
		tracks: { name: ReplayMode; frames: number; dt: number }[];
	};
	const pairs = await Promise.all(
		manifest.tracks.map(async (t) => {
			const buffers = await Promise.all(
				['frames', 'poses', 'activity', 'offsets'].map((s) =>
					get(`${t.name}-${s}.bin.gz`).then(async (r) => {
						const bytes = await r.arrayBuffer(),
							magic = new Uint8Array(bytes);
						// Static hosts may already decode Content-Encoding: gzip.
						return magic[0] === 0x1f && magic[1] === 0x8b
							? new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()
							: bytes;
					}),
				),
			);
			const track: ReplayTrack = {
				frames: new Float32Array(buffers[0]),
				poses: new Float32Array(buffers[1]),
				activity: new Uint32Array(buffers[2]),
				offsets: new Uint32Array(buffers[3]),
				count: t.frames,
				dt: t.dt,
			};
			if (
				track.frames.length !== t.frames * 12 ||
				track.poses.length !== t.frames * manifest.segments.length * 16 ||
				track.offsets.length !== t.frames + 1 ||
				track.offsets[t.frames] * 2 !== track.activity.length
			)
				throw Error('Invalid replay data');
			return [t.name, track] as const;
		}),
	);
	return { segments: manifest.segments, tracks: Object.fromEntries(pairs) as ReplayData['tracks'] };
}
