/** Original generative score. No recordings, sampled instruments or Golden Record music. */
export class VoyagerScore {
	private context: AudioContext | null = null
	private master: GainNode | null = null
	private voices = new Set<OscillatorNode>()
	private beat = -1
	async enable() {
		if (!this.context) {
			this.context = new AudioContext()
			this.master = this.context.createGain()
			this.master.gain.value = 0.13
			this.master.connect(this.context.destination)
		}
		await this.context.resume()
	}
	stop() {
		for (const voice of this.voices) {
			try {
				voice.stop()
			} catch {
				/* already ended */
			}
		}
		this.voices.clear()
		this.beat = -1
	}
	update(elapsed: number, chapter: number, active: boolean, future: boolean) {
		if (!this.context || !this.master) return
		if (!active) {
			if (this.voices.size) this.stop()
			return
		}
		const beat = Math.floor(elapsed / (future ? 2.4 : 1.2))
		if (beat === this.beat) return
		if (Math.abs(beat - this.beat) > 1) this.stop()
		this.beat = beat
		const harmony = [0, 5, 9, 2][Math.floor(chapter / 2) % 4]
		const melody = [0, 7, 12, 16, 14, 7, 9, 4][beat % 8]
		const notes = beat % 4 === 0 ? [45 + harmony, 52 + harmony, 64 + harmony + melody] : [64 + harmony + melody]
		for (const note of notes) {
			const oscillator = this.context.createOscillator(),
				gain = this.context.createGain()
			const now = this.context.currentTime
			oscillator.type = 'sine'
			oscillator.frequency.value = 440 * 2 ** ((note - 69) / 12)
			gain.gain.setValueAtTime(0, now)
			gain.gain.linearRampToValueAtTime(note < 60 ? 0.25 : 0.11, now + 0.22)
			gain.gain.exponentialRampToValueAtTime(0.0001, now + (future ? 5 : 3.5))
			oscillator.connect(gain)
			gain.connect(this.master)
			oscillator.start()
			oscillator.stop(now + 5.2)
			this.voices.add(oscillator)
			oscillator.onended = () => {
				this.voices.delete(oscillator)
				oscillator.disconnect()
				gain.disconnect()
			}
		}
	}
	dispose() {
		this.stop()
		void this.context?.close()
		this.context = null
		this.master = null
	}
}
