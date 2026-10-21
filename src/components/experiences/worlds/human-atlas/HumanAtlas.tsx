import './styles/HumanAtlas.css'

import {ArrowCounterClockwise, MagnifyingGlass, Stack, X} from '@phosphor-icons/react'
import {useCallback, useEffect, useMemo, useState} from 'react'

import type {ExperienceControls} from '~/components/ExperienceShell'
import {Freebar} from '~/components/experiences/Freebar'
import {GhostHint} from '~/components/experiences/GhostHint'
import {useExperienceI18n} from '~/i18n/experience'
import {useI18n} from '~/i18n'

import {AnatomyScene} from './scene'
import {
  ATLAS_URL,
  DEFAULT_VISIBLE,
  FEATURED_CONCEPT_NAMES,
  ORGAN_PRESET,
  STRUCTURE_NOTES,
  SYSTEM_LABELS,
  SYSTEM_NOTES,
  SYSTEMS,
  type Atlas,
  type Concept,
  type SceneState,
  type SystemId,
  type View,
  structureNote,
} from './anatomy'
import {anatomySearchHaystack, translateAnatomyName} from './anatomy-names'

const WORLD_ID = 'human-atlas'
const INITIAL: SceneState = {
  explode: 0,
  visible: DEFAULT_VISIBLE,
  selected: [],
  isolate: false,
  view: 'three-quarter',
  rotate: true,
  reset: 0,
}

function sameSystems(left: ReadonlyArray<SystemId>, right: ReadonlyArray<SystemId>) {
  return left.length === right.length && right.every((id) => left.includes(id))
}

