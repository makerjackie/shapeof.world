import { useI18n } from '~/i18n'

export const LICENSE_URL = '/audio-license.txt'
export const COMMERCIAL_CONTACT = 'mailto:hi@makerjackie.com?subject=Shape%20of%20the%20World%20music%20commercial%20licence'
const NOTICE = {
  zh: '非商用 · CC BY-NC 4.0 · 商用请先取得作者授权',
  en: "Non-commercial · CC BY-NC 4.0 · Commercial use requires the author's permission",
}

/** The library's licence, always in both languages (the current one first), linked to the licence text. */
export function LicenseNotice({ className = 'license-notice', compact = false }: { className?: string; compact?: boolean }) {
  const { locale, t } = useI18n()
  const other = locale === 'zh' ? 'en' : 'zh'
  return (
    <p className={className} lang={locale === 'zh' ? 'zh-CN' : 'en'}>
      <a href={LICENSE_URL}>
        <strong>{NOTICE[locale]}</strong>
        <span lang={other === 'zh' ? 'zh-CN' : 'en'}>{NOTICE[other]}</span>
      </a>
      {compact ? null : <a className="license-contact" href={COMMERCIAL_CONTACT}>{t('license.contact')} ↗</a>}
    </p>
  )
}
