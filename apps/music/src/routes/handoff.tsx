import { AiMusic } from '~/components/AiMusic'
import { CopyAssign } from '~/components/CopyAssign'
import { useI18n } from '~/i18n'
import { assignPackText } from '~/lib/assign'

export function HandoffPage() {
  const { locale, t } = useI18n()
  const text = assignPackText(locale)

  return (
    <div className="page handoff">
      <p className="kicker">{t('nav.assign')}</p>
      <h1>{t('handoff.title')}</h1>
      <p className="lede">{t('handoff.lede')}</p>
      <AiMusic />
      <div className="resource-grid">
        <a href="/llms.txt"><span>01 / llms.txt ↗</span><h2>{t('handoff.instructions')}</h2><p>{t('handoff.guideDesc')}</p></a>
        <a href="/catalog.json"><span>02 / catalog.json ↗</span><h2>{t('handoff.json')}</h2><p>{t('handoff.dataDesc')}</p></a>
        <a href="/taxonomy.json"><span>03 / taxonomy.json ↗</span><h2>{t('handoff.taxonomy')}</h2><p>{t('handoff.taxonomyDesc')}</p></a>
        <a href="/audio-index.json"><span>04 / audio-index.json ↗</span><h2>{locale === 'zh' ? '音乐、音效与环境声' : 'Music, effects & ambience'}</h2><p>{locale === 'zh' ? '按类型与风格读取小分页，筛选商用权限。' : 'Small pages by type and style, with commercial-use permissions.'}</p></a>
        <a href="/packs.json"><span>05 / packs.json ↗</span><h2>{t('audio.packs')}</h2><p>{t('audio.packsLede')}</p></a>
        <a href="/rights.json"><span>06 / rights.json ↗</span><h2>{t('audio.permissions')}</h2><p>{locale === 'zh' ? '逐条权限档案；未知权限不会默认为可商用。' : 'Per-asset permission profiles. Unknown is never treated as commercially cleared.'}</p></a>
      </div>
      <div className="action-row">
        <CopyAssign className="btn-solid" />

      </div>
      <details><summary>{t('handoff.preview')}</summary><pre className="handoff-pre">{text}</pre></details>
    </div>
  )
}