export function HumanAtlas({controls}: {controls: ExperienceControls}) {
  const tx = useExperienceI18n()
  const {locale} = useI18n()
  const chinese = locale !== 'en'
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  const [state, setState] = useState<SceneState>(INITIAL)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [systemsOpen, setSystemsOpen] = useState(false)
  const [chosen, setChosen] = useState<Concept | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const abort = new AbortController()
    setProgress(0)
    setError('')
    fetch(ATLAS_URL, {signal: abort.signal})
      .then((response) => {
        if (!response.ok) throw new Error('anatomy-catalogue-failed')
        return response.json() as Promise<Atlas>
      })
      .then(setAtlas)
      .catch((caught) => {
        if (caught instanceof DOMException && caught.name === 'AbortError') return
        setError('anatomy-catalogue-failed')
      })
    return () => abort.abort()
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !(event.target instanceof HTMLInputElement) && !(event.target instanceof HTMLTextAreaElement)) {
        event.preventDefault()
        setSearchOpen(true)
      }
      if (event.key === 'Escape') {
        setSearchOpen(false)
        setSystemsOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const parts = useMemo(() => new Map(atlas?.parts.map((part) => [part.id, part])), [atlas])
  const counts = useMemo(
    () => Object.fromEntries(SYSTEMS.map((system) => [system.id, atlas?.parts.filter((part) => part.system === system.id).length ?? 0])),
    [atlas],
  )
  const activeSystems = SYSTEMS.filter((system) => (counts[system.id] ?? 0) > 0)
  const selectedParts = state.selected.map((id) => parts.get(id)).filter((part) => part !== undefined)
  const selected = selectedParts[0]
  const selectedSystem = SYSTEMS.find((system) => system.id === selected?.system)
  const visibleCount = atlas?.parts.filter((part) =>
    state.isolate ? state.selected.includes(part.id) : state.visible.includes(part.system) || state.selected.includes(part.id),
  ).length ?? 0

  const nameOf = useCallback((english: string) => (chinese ? translateAnatomyName(english) : english), [chinese])
  const labelFor = useCallback((id: string) => {
    const part = parts.get(id)
    return part ? nameOf(part.name) : id
  }, [nameOf, parts])

  const results = useMemo(() => {
    if (!atlas) return []
    const term = query.trim().toLowerCase()
    if (!term) {
      return FEATURED_CONCEPT_NAMES
        .map((name) => atlas.concepts.find((concept) => concept.name.toLowerCase() === name))
        .filter((concept): concept is Concept => Boolean(concept))
    }
    return atlas.concepts
      .filter((concept) => anatomySearchHaystack(concept.name).includes(term) || concept.id.toLowerCase().includes(term))
      .sort((left, right) => left.name.length - right.name.length)
      .slice(0, 80)
  }, [atlas, query])

  const choose = (concept: Concept) => {
    controls.registerInteraction()
    setChosen(concept)
    setState((current) => ({...current, selected: concept.elements, isolate: false, rotate: false}))
    setSearchOpen(false)
    setSystemsOpen(false)
  }

  const choosePart = (id: string) => {
    const part = parts.get(id)
    if (!part) return
    controls.registerInteraction()
    setChosen({id: part.conceptId, name: part.name, elements: [id]})
    setState((current) => ({...current, selected: [id], isolate: false, rotate: false}))
    setSearchOpen(false)
    setSystemsOpen(false)
  }

  const toggleSystem = (id: SystemId) => {
    controls.registerInteraction()
    setState((current) => ({
      ...current,
      selected: [],
      isolate: false,
      visible: current.visible.includes(id) ? current.visible.filter((item) => item !== id) : [...current.visible, id],
    }))
  }

  const reset = () => {
    controls.registerInteraction()
    setState((current) => ({...INITIAL, visible: DEFAULT_VISIBLE, rotate: !reducedMotion, reset: current.reset + 1}))
    setChosen(null)
    setSearchOpen(false)
    setSystemsOpen(false)
  }

  const note = chosen && selected
    ? (STRUCTURE_NOTES[chosen.name.toLowerCase()] ? tx(structureNote(chosen.name, selected.system) ?? '') : tx(SYSTEM_NOTES[selected.system]))
    : ''

  const caption = state.isolate
    ? nameOf(chosen?.name ?? '')
    : state.explode > 0.95
      ? tx('解剖清单')
      : state.explode > 0.05
        ? tx('结构正在分开')
        : tx('成年男性参照')

  const errorCopy = error === 'webgl-unavailable'
    ? tx('这个浏览器无法启动三维查看器。请改用支持 WebGL 的浏览器。')
    : error === 'webgl-lost'
      ? tx('三维会话被设备暂停。请重新载入后继续。')
      : error === 'anatomy-file-incomplete'
        ? tx('解剖文件不完整。请重新载入。')
        : tx('解剖模型没能载入。请重新载入后继续。')

  return (
    <div className="ha-experience">
      {atlas && (
        <AnatomyScene
          atlas={atlas}
          state={{...state, inspectorOpen: Boolean(chosen && selectedParts.length > 0)}}
          labelFor={labelFor}
          reducedMotion={reducedMotion}
          onSelect={choosePart}
          onProgress={(value) => {
            setProgress(value)
            if (value === 100) setError('')
          }}
          onError={setError}
          onInteract={controls.registerInteraction}
        />
      )}

      <aside className={`ha-systems ${systemsOpen ? 'is-open' : ''}`} data-experience-overlay="true" aria-label={tx('解剖系统')}>
        <div className="ha-systems-head">
          <span>{tx('系统')}</span>
          <button type="button" className="ha-icon-button ha-systems-close" onClick={() => setSystemsOpen(false)} aria-label={tx('关闭系统')}>
            <X weight="bold" />
          </button>
        </div>
        <div className="ha-presets" role="group" aria-label={tx('系统预设')}>
          <button type="button" aria-pressed={sameSystems(state.visible, activeSystems.map((item) => item.id))} onClick={() => { controls.registerInteraction(); setState((current) => ({...current, selected: [], isolate: false, visible: activeSystems.map((item) => item.id)})) }}>{tx('全部')}</button>
          <button type="button" aria-pressed={state.visible.length === 1 && state.visible[0] === 'skeletal'} onClick={() => { controls.registerInteraction(); setState((current) => ({...current, selected: [], isolate: false, visible: ['skeletal']})) }}>{tx('骨骼')}</button>
          <button type="button" aria-pressed={sameSystems(state.visible, ORGAN_PRESET)} onClick={() => { controls.registerInteraction(); setState((current) => ({...current, selected: [], isolate: false, visible: ORGAN_PRESET})) }}>{tx('器官')}</button>
        </div>
        <div className="ha-system-list">
          {activeSystems.map((system) => (
            <label className={`ha-system-row ${state.visible.includes(system.id) ? 'is-on' : ''}`} key={system.id}>
              <button type="button" className="ha-system-name" onClick={() => { controls.registerInteraction(); setState((current) => ({...current, visible: [system.id], isolate: false, selected: []})) }}>
                <i style={{background: system.color}} />
                {tx(SYSTEM_LABELS[system.id])}
                <span>{counts[system.id]}</span>
              </button>
              <input
                type="checkbox"
                checked={state.visible.includes(system.id)}
                onChange={() => toggleSystem(system.id)}
                aria-label={tx(SYSTEM_LABELS[system.id])}
              />
            </label>
          ))}
        </div>
        <div className="ha-systems-foot">
          <span>{visibleCount.toLocaleString()} {tx('件可见')}</span>
          <button type="button" onClick={() => { controls.registerInteraction(); setState((current) => ({...current, visible: [], selected: [], isolate: false})) }}>{tx('全部隐藏')}</button>
        </div>
      </aside>

      {searchOpen && (
        <section className="ha-search" data-experience-overlay="true" aria-label={tx('查找结构')}>
          <div className="ha-search-head">
            <span>{tx('查找结构')}</span>
            <button type="button" className="ha-icon-button" onClick={() => setSearchOpen(false)} aria-label={tx('关闭搜索')}>
              <X weight="bold" />
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tx('心脏、股骨、颅神经…')}
            aria-label={tx('搜索已命名的解剖结构')}
          />
          <ul>
            {results.length === 0 && <li className="ha-search-empty">{tx('没有匹配的结构。')}</li>}
            {results.map((concept) => (
              <li key={concept.id}>
                <button type="button" onClick={() => choose(concept)}>
                  <span>{nameOf(concept.name)}</span>
                  <small>{concept.elements.length} {tx('件')}</small>
                </button>
              </li>
            ))}
          </ul>
          <p>{query ? tx('最多显示 80 条。把词再写具体一些，更容易找到更小的结构。') : tx('可以从主要器官开始，也可以搜索全部已命名结构。')}</p>
        </section>
      )}

      <p className="ha-caption" data-experience-overlay="true">{caption}</p>

      {chosen && selected && (
        <aside className="ha-detail" data-experience-overlay="true">
          <div className="ha-detail-head">
            <i style={{background: selectedSystem?.color}} />
            <div>
              <small>{tx(SYSTEM_LABELS[selected.system])}</small>
              <strong>{nameOf(chosen.name)}</strong>
            </div>
            <button type="button" className="ha-icon-button" onClick={() => { setChosen(null); setState((current) => ({...current, selected: [], isolate: false})) }} aria-label={tx('清除选择')}>
              <X weight="bold" />
            </button>
          </div>
          <p>{note}</p>
          {!STRUCTURE_NOTES[chosen.name.toLowerCase()] && <small>{tx('系统概述 · 结构按源解剖识别')}</small>}
          <dl>
            <div><dt>{tx('图集编号')}</dt><dd>{chosen.id}</dd></div>
            <div><dt>{tx('选中件数')}</dt><dd>{state.selected.length.toLocaleString()}</dd></div>
          </dl>
          {selectedParts.length > 1 && (
            <div className="ha-members">
              <h3>{tx('包含的结构')}</h3>
              {selectedParts.slice(0, 40).map((part) => (
                <button type="button" key={part.id} onClick={() => choosePart(part.id)}>{nameOf(part.name)}</button>
              ))}
              {selectedParts.length > 40 && <p>{tx('还有')} {selectedParts.length - 40} {tx('件建模结构。')}</p>}
            </div>
          )}
          <div className="ha-detail-actions">
            <button type="button" className={state.isolate ? 'is-on' : ''} onClick={() => { controls.registerInteraction(); setState((current) => ({...current, isolate: !current.isolate, explode: 0})) }}>
              {state.isolate ? tx('显示周围解剖') : tx('单独查看')}
            </button>
            <button type="button" onClick={() => { setChosen(null); setState((current) => ({...current, selected: [], isolate: false})) }}>{tx('清除选择')}</button>
          </div>
        </aside>
      )}

      {progress < 100 && !error && (
        <div className="ha-loading" role="status" data-experience-overlay="true">
          <strong>{tx('正在准备解剖')}</strong>
          <span>{progress}% · {tx('载入')} {atlas?.parts.length.toLocaleString() ?? '2,234'} {tx('件')}</span>
          <i><b style={{width: `${progress}%`}} /></i>
        </div>
      )}
      {error && (
        <div className="ha-loading is-error" role="alert" data-experience-overlay="true">
          <p>{errorCopy}</p>
          <button type="button" onClick={() => location.reload()}>{tx('重新载入')}</button>
        </div>
      )}

      <Freebar
        className="ha-freebar"
        ariaLabel={tx('人体图集操作')}
        primaryControlBudget={1}
        secondaryDefault="closed"
        secondary={(
          <div className="ha-secondary">
            <div className="experience-freebar-seg" role="group" aria-label={tx('视角')}>
              {([
                ['three-quarter', tx('¾')],
                ['front', tx('前')],
                ['side', tx('侧')],
                ['back', tx('后')],
              ] as Array<[View, string]>).map(([view, label]) => (
                <button
                  type="button"
                  key={view}
                  className={state.view === view ? 'is-active' : ''}
                  aria-pressed={state.view === view}
                  disabled={state.explode > 0.8 && view !== 'front'}
                  onClick={() => { controls.registerInteraction(); setState((current) => ({...current, view, reset: current.reset + 1, rotate: false})) }}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className="ha-tool" aria-pressed={searchOpen} onClick={() => { setSystemsOpen(false); setSearchOpen((open) => !open) }}>
              <MagnifyingGlass weight="bold" />
              <span>{tx('查找')}</span>
            </button>
            <button type="button" className="ha-tool ha-systems-toggle" aria-pressed={systemsOpen} onClick={() => { setSearchOpen(false); setSystemsOpen((open) => !open) }}>
              <Stack weight="bold" />
              <span>{tx('系统')}</span>
            </button>
            <button type="button" className="ha-tool" onClick={reset}>
              <ArrowCounterClockwise weight="bold" />
              <span>{tx('重置')}</span>
            </button>
          </div>
        )}
      >
        <div className="experience-freebar-field ha-explode">
          <label htmlFor="ha-explode">{tx('拆开身体')} <output>{Math.round(state.explode * 100)}%</output></label>
          <input
            id="ha-explode"
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round(state.explode * 100)}
            aria-valuetext={`${Math.round(state.explode * 100)}%`}
            onInput={(event) => {
              controls.registerInteraction()
              const value = Number((event.target as HTMLInputElement).value) / 100
              setState((current) => ({...current, explode: value, view: value > 0.8 ? 'front' : current.view, rotate: false}))
            }}
          />
        </div>
      </Freebar>

      <GhostHint worldId={WORLD_ID} gesture={{type: 'scrub', target: '#ha-explode', label: tx('拖开身体，看每一件结构分开')}} />
    </div>
  )
}
