/** Translate complete authored strings and the literal fragments of HTML templates. */
export function createWorldTranslator(locale: string, dictionary: Readonly<Record<string, string>>) {
  if (locale !== 'en' || Object.keys(dictionary).length === 0) return (value: string) => value
  const phrases = Object.keys(dictionary).sort((a, b) => b.length - a.length)
  const pattern = new RegExp(phrases.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu')
  return (value: string): string => dictionary[value] ?? value.replace(pattern, match => dictionary[match])
}
