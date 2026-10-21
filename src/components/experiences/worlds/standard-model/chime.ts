/** Original, quiet synthesized chimes; no game recordings or remote audio assets. */
export class ChimeSound {
	private context: AudioContext | null = null
	private voices: OscillatorNode[] = []

	play(stars: number) {
		try {
			const context = this.context ??= new AudioContext()
			this.stop()
			void context.resume().then(() => {
				if (this.context !== context || document.hidden) return
				const now = context.currentTime
				const tone = (frequency: number, at: number, length: number, volume: number) => {
					const oscillator = context.createOscillator(), gain = context.createGain()
					oscillator.type = 'sine'; oscillator.frequency.setValueAtTime(frequency, at)
					gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(volume, at + .018); gain.gain.exponentialRampToValueAtTime(.0001, at + length)
					oscillator.connect(gain); gain.connect(context.destination); oscillator.start(at); oscillator.stop(at + length + .02)
					oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices = this.voices.filter(v => v !== oscillator) }
					this.voices.push(oscillator)
				}
				tone(196, now, .45, .035); tone(392, now + .15, .55, .025)
				const notes = [784, 988, 1175, 1568, 1976]
				for (let i = 0; i < stars; i++) { tone(notes[i], now + .53 + i * .09, .65, .03); tone(notes[i] * 2, now + .53 + i * .09, .3, .006) }
				tone(392, now + 2.24, .45, .018)
			}).catch(() => { /* Audio is optional when the browser has no usable output context. */ })
		} catch { /* Audio is optional when the browser has no usable output context. */ }
	}

	stop() { for (const voice of this.voices) { try { voice.stop() } catch { /* already stopped */ } } this.voices = [] }

	dispose() { this.stop(); const context = this.context; this.context = null; if (context) void context.close().catch(() => { }) }
}
