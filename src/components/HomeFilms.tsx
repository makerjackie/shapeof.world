import { Link } from '@tanstack/react-router'
import { ArrowRight } from '@phosphor-icons/react'

import type { FilmCatalogItem } from '~/data/films'
import { useI18n } from '~/i18n'
import { FilmCatalogCard } from './FilmCard'
import '~/styles/films.css'

export function HomeFilms({ films }: { films: FilmCatalogItem[] }) {
  const { t } = useI18n()
  if (!films.length) return null
  return (
    <section className="home-section home-films-section" id="home-films" aria-labelledby="home-films-title">
      <header className="home-section-head">
        <div><h2 id="home-films-title">{t('films.title')}</h2></div>
        <Link to="/films" className="home-section-more">{t('films.viewAll')}<ArrowRight aria-hidden="true" /></Link>
      </header>
      <ul className="film-grid">
        {films.map((film) => <li key={film.id}><FilmCatalogCard item={film} /></li>)}
      </ul>
    </section>
  )
}
