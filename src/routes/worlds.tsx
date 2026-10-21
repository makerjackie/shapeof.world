import { createFileRoute, notFound, redirect } from '@tanstack/react-router'
import { localeFromPathname, localizePathname, publicPathnameFromHref, stripLocalePrefix } from '~/lib/locale'

// /worlds 已并入首页目录区（#home-worlds），旧链接统一跳转
export const Route = createFileRoute('/worlds')({
  beforeLoad: ({ location }) => {
    if (stripLocalePrefix(publicPathnameFromHref(location.publicHref, location.pathname)).replace(/\/$/, '') !== '/worlds') throw notFound()
    const locale = localeFromPathname(publicPathnameFromHref(location.publicHref, location.pathname))
    throw redirect({ href: `${localizePathname('/', locale)}${location.searchStr}#home-worlds`, statusCode: 301 })
  },
})
