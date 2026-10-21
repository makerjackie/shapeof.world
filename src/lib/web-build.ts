import release from '~/data/web-release.json'

type WebBuild = { version: string; commit: string; channel: 'production' | 'local' }
declare const __WEB_BUILD__: WebBuild

export const webBuild: WebBuild = typeof __WEB_BUILD__ === 'undefined'
  ? { version: release.version, commit: 'local', channel: 'local' }
  : __WEB_BUILD__
