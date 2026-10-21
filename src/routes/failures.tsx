import { createFileRoute, redirect } from '@tanstack/react-router'
import { localeFromPathname, localizePathname, publicPathnameFromHref } from '~/lib/locale'

export const Route = createFileRoute('/failures')({
  beforeLoad: ({ location }) => {
    const locale = localeFromPathname(publicPathnameFromHref(location.publicHref, location.pathname))
    const query = new URLSearchParams(location.searchStr).get('fq')
    const search = query ? `?${new URLSearchParams({ mq: query })}` : ''
    throw redirect({ href: `${localizePathname('/making', locale)}${search}`, statusCode: 301 })
  },
})
