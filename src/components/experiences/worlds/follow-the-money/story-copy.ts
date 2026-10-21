import {
  destShare,
  formatLength,
  formatMoney,
  hiddenTax,
  lifetimeSpend,
  lifetimesIn,
  secondsPerLifetime,
  stackHeight,
  type Flow,
  type Locale,
  type Profile,
} from './money-model'
import { STORY_ITEMS, STORY_STOPS } from './scene/engine'

export type StoryLine = { title: string; body: string }

const round = (value: number) => Math.round(value)
const per100 = (flow: Flow, profile: Profile, dest: Parameters<typeof destShare>[2]) => round(destShare(flow, profile, dest) * 100)

function item(profile: Profile, id: string): Flow {
  return profile.items.find((f) => f.id === id) ?? profile.items[0]
}

function duration(seconds: number, locale: Locale) {
  if (seconds < 100) return locale === 'zh' ? `${round(seconds)} 秒` : `${round(seconds)} seconds`
  const minutes = seconds / 60
  const text = minutes < 10 ? minutes.toFixed(1).replace(/\.0$/, '') : String(round(minutes))
  return locale === 'zh' ? `${text} 分钟` : `${text} minutes`
}

function wan(value: number) {
  return (value / 1e4).toLocaleString('en-US', { maximumFractionDigits: value >= 1e6 ? 0 : 1 })
}

