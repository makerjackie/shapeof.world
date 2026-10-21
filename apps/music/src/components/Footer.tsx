import { Link } from '@tanstack/react-router'

import { useI18n } from '~/i18n'
import { cleanSearch } from '~/lib/locale'

export function Footer() {
  const { t } = useI18n()
  return (
    <footer className="site-footer">
      <p>{t('footer.credit')}</p>
      <Link to="/handoff" search={cleanSearch}>{t('footer.handoff')}</Link>
      <Link to="/rights" search={cleanSearch}>{t('audio.permissions')}</Link>
    </footer>
  )
}
