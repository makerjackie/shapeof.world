// Apply preferences before the page paints; legacy language links become clean URLs.
(function () {
  var savedLanguage, savedTheme
  try { savedLanguage = localStorage.getItem('music.language'); savedTheme = localStorage.getItem('music.theme') } catch (e) {}
  var url = new URL(window.location.href)
  var legacyLanguage = url.searchParams.get('lang') || url.searchParams.get('language')
  if (savedLanguage !== 'zh' && savedLanguage !== 'en' && (legacyLanguage === 'zh' || legacyLanguage === 'en')) {
    savedLanguage = legacyLanguage
    try { localStorage.setItem('music.language', savedLanguage) } catch (e) {}
  }
  if (url.searchParams.has('lang') || url.searchParams.has('language')) {
    url.searchParams.delete('lang'); url.searchParams.delete('language')
    history.replaceState(history.state, '', url.pathname + url.search + url.hash)
  }
  var language = savedLanguage
  if (language !== 'zh' && language !== 'en') {
    var tags = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language]
    language = 'en'
    for (var i = 0; i < tags.length; i++) {
      var tag = String(tags[i] || '').toLowerCase().split('-')[0]
      if (tag === 'zh' || tag === 'en') { language = tag; break }
    }
  }
  document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en'
  if (language === 'zh') document.title = '世界的形状 — 原声'
  var theme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  document.documentElement.dataset.theme = theme
})()
