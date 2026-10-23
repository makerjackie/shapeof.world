export type HistoryText = {zh: string; en: string}

export type HistoryEvent = {
  id: string
  date: string
  secondDate?: string
  title: HistoryText
  description: HistoryText
  sourceUrl: string
  additionalSourceUrl?: string
  china?: boolean
}

const wiki = (article: string) => `https://en.wikipedia.org/wiki/${article}`

/** Public historical milestones; month-only dates retain their original precision. */
export const HISTORY_EVENTS: readonly HistoryEvent[] = [
  {
    id: 'fission', date: '1938-12',
    title: {zh: '铀核裂变', en: 'Uranium fission'},
    description: {zh: '哈恩和施特拉斯曼发现铀核裂变；迈特纳和弗里施于 1939 年初发表解释。', en: 'Hahn and Strassmann discover uranium fission; Meitner and Frisch publish its explanation in early 1939.'},
    sourceUrl: wiki('Discovery_of_nuclear_fission'),
  },
  {
    id: 'chicago-pile', date: '1942-12-02',
    title: {zh: '芝加哥一号堆', en: 'Chicago Pile-1'},
    description: {zh: '第一次由人实现的自持核链式反应。', en: 'The first human-made, self-sustaining nuclear chain reaction.'},
    sourceUrl: wiki('Chicago_Pile-1'),
  },
  {
    id: 'trinity', date: '1945-07-16',
    title: {zh: '三位一体', en: 'Trinity'},
    description: {zh: '第一次核爆炸试验，使用内爆式装置。', en: 'The first nuclear explosion, using an implosion device.'},
    sourceUrl: wiki('Trinity_(nuclear_test)'),
  },
  {
    id: 'hiroshima-nagasaki', date: '1945-08-06', secondDate: '1945-08-09',
    title: {zh: '广岛与长崎', en: 'Hiroshima and Nagasaki'},
    description: {zh: '8 月 6 日广岛、8 月 9 日长崎遭原子弹轰炸；至 1945 年底，广岛死亡约 9 万至 16.6 万人，长崎约 6 万至 8 万人。', en: 'Hiroshima is bombed on 6 August and Nagasaki on 9 August; estimated deaths by the end of 1945 are 90,000–166,000 and 60,000–80,000, respectively.'},
    sourceUrl: wiki('Atomic_bombings_of_Hiroshima_and_Nagasaki'),
  },
  {
    id: 'rds-1', date: '1949-08-29',
    title: {zh: 'RDS-1', en: 'RDS-1'},
    description: {zh: '苏联进行第一次核试验。', en: 'The Soviet Union conducts its first nuclear test.'},
    sourceUrl: wiki('RDS-1'),
  },
  {
    id: 'ivy-mike', date: '1952-11-01',
    title: {zh: '常春藤麦克', en: 'Ivy Mike'},
    description: {zh: '第一次全尺寸两级热核试验。', en: 'The first full-scale test of a two-stage thermonuclear device.'},
    sourceUrl: wiki('Ivy_Mike'),
  },
  {
    id: 'castle-bravo', date: '1954-03-01',
    title: {zh: '城堡喝彩', en: 'Castle Bravo'},
    description: {zh: '试验当量约为 15 百万吨 TNT。', en: 'The test releases approximately 15 megatons of TNT equivalent.'},
    sourceUrl: wiki('Castle_Bravo'),
  },
  {
    id: 'tsar-bomba', date: '1961-10-30',
    title: {zh: '沙皇炸弹', en: 'Tsar Bomba'},
    description: {zh: '约 50 百万吨 TNT，是已进行核试验中的最大当量。', en: 'At about 50 megatons of TNT, the largest nuclear test ever conducted.'},
    sourceUrl: wiki('Tsar_Bomba'),
  },
  {
    id: 'partial-test-ban', date: '1963-08-05',
    title: {zh: '部分禁止核试验条约', en: 'Partial Test Ban Treaty'},
    description: {zh: '部分禁止核试验条约签署。', en: 'The Partial Test Ban Treaty is signed.'},
    sourceUrl: wiki('Partial_Nuclear_Test_Ban_Treaty'),
  },
  {
    id: 'china-596', date: '1964-10-16', china: true,
    title: {zh: '中国第一次核试验', en: 'China’s first nuclear test'},
    description: {zh: '596 试验成功；同一天，中国政府声明在任何时候、任何情况下都不首先使用核武器。', en: 'After the 596 test, China declares the same day that it will never initiate nuclear use, regardless of time or circumstances.'},
    sourceUrl: wiki('596_(nuclear_test)'), additionalSourceUrl: wiki('No_first_use#China'),
  },
  {
    id: 'china-thermonuclear', date: '1967-06-17', china: true,
    title: {zh: '中国第一颗氢弹', en: 'China’s first hydrogen bomb'},
    description: {zh: '第六次核试验，当量 3.3 百万吨 TNT；本展不展示其内部构型。', en: 'Test No. 6 releases 3.3 megatons of TNT equivalent; this exhibit does not show its internal configuration.'},
    sourceUrl: wiki('Test_No._6'),
  },
  {
    id: 'npt', date: '1968-07-01',
    title: {zh: '不扩散核武器条约', en: 'Non-Proliferation Treaty'},
    description: {zh: '不扩散核武器条约开放签署。', en: 'The Treaty on the Non-Proliferation of Nuclear Weapons opens for signature.'},
    sourceUrl: wiki('Treaty_on_the_Non-Proliferation_of_Nuclear_Weapons'),
  },
  {
    id: 'ctbt', date: '1996-09-24',
    title: {zh: '全面禁止核试验条约', en: 'Comprehensive Test Ban Treaty'},
    description: {zh: '全面禁止核试验条约开放签署。', en: 'The Comprehensive Nuclear-Test-Ban Treaty opens for signature.'},
    sourceUrl: wiki('Comprehensive_Nuclear-Test-Ban_Treaty'),
  },
]

