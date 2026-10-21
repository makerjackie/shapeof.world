/** Load a classic film script. Vite turns small ?url assets into data URLs, which
 * the site's script-src CSP rejects when used as a script src. Inline those
 * trusted, build-time assets instead; larger scripts keep their normal URL. */
export function loadClassicFilmScript(url: string, owner: string, filename: string): Promise<HTMLScriptElement> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.dataset.classicFilm = owner
    script.dataset.filename = filename
    if (url.startsWith('data:text/javascript;base64,')) {
      const binary = atob(url.slice('data:text/javascript;base64,'.length))
      const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
      script.textContent = new TextDecoder().decode(bytes)
      document.head.appendChild(script)
      resolve(script)
      return
    }
    script.src = url
    script.async = false
    script.onload = () => resolve(script)
    script.onerror = () => {
      script.remove()
      reject(new Error(`${owner}: failed to load ${filename}`))
    }
    document.head.appendChild(script)
  })
}

/** Legacy film methods read the global FILM at render time. Restore the active
 * world's own runtime when returning to a film already loaded in this tab. */
export function activateClassicFilmRuntime<T extends object>(film: T): void {
  ;(window as unknown as { FILM: T }).FILM = film
}
