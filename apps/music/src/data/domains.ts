export type DomainId =
  | 'cosmos'
  | 'math-signals'
  | 'physics'
  | 'earth-climate'
  | 'life-body'
  | 'chem-materials'
  | 'ai-ml'
  | 'computing-engineering'
  | 'economy-society'

export type Domain = {
  id: DomainId
  name: string
  nameEn: string
  accent: string
  order: number
}

export const GLOBAL_CATEGORY = 'global'

export const domains: Array<Domain> = [
  { id: 'cosmos', name: '宇宙与天体', nameEn: 'Cosmos & Astronomy', accent: '#3d5f6b', order: 1 },
  { id: 'math-signals', name: '数学与信号', nameEn: 'Mathematics & Signals', accent: '#5c4f73', order: 2 },
  { id: 'physics', name: '物理', nameEn: 'Physics', accent: '#7a5436', order: 3 },
  { id: 'earth-climate', name: '地球·海洋·气候', nameEn: 'Earth, Ocean & Climate', accent: '#3f5d45', order: 4 },
  { id: 'life-body', name: '生物与人体', nameEn: 'Life & the Human Body', accent: '#2f5b50', order: 5 },
  { id: 'chem-materials', name: '化学与材料', nameEn: 'Chemistry and Materials', accent: '#7a6840', order: 6 },
  { id: 'ai-ml', name: 'AI 与机器学习', nameEn: 'AI & Machine Learning', accent: '#534e6a', order: 7 },
  { id: 'computing-engineering', name: '计算机与工程', nameEn: 'Computing & Engineering', accent: '#4e5963', order: 8 },
  { id: 'economy-society', name: '经济与社会', nameEn: 'Economy & Society', accent: '#6e5434', order: 9 },
]

const domainById = new Map(domains.map((domain) => [domain.id, domain]))

export function getDomain(id: string): Domain | undefined {
  return domainById.get(id as DomainId)
}

export function categoryAccent(category: string): string {
  return getDomain(category)?.accent ?? '#173c32'
}

export function categoryLabel(category: string, locale: 'en' | 'zh'): string {
  if (category === GLOBAL_CATEGORY) return locale === 'zh' ? '全局' : 'Global'
  const domain = getDomain(category)
  if (!domain) return category
  return locale === 'zh' ? domain.name : domain.nameEn
}