export type TestMilestone = {date: string; name: HistoryText; sourceUrl: string}
export type TestInterval = {
  id: string
  country: HistoryText
  first: TestMilestone
  later: TestMilestone
  china?: boolean
}

export const TEST_INTERVALS: readonly TestInterval[] = [
  {
    id: 'us', country: {zh: '美国', en: 'United States'},
    first: {date: '1945-07-16', name: {zh: '三位一体', en: 'Trinity'}, sourceUrl: wiki('Trinity_(nuclear_test)')},
    later: {date: '1952-11-01', name: {zh: '常春藤麦克', en: 'Ivy Mike'}, sourceUrl: wiki('Ivy_Mike')},
  },
  {
    id: 'ussr', country: {zh: '苏联', en: 'Soviet Union'},
    first: {date: '1949-08-29', name: {zh: 'RDS-1', en: 'RDS-1'}, sourceUrl: wiki('RDS-1')},
    later: {date: '1955-11-22', name: {zh: 'RDS-37', en: 'RDS-37'}, sourceUrl: wiki('RDS-37')},
  },
  {
    id: 'uk', country: {zh: '英国', en: 'United Kingdom'},
    first: {date: '1952-10-03', name: {zh: '飓风', en: 'Hurricane'}, sourceUrl: wiki('Operation_Hurricane')},
    later: {date: '1957-11-08', name: {zh: '格拉普尔 X', en: 'Grapple X'}, sourceUrl: wiki('Operation_Grapple#Grapple_X')},
  },
  {
    id: 'france', country: {zh: '法国', en: 'France'},
    first: {date: '1960-02-13', name: {zh: '蓝色跳鼠', en: 'Gerboise Bleue'}, sourceUrl: wiki('Gerboise_Bleue')},
    later: {date: '1968-08-24', name: {zh: '老人星', en: 'Canopus'}, sourceUrl: wiki('Canopus_(nuclear_test)')},
  },
  {
    id: 'china', country: {zh: '中国', en: 'China'}, china: true,
    first: {date: '1964-10-16', name: {zh: '596', en: '596'}, sourceUrl: wiki('596_(nuclear_test)')},
    later: {date: '1967-06-17', name: {zh: '第六次核试验', en: 'Test No. 6'}, sourceUrl: wiki('Test_No._6')},
  },
]

/** Parse the published precision, without locale or time-zone dependent parsing. */
export function parseHistoryDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value)
  if (!match) throw new RangeError(`Invalid history date: ${value}`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3] ?? 1)
  const parsed = new Date(Date.UTC(year, month - 1, day))
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    throw new RangeError(`Invalid history date: ${value}`)
  }
  return parsed
}

/** Complete calendar months; remaining days are not rounded up. */
export function wholeCalendarMonths(from: string, to: string): number {
  if (from.length !== 10 || to.length !== 10) throw new RangeError('Month intervals require full calendar dates')
  const start = parseHistoryDate(from)
  const end = parseHistoryDate(to)
  if (end.getTime() < start.getTime()) throw new RangeError('End date must follow start date')
  return (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth()
    - Number(end.getUTCDate() < start.getUTCDate())
}
