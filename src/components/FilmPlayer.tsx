import { useEffect, useRef, useState } from 'react'

import type { FilmDetail } from '~/data/films'
import { useI18n } from '~/i18n'
import { trackEvent } from '~/lib/analytics'
import {
  FILM_PLAYER_STORAGE_KEY,
  type FilmPlayerKind,
  bilibiliBvid,
  bilibiliPlayerUrl,
  chooseFilmPlayer,
  parseFilmPlayer,
} from '~/lib/film-player'

function readStored(): FilmPlayerKind | undefined {
  try {
    return parseFilmPlayer(window.localStorage.getItem(FILM_PLAYER_STORAGE_KEY))
  } catch {
    return undefined
  }
}

function writeStored(kind: FilmPlayerKind) {
  try {
    window.localStorage.setItem(FILM_PLAYER_STORAGE_KEY, kind)
  } catch {
    /* ignore */
  }
}

async function fetchCountry(signal: AbortSignal): Promise<string | undefined> {
  try {
    const response = await fetch('/api/geo', { signal, cache: 'no-store' })
    if (!response.ok) return undefined
    const { country } = (await response.json()) as { country?: unknown }
    return typeof country === 'string' ? country : undefined
  } catch {
    return undefined
  }
}

/**
 * The server always renders the self-hosted player (or a ?player= override),
 * so cached HTML is the same for every visitor. The browser then picks the
 * Bilibili player for mainland China or when the viewer chose it.
 */
export function FilmPlayer({ film, override }: { film: FilmDetail; override?: FilmPlayerKind }) {
  const { t } = useI18n()
  const bvid = bilibiliBvid(film.watch.bilibili)
  const [kind, setKind] = useState<FilmPlayerKind>(bvid ? chooseFilmPlayer({ override }) : 'native')
  const played = useRef(false)

  useEffect(() => {
    if (!bvid || override) return
    const stored = readStored()
    if (stored) {
      setKind(stored)
      return
    }
    const controller = new AbortController()
    void fetchCountry(controller.signal).then((country) => {
      if (!controller.signal.aborted) setKind(chooseFilmPlayer({ country }))
    })
    return () => controller.abort()
  }, [bvid, override])

  const switchTo = (next: FilmPlayerKind) => {
    setKind(next)
    writeStored(next)
  }

  return (
    <>
      {kind === 'bilibili' && bvid ? (
        <div className="film-player film-player--embed">
          <iframe
            key={bvid}
            src={bilibiliPlayerUrl(bvid)}
            title={t('films.bilibiliPlayer')}
            allow="fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation"
          />
        </div>
      ) : (
        <video
          key={film.slug}
          className="film-player"
          src={film.video}
          poster={film.poster}
          controls
          playsInline
          preload="metadata"
          onPlay={() => {
            if (played.current) return
            played.current = true
            trackEvent({ event: 'film_play', value: film.slug })
          }}
        />
      )}
      {bvid && (
        <p className="film-player-switch">
          <button type="button" onClick={() => switchTo(kind === 'bilibili' ? 'native' : 'bilibili')}>
            {kind === 'bilibili' ? t('films.playerNative') : t('films.playerBilibili')}
          </button>
        </p>
      )}
    </>
  )
}