export function storyCopy(profile: Profile, locale: Locale): Array<StoryLine> {
  const life = lifetimeSpend(profile)
  const lifeH = stackHeight(life)
  const items = STORY_ITEMS[profile.id]
  const first = item(profile, items.first)
  const second = item(profile, items.second)
  const tax = hiddenTax(profile)
  const stops = STORY_STOPS[profile.id].map((id) => profile.ruler.find((r) => r.id === id)!)
  const [smallStop, defenseStop, gdpStop] = stops
  const gdpKm = stackHeight(gdpStop.amount) / 1000
  const lifeMoney = formatMoney(life, profile, locale)
  const height = formatLength(lifeH, locale)

  if (profile.id === 'cn') {
    const firstFlow = first
    const fuel = second
    if (locale === 'zh') {
      return [
        {
          title: '一辈子的钱，叠起来多高？',
          body: `按 2025 年城镇居民人均每年消费 ${profile.annualSpend.toLocaleString('en-US')} 元、预期寿命 ${profile.lifeExpectancy} 岁算，一辈子约 ${lifeMoney}。换成百元钞，这一摞有 ${height}。`,
        },
        {
          title: '抽出一张，去吃顿饭',
          body: '餐馆收下 100 元，先留下厨师的工资、店里的利润和税，剩下的付给菜农、肉厂和电厂。钱每往上游走一站，就再被切一刀。',
        },
        {
          title: '切到最后，一分不少',
          body: `约 ${per100(firstFlow, profile, 'wages')} 元成了厨师、农民和工人的工资，${per100(firstFlow, profile, 'profit')} 元是企业利润，${per100(firstFlow, profile, 'depreciation')} 元留作机器和房子的折旧，${per100(firstFlow, profile, 'tax')} 元是税，${per100(firstFlow, profile, 'imports')} 元付给了国外。你花掉的钱，就是别人的收入。`,
        },
        {
          title: '不交个税，也一直在交税',
          body: `增值税、消费税藏在价格里：每花 100 元，约 ${(tax.share * 100).toFixed(1)} 元是税，一辈子约 ${formatMoney(tax.amount, profile, locale)}。按全国财政支出的比例，其中约 ${formatMoney(tax.defenseFromHiddenTax, profile, locale)}用于国防，在这摞钱里是 ${formatLength(stackHeight(tax.defenseFromHiddenTax), locale)}厚的一层。`,
        },
        {
          title: '中国一年的 GDP 有多高？',
          body: `用你的一辈子当尺子：它是 ${wan(lifetimesIn(profile, gdpStop.amount))} 万个一辈子，叠起来约 ${wan(gdpKm)} 万公里。路上先经过腾讯一天的收入（${formatLength(stackHeight(smallStop.amount), locale)}），和全国一年的国防支出（每 ${duration(secondsPerLifetime(profile, defenseStop.amount), locale)}花掉一个一辈子）。`,
        },
        {
          title: '换一样东西，钱走另一条路',
          body: `加一箱油，约 ${per100(fuel, profile, 'tax')} 元是税，${per100(fuel, profile, 'imports')} 元付给了国外，大多是原油；吃顿饭，${per100(firstFlow, profile, 'wages')} 元是工资。`,
        },
      ]
    }
    return [
      {
        title: 'How tall is a lifetime of spending?',
        body: `An urban resident in China spends about ¥${profile.annualSpend.toLocaleString('en-US')} a year (2025) and can expect to live ${profile.lifeExpectancy} years: about ${lifeMoney} in all. In ¥100 notes, the stack is ${height} tall.`,
      },
      {
        title: 'Take one note, buy a meal',
        body: 'The restaurant keeps the cooks’ pay, its profit and its taxes, then pays farms, meat plants and the power company. Every step up the supply chain, the note is cut again.',
      },
      {
        title: 'Cut to the end: not a cent lost',
        body: `About ¥${per100(firstFlow, profile, 'wages')} becomes the pay of cooks, farmers and workers, ¥${per100(firstFlow, profile, 'profit')} is profit, ¥${per100(firstFlow, profile, 'depreciation')} covers worn-out machines and buildings, ¥${per100(firstFlow, profile, 'tax')} is tax and ¥${per100(firstFlow, profile, 'imports')} goes abroad. The money you spend is someone else’s income.`,
      },
      {
        title: 'No income tax? You still pay tax',
        body: `VAT and excise duties are built into prices: about ¥${(tax.share * 100).toFixed(1)} of every ¥100, or ${formatMoney(tax.amount, profile, locale)} over a lifetime. Spent the way the national budget is, about ${formatMoney(tax.defenseFromHiddenTax, profile, locale)} of it goes to defense: a ${formatLength(stackHeight(tax.defenseFromHiddenTax), locale)} layer of the stack.`,
      },
      {
        title: 'How tall is a year of China’s GDP?',
        body: `With one lifetime as the ruler, it is ${(lifetimesIn(profile, gdpStop.amount) / 1e6).toFixed(1)} million lifetimes, a stack about ${(Math.round(gdpKm / 1000) * 1000).toLocaleString('en-US')} km high. On the way up: a day of Tencent revenue (${formatLength(stackHeight(smallStop.amount), locale)}) and a year of defense spending, one lifetime every ${duration(secondsPerLifetime(profile, defenseStop.amount), locale)}.`,
      },
      {
        title: 'Spend it on something else',
        body: `Fill the tank and about ¥${per100(fuel, profile, 'tax')} is tax, ¥${per100(fuel, profile, 'imports')} goes abroad, mostly for crude oil. At a restaurant, ¥${per100(firstFlow, profile, 'wages')} is wages.`,
      },
    ]
  }

  const meal = first
  const phone = second
  const defenseLives = lifetimesIn(profile, defenseStop.amount)
  const geoNear = gdpKm < 35786
  if (locale === 'zh') {
    return [
      {
        title: '一辈子的钱，叠起来多高？',
        body: `美国人平均每人每年花约 ${(Math.round(profile.annualSpend / 100) * 100).toLocaleString('en-US')} 美元买商品和服务（2024 年），预期寿命 ${profile.lifeExpectancy} 岁：一辈子约 ${lifeMoney}。换成百元美钞，这一摞有 ${height}。`,
      },
      {
        title: '抽出一张，去吃顿饭',
        body: '餐馆收下 100 美元，先留下厨师的工资、自己的盈余和税，再付钱给农场、食品厂和电力公司。钱每往上游走一站，就再被切一刀。',
      },
      {
        title: '切到最后，一分不少',
        body: `约 ${per100(meal, profile, 'wages')} 美元成了工资，${per100(meal, profile, 'surplus')} 美元是企业盈余（含折旧），${per100(meal, profile, 'tax')} 美元是税，${per100(meal, profile, 'imports')} 美元付给了国外。你花掉的钱，就是别人的收入。`,
      },
      {
        title: '收据上不一定写，\n但你一直在交税',
        body: `销售税、消费税和房产税藏在价格里：每花 100 美元约 ${tax.share * 100 >= 10 ? round(tax.share * 100) : (tax.share * 100).toFixed(1)} 美元，一辈子约 ${formatMoney(tax.amount, profile, locale)}，大多交给州和地方政府。联邦政府和国防主要靠所得税和工资税。`,
      },
      {
        title: `美国国防部\n每 ${duration(secondsPerLifetime(profile, defenseStop.amount), locale)}花掉一个一辈子`,
        body: `2025 财年国防支出 ${formatMoney(defenseStop.amount, profile, locale)}，等于 ${wan(defenseLives)} 万个一辈子，叠起来 ${formatLength(stackHeight(defenseStop.amount), locale)}，高过空间站。美国一年的 GDP 叠到 ${formatLength(stackHeight(gdpStop.amount), locale)}${geoNear ? '，接近地球同步轨道' : ''}。`,
      },
      {
        title: '换一样东西，钱走另一条路',
        body: `买一部手机，约 ${per100(phone, profile, 'imports')} 美元流到国外；吃一顿饭，${per100(meal, profile, 'wages')} 美元是工资。`,
      },
    ]
  }
  return [
    {
      title: 'How tall is a lifetime of spending?',
      body: `Americans spend about $${(Math.round(profile.annualSpend / 100) * 100).toLocaleString('en-US')} a person each year on goods and services (2024) and live ${profile.lifeExpectancy} years: about ${lifeMoney}. In $100 bills, that stack is ${height} tall.`,
    },
    {
      title: 'Pull out a bill, buy dinner',
      body: 'The restaurant keeps the cooks’ pay, its own surplus and its taxes, then pays farms, food makers and the power company. Every step up the supply chain, the bill is cut again.',
    },
    {
      title: 'Cut to the end: not a cent lost',
      body: `About $${per100(meal, profile, 'wages')} becomes wages, $${per100(meal, profile, 'surplus')} business surplus (including depreciation), $${per100(meal, profile, 'tax')} taxes and $${per100(meal, profile, 'imports')} goes abroad. The money you spend is someone else’s income.`,
    },
    {
      title: 'Taxes hide inside prices',
      body: `Sales, excise and property taxes sit inside prices: about $${(tax.share * 100).toFixed(1)}0 of every $100, or ${formatMoney(tax.amount, profile, locale)} over a lifetime, mostly to states and cities. Washington, and the Pentagon, run mainly on income and payroll taxes.`,
    },
    {
      title: `Every ${duration(secondsPerLifetime(profile, defenseStop.amount), locale)}, the Pentagon spends a lifetime`,
      body: `FY2025 defense outlays were ${formatMoney(defenseStop.amount, profile, locale)}: about ${(Math.round(defenseLives / 1000) * 1000).toLocaleString('en-US')} lifetimes, a stack ${formatLength(stackHeight(defenseStop.amount), locale)} high, above the space station. A year of U.S. GDP reaches ${formatLength(stackHeight(gdpStop.amount), locale)}${geoNear ? ', almost to geostationary orbit' : ''}.`,
    },
    {
      title: 'Spend it on something else',
      body: `Buy a phone and about $${per100(phone, profile, 'imports')} leaves the country. At a restaurant, $${per100(meal, profile, 'wages')} is wages.`,
    },
  ]
}
