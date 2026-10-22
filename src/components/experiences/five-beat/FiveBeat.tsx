import './FiveBeat.css'

import type { ReactNode } from 'react'
import { useI18n } from '~/i18n'
import { useExperienceI18n } from '~/i18n/experience'

import { beatIndex, type Beat } from './useFiveBeats'

/*
 * 五拍外壳的几块卡片内容。世界自己画场景、管手势、摆卡片的位置；
 * 这里只出卡片里的那几样东西，让每个世界的五拍长得一样、用起来一样。
 * 文案由世界翻译好再传进来，外壳只带自己的几句。
 */

type Action = { label: ReactNode; onClick: () => void }

/** 外壳自己的话：世界的英文词典里有就用世界的（有的世界把“看”译成 Look），没有就用这里的英文。 */
function useShellText() {
  const tx = useExperienceI18n()
  const { locale } = useI18n()
  return (zh: string, en: string) => {
    if (locale !== 'en') return zh
    const own = tx(zh)
    return own === zh ? en : own
  }
}

const stepNames: Array<[string, string]> = [['问', 'Ask'], ['猜', 'Guess'], ['做', 'Do'], ['看', 'See'], ['懂', 'Get it']]

/** 顶部的“问 猜 做 看 懂”。到了实验室五个都点亮；给了 labLabel 就只显示它。 */
export function BeatSteps({ beat, labLabel }: { beat: Beat; labLabel?: ReactNode }) {
  const text = useShellText()
  const at = beatIndex(beat)
  return (
    <ol className="beat-steps" aria-label={text('五步', 'Five steps')}>
      {beat === 'lab' && labLabel ? (
        <li className="is-on">{labLabel}</li>
      ) : (
        stepNames.map(([zh, en], index) => (
          <li key={zh} className={index === at ? 'is-on' : index < at ? 'is-done' : undefined}>
            {text(zh, en)}
          </li>
        ))
      )}
    </ol>
  )
}

/** 下划线小字按钮：不猜、拖不动、直接进实验室、再走一遍。 */
export function SkipButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="beat-skip" onClick={onClick}>
      {children}
    </button>
  )
}

/** “猜”：一句问题，两三个一点就选的选项，和“不猜，直接…”。 */
export function GuessCard<G extends string>({
  question,
  options,
  onChoose,
  skip,
  toLab,
}: {
  question: ReactNode
  options: ReadonlyArray<{ id: G; label: ReactNode }>
  /** 选了哪个；点“不猜”时是 null。 */
  onChoose: (guess: G | null) => void
  skip: ReactNode
  /** 想直接自由玩的人，从这里跳过五拍。 */
  toLab?: Action
}) {
  const skipButton = <SkipButton onClick={() => onChoose(null)}>{skip}</SkipButton>
  return (
    <>
      <p className="beat-q">{question}</p>
      <div className="beat-options">
        {options.map((option) => (
          <button key={option.id} type="button" className="beat-option" onClick={() => onChoose(option.id)}>
            {option.label}
          </button>
        ))}
      </div>
      {toLab ? (
        <div className="beat-row">
          {skipButton}
          <SkipButton onClick={toLab.onClick}>{toLab.label}</SkipButton>
        </div>
      ) : (
        skipButton
      )}
    </>
  )
}

/**
 * “做”：一句手势提示（hint 高亮，tail 接着说），世界自己的读数放在 children，
 * 最后是拖不动时的退路。给了 meter 就和退路排在一行。
 */
export function DoHint({
  hint,
  tail,
  fallback,
  meter,
  children,
}: {
  hint: ReactNode
  tail?: ReactNode
  fallback?: Action
  meter?: ReactNode
  children?: ReactNode
}) {
  const fallbackButton = fallback && <SkipButton onClick={fallback.onClick}>{fallback.label}</SkipButton>
  return (
    <>
      <p>
        <span className="beat-hint">{hint}</span>
        {tail}
      </p>
      {children}
      {meter ? (
        <div className="beat-row">
          {meter}
          {fallbackButton}
        </div>
      ) : (
        fallbackButton
      )}
    </>
  )
}

/**
 * “看”：先把结果和他的猜测对上（verdict 是“猜对了”这类判断，mine 复述他猜的），
 * 再是世界自己的结果，最后一个按钮去“懂”。没猜就不传 verdict。
 */
export function BeatResult({
  verdict,
  right,
  mine,
  next,
  children,
}: {
  verdict?: ReactNode
  right?: boolean
  mine?: ReactNode
  next: Action
  children?: ReactNode
}) {
  return (
    <>
      {verdict && (
        <p className="beat-result">
          <span className={`beat-verdict ${right ? 'is-right' : 'is-miss'}`}>{verdict}</span>
          {mine && <span className="beat-mine">{mine}</span>}
        </p>
      )}
      {children}
      <div className="beat-row">
        <button type="button" className="beat-primary" onClick={next.onClick}>
          {next.label}
        </button>
      </div>
    </>
  )
}

type NextQuestion = { question: ReactNode; kicker?: ReactNode } & ({ href: string } | { onClick: () => void })

/**
 * “懂”：一句结论，一行出处；cta 是结论下面最显眼的那个按钮（比如进博物馆），
 * 接着是下一个问题和这个主题的短片，children 放“再走一遍”这类收尾。
 */
export function Conclusion({
  sentence,
  source,
  cta,
  next,
  film,
  children,
}: {
  sentence: ReactNode
  source: ReactNode
  cta?: ReactNode
  next?: NextQuestion
  film?: { title: ReactNode; href: string }
  children?: ReactNode
}) {
  const text = useShellText()
  const nextBody = next && (
    <>
      <small>{next.kicker ?? text('下一个问题', 'Next question')}</small>
      <span>{next.question}</span>
    </>
  )
  return (
    <>
      <p className="beat-conclusion">{sentence}</p>
      <p className="beat-source">{source}</p>
      {cta}
      {next &&
        ('href' in next ? (
          <a className="beat-next" href={next.href}>
            {nextBody}
          </a>
        ) : (
          <button type="button" className="beat-next" onClick={next.onClick}>
            {nextBody}
          </button>
        ))}
      {film && (
        <a className="beat-next" href={film.href}>
          <small>{text('看这个问题的短片', 'Watch the film')}</small>
          <span>{film.title}</span>
        </a>
      )}
      {children}
    </>
  )
}
