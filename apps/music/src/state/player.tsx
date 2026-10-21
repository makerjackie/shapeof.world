import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { Track } from '~/data/catalog'

type PlayerValue = {
  current: Track | null
  queue: Track[]
  playing: boolean
  time: number
  duration: number
  volume: number
  playTrack: (track: Track, queue?: Track[]) => void
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (seconds: number) => void
  setVolume: (value: number) => void
}

const PlayerContext = createContext<PlayerValue | null>(null)

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentRef = useRef<Track | null>(null)
  const queueRef = useRef<Track[]>([])
  const playRef = useRef<(track: Track, queue: Track[]) => void>(() => {})
  const [current, setCurrent] = useState<Track | null>(null)
  const [queue, setQueue] = useState<Track[]>([])
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(0.8)

  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'none'
    audio.volume = 0.8
    audioRef.current = audio

    const onTime = () => setTime(audio.currentTime)
    const onMeta = () => setDuration(Number.isFinite(audio.duration) ? audio.duration : 0)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onEnded = () => {
      const list = queueRef.current
      const now = currentRef.current
      if (!now || list.length <= 1) {
        setPlaying(false)
        return
      }
      const index = list.findIndex((track) => track.id === now.id)
      const following = list[(index + 1) % list.length]
      if (following) playRef.current(following, list)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.pause()
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
    }
  }, [])

  const playByTrack = useCallback((track: Track, nextQueue: Track[]) => {
    const audio = audioRef.current
    if (!audio) return
    const same = currentRef.current?.id === track.id && audio.getAttribute('src') === track.assets.preview
    audio.loop = track.loop?.seamless === true && Boolean(track.loop.asset) && track.assets.preview === track.assets[track.loop.asset!]
    currentRef.current = track
    queueRef.current = nextQueue
    setCurrent(track)
    setQueue(nextQueue)
    setDuration(track.duration || 0)
    if (!same) {
      audio.preload = 'none'
      audio.src = track.assets.preview
      setTime(0)
    }
    void audio.play().catch(() => setPlaying(false))
  }, [])
  playRef.current = playByTrack

  const playTrack = useCallback((track: Track, nextQueue?: Track[]) => {
    playByTrack(track, nextQueue && nextQueue.length > 0 ? nextQueue : [track])
  }, [playByTrack])

  const toggle = useCallback(() => {
    const audio = audioRef.current
    const track = currentRef.current
    if (!audio || !track) return
    if (!audio.getAttribute('src')) {
      playByTrack(track, queueRef.current)
      return
    }
    if (audio.paused) void audio.play().catch(() => setPlaying(false))
    else audio.pause()
  }, [playByTrack])

  const next = useCallback(() => {
    const list = queueRef.current
    const now = currentRef.current
    if (!now || list.length === 0) return
    const index = list.findIndex((track) => track.id === now.id)
    const following = list[(index + 1) % list.length]
    if (following) playByTrack(following, list)
  }, [playByTrack])

  const prev = useCallback(() => {
    const audio = audioRef.current
    const list = queueRef.current
    const now = currentRef.current
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0
      return
    }
    if (!now || list.length === 0) return
    const index = list.findIndex((track) => track.id === now.id)
    const previous = list[(index - 1 + list.length) % list.length]
    if (previous) playByTrack(previous, list)
  }, [playByTrack])

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current
    if (!audio || !audio.getAttribute('src')) return
    audio.currentTime = Math.max(0, seconds)
    setTime(audio.currentTime)
  }, [])

  const setVolume = useCallback((value: number) => {
    const next = Math.min(1, Math.max(0, value))
    setVolumeState(next)
    if (audioRef.current) audioRef.current.volume = next
  }, [])

  const value = useMemo<PlayerValue>(() => ({
    current,
    queue,
    playing,
    time,
    duration: duration || current?.duration || 0,
    volume,
    playTrack,
    toggle,
    next,
    prev,
    seek,
    setVolume,
  }), [current, queue, playing, time, duration, volume, playTrack, toggle, next, prev, seek, setVolume])

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerValue {
  const value = useContext(PlayerContext)
  if (!value) throw new Error('usePlayer must be used within PlayerProvider')
  return value
}
