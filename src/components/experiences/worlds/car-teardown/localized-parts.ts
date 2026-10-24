import { useI18n } from '~/i18n'
import type { TeardownText } from './teardown-types'

/** Part records own both languages; avoid duplicating the engineering catalog in the UI dictionary. */
export function usePartText() {
	const { locale } = useI18n()
	return (text: TeardownText) => (locale === 'en' ? text.en : text.zh)
}
