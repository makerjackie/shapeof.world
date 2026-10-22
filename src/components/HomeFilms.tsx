import { Link } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'

import type { FilmSummary } from '~/data/films'
import { useI18n } from '~/i18n'
import { FilmCard } from './FilmCard'
import '~/styles/films.css'

const HOME_FILM_LIMIT = 3

export function HomeFilms({ films }: { films: FilmSummary[] }) {
  const { t } = useI18n()
  if (!films.length) return null
  return (
    <section className="home-section home-films-section" id="home-films" aria-labelledby="home-films-title">
      <header className="home-section-head">
        <div><h2 id="home-films-title">{t('films.title')}</h2></div>
        <Link to="/films" className="home-section-more">{t('films.viewAll')}<ArrowRight aria-hidden="true" /></Link>
      </header>
      <ul className="film-grid">
        {films.slice(0, HOME_FILM_LIMIT).map((film) => <li key={film.slug}><FilmCard film={film} /></li>)}
      </ul>
    </section>
  )
}
