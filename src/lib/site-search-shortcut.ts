export function isSiteSearchShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'isComposing' | 'key' | 'metaKey' | 'shiftKey'>,
): boolean {
  return !event.isComposing
    && !event.altKey
    && !event.shiftKey
    && (event.ctrlKey || event.metaKey)
    && event.key.toLocaleLowerCase() === 'k'
}
