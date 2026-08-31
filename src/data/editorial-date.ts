export const editorialTimeZone = 'Asia/Shanghai'

export function getEditorialDayKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: editorialTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}
