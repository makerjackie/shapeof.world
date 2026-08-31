import { createContext, createElement, useCallback, useContext, type ReactNode } from 'react'

import { useI18n, type Locale } from './index'

export type ExperienceTextTranslator = <T>(value: T) => T
export type ExperienceDictionary = Readonly<Record<string, string>>

const ExperienceDictionaryContext = createContext<ExperienceDictionary>({})

const editorialOverrides: Record<string, string> = {
  '这个世界暂时没有打开': 'This world could not open',
  '吊龙': 'ribeye cap',
  '匙仁': 'chuck flap',
  '胸口捞': 'brisket fat',
  '牛腱': 'beef shank',
  '吊龙、匙仁和牛腱，究竟分别长在哪里？': 'Where do ribeye cap, chuck flap, and beef shank come from?',
  '潮汕牛肉火锅为什么要「对秒表」？': 'Why does Chaoshan beef hotpot run on a stopwatch?',
  '玩法引导': 'How to explore',
  '为什么': 'Why',
  '重置': 'Reset',
  '重新开始': 'Start over',
  '开始探索': 'Start the story',
  '向下滚动继续': 'Scroll down to continue',
  '进入自由探索': 'Enter free explore',
  '退出故事': 'Exit story',
  '暂停': 'Pause',
  '继续': 'Continue',
  '展开': 'Expand',
  '折叠': 'Collapse',
  '节点': 'Nodes',
  '共振': 'Resonance',
  '磁场': 'Magnetic field',
  '天体': 'Celestial body',
  '显示层': 'Display layers',
  '这是基准场景：能量约等于 55 亿颗广岛原子弹。但它在地球撞击史上排不进最大之列——致命的是时机。': 'This baseline releases energy comparable to about 5.5 billion Hiroshima bombs. It is nowhere near Earth’s largest impacts—the timing made it catastrophic.',
  '直径 20 m 的石质小行星在高空解体，约 0.5 Mt 能量释放在 20 km 以上高空；上千名伤者几乎全部来自被冲击波震碎的玻璃。': 'A 20-metre stony asteroid broke up high in the atmosphere, releasing about 0.5 Mt above 20 km. Nearly all of the more than one thousand injuries came from glass shattered by the shock wave.',
  'MapLibre + Carto 底图 · Earth Impact Effects 模型（Collins et al. 2005）': 'MapLibre + Carto basemap · Earth Impact Effects model (Collins et al. 2005)',
  'MapLibre + NASA Blue Marble · Earth Impact Effects 模型（Collins et al. 2005）': 'MapLibre + NASA Blue Marble · Earth Impact Effects model (Collins et al. 2005)',
  'OSIRIS-REx 采样过的碎石堆小行星。2182 年 9 月撞击概率约 1/2700；若发生，碎片云会撞出数公里宽的陨石坑。此落点在开阔洋面——本模型只计算陆地物理量，海啸需要另一套模型。': 'A rubble-pile asteroid sampled by OSIRIS-REx. Its September 2182 impact probability is about 1 in 2,700; an impact could excavate a crater several kilometres wide. This preset lands in open ocean—the model only calculates land effects, and a tsunami requires a separate model.',
}

type DynamicPattern = {
  source: RegExp
  target: string | ((translate: (value: string) => string, ...match: Array<string>) => string)
}

function formatNumber(value: number, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat('en', { maximumFractionDigits }).format(value)
}

function hundredMillionsToEnglish(value: string, unit: string): string {
  const amount = Number(value.replaceAll(',', ''))
  if (!Number.isFinite(amount)) return `${value} ${unit}`
  return amount >= 10
    ? `${formatNumber(amount / 10)} billion ${unit}`
    : `${formatNumber(amount * 100)} million ${unit}`
}

function tenThousandsToEnglish(value: string, unit: string): string {
  const amount = Number(value.replaceAll(',', ''))
  if (!Number.isFinite(amount)) return `${value} ${unit}`
  const total = amount * 10_000
  return total >= 1_000_000
    ? `${formatNumber(total / 1_000_000)} million ${unit}`
    : `${formatNumber(total, 0)} ${unit}`
}

const dynamicPatterns: Array<DynamicPattern> = [
  { source: /^下锅涮(.+)$/, target: (translate, _all, cut) => `Dunk ${translate(cut)} in the pot` },
  { source: /^从\s*(.+)\s*往下掉$/, target: 'down from $1 and dropping' },
  { source: /^第\s*(\d+)\s*幕[：:]\s*(.+)$/, target: (translate, _all, index, label) => `Scene ${index}: ${translate(label)}` },
  { source: /^第\s*(\d+)\s*天$/, target: 'Day $1' },
  { source: /^第\s*(\d+)\s*天 · (.+)$/, target: (translate, _all, day, rest) => `Day ${day} · ${translate(rest)}` },
  { source: /^距抵达还有\s*(\d+)\s*天\s*(\d+)\s*小时$/, target: '$1 d $2 h to arrival' },
  { source: /^距抵达还有\s*(\d+)\s*小时$/, target: '$1 h to arrival' },
  { source: /^距抵达还有\s*(\d+)\s*分钟$/, target: '$1 min to arrival' },
  { source: /^(\d+)\s*岁$/, target: '$1 years old' },
  { source: /^第\s*(\d+)\s*步$/, target: 'Step $1' },
  { source: /^第\s*(\d+)\s*课$/, target: 'Lesson $1' },
  { source: /^第\s*(\d+)\s*周$/, target: 'Week $1' },
  { source: /^共\s*(\d+)\s*步$/, target: '$1 steps' },
  { source: /^(\d+)\s*个世界$/, target: '$1 worlds' },
  { source: /^(\d+)\s*分钟$/, target: '$1 min' },
  { source: /^(\d+)\s*秒$/, target: '$1 sec' },
  { source: /^第\s*(\d+)\s*幕$/, target: 'Scene $1' },
  { source: /^(\d+)\s*次$/, target: '$1 times' },
  { source: /^前往第\s*(\d+)\s*幕$/, target: 'Go to scene $1' },
  { source: /^导览进度\s*(\d+)\s*\/\s*(\d+)$/, target: 'Tour progress $1 / $2' },
  { source: /^(.+)。再次选择“移开这一层”，可以继续观察它下面覆盖的肌肉或骨骼。$/, target: (translate, _all, detail) => `${translate(detail)}. Choose “Remove this layer” again to continue into the muscles or bones beneath it.` },
  { source: /^这是(.+)（(.+)）。再次点「移开这一层」，可以继续观察它下面覆盖的肌肉或骨骼。$/, target: 'This is $1 ($2). Tap “Remove this layer” again to continue into the muscles or bones beneath it.' },
  { source: /^这是(.+)。再次点「移开这一层」，可以继续观察它下面覆盖的肌肉或骨骼。$/, target: 'This is $1. Tap “Remove this layer” again to continue into the muscles or bones beneath it.' },
  { source: /^每点 = 1 人 · 共 ([\d,.]+) 人$/, target: 'Each dot = 1 person · $1 people total' },
  { source: /^检测阳性 ([\d,.]+) 人$/, target: '$1 positive tests' },
  { source: /^真阳性 ([\d,.]+)$/, target: '$1 true positives' },
  { source: /^虚惊 ([\d,.]+)$/, target: '$1 false positives' },
  { source: /^已打开 ([\d,.]+) \/ ([\d,.]+) 个系统$/, target: '$1 of $2 systems opened' },
  { source: /^([\d,.]+) \/ ([\d,.]+) 套系统$/, target: '$1 / $2 systems' },
  { source: /^([\d,.]+) \/ ([\d,.]+) 个部位$/, target: '$1 / $2 cuts' },
  { source: /^输出 完成$/, target: 'Output complete' },
  { source: /^输出 ([\d.]+%)$/, target: 'Output $1' },
  { source: /^… 共 ([\d,.]+) 项$/, target: '… $1 terms total' },
  { source: /^Σ = (.+) → 写入输出 \((.+), (.+)\)$/, target: 'Σ = $1 → write output ($2, $3)' },
  { source: /^核元素 ([\d,.]+)$/, target: 'Kernel element $1' },
  { source: /^只有可见物质时，边缘恒星只能转到 (.+)——观测却是它的两倍多。$/, target: (translate, _all, speed) => `With visible matter alone, edge stars could only orbit at ${translate(speed)}—the observed speed is more than twice that.` },
  { source: /^拟合成功：藏在星系背后的质量约为可见物质的 (.+)（观测范围内）。$/, target: (translate, _all, ratio) => `Fit complete: the hidden mass behind the galaxy is about ${translate(ratio)} the visible mass within the observed range.` },
  { source: /^实测≈(.+) Hz$/, target: 'Measured ≈ $1 Hz' },
  { source: /^混沌爆发：两个摆彻底分叉（(.+)°）$/, target: 'Chaos erupts: the pendulums fully diverge ($1°)' },
  { source: /^两个摆的分离角：(.+)°$/, target: 'Pendulum separation: $1°' },
  { source: /^理论条纹间距 (.+) mm$/, target: 'Theoretical fringe spacing $1 mm' },
  { source: /^已探测 ([\d,.]+) 个粒子$/, target: '$1 particles detected' },
  { source: /^· 实测深度 (.+)$/, target: (translate, _all, depth) => `· measured depth ${translate(depth)}` },
  { source: /^自由探索 · (.+)$/, target: (translate, _all, place) => `Free exploration · ${translate(place)}` },
  { source: /^这张图从 2014 年 OpenFlights 历史快照中保留了 ([\d,.]+) 座高连接机场与 ([\d,.]+) 组主要城市连接。它不是今日航班或客流图。$/, target: 'This map retains $1 highly connected airports and $2 major city links from a 2014 OpenFlights snapshot. It is not a map of current flights or passenger traffic.' },
  { source: /^在当前切片里，([\d,.]+) 座直连机场中有 ([\d,.]+) 座位于美国、([\d,.]+) 座在境外。枢纽首先是一台把分散需求汇拢起来的中转机器。$/, target: 'In this slice, $2 of $1 directly connected airports are in the United States and $3 are abroad. A hub is first of all a transfer machine that concentrates scattered demand.' },
  { source: /^([\d,.]+) 座直连机场中有 ([\d,.]+) 座位于英国之外，覆盖 ([\d,.]+) 个国家。伦敦的连接不是向一侧辐射，而是同时穿过多个区域。$/, target: 'Of $1 directly connected airports, $2 lie outside the United Kingdom, spanning $3 countries. London’s links do not radiate in one direction; they cross several regions at once.' },
  { source: /^([\d,.]+) 座直连机场中有 ([\d,.]+) 座在中国、([\d,.]+) 座在境外。国内网络提供密度，洲际航线把半径拉到一万公里之外。$/, target: 'Of $1 directly connected airports, $2 are in China and $3 are abroad. The domestic network supplies density while intercontinental routes stretch beyond 10,000 kilometres.' },
  { source: /^([\d,.]+) 座直连机场全部位于境外，却覆盖 ([\d,.]+) 个国家。国土大小没有限制它成为横跨亚洲、澳洲与欧洲的转机节点。$/, target: 'All $1 directly connected airports are abroad, spanning $2 countries. The country’s size has not stopped it from becoming a transfer hub linking Asia, Australia, and Europe.' },
  { source: /^当前主要连接切片收束为 ([\d,.]+) 座直连机场、([\d,.]+) 个国家；原始历史数据库为这座机场记录了 ([\d,.]+) 条有向航线。$/, target: 'This connection slice contains $1 direct airports across $2 countries; the historical source records $3 directed routes for this airport.' },
  { source: /^这对城市之间记录了 ([\d,.]+) 条航空公司航线记录。它表示历史数据库里的连接丰富度，不是班次、座位数或客流量。$/, target: 'The historical dataset records $1 airline routes between these cities. This measures connection variety, not flights, seats, or passenger volume.' },
  { source: /^已收敛：([\d,.]+) 步到达谷底$/, target: 'Converged: reached the valley floor in $1 steps' },
  { source: /^穿过 ([\d,.]+) · 弹回 ([\d,.]+)$/, target: 'Through $1 · bounced back $2' },
  { source: /^≈ 每 ([\d,.]+) 次穿过 1 次$/, target: '≈ 1 in $1 makes it through' },
  { source: /^理论 T = (.+)%$/, target: 'Theory T = $1%' },
  // Leading space is trimmed by translateExperienceString before matching.
  { source: /^· 实测 (.+)%$/, target: '· measured $1%' },
  { source: /^播放速度 (.+)×，点击切换$/, target: 'Playback speed $1×; click to change' },
  { source: /^相位 (.+)$/, target: (translate, _all, phase) => `Phase ${translate(phase)}` },
  { source: /^火星还差 (.+)°$/, target: 'Mars is $1° short' },
  { source: /^火星已越过 (.+)°$/, target: 'Mars has passed by $1°' },
  { source: /^已飞 ([\d,.]+) 天$/, target: '$1 days flown' },
  { source: /^最小能量（霍曼转移）约 ([\d,.]+) 天、(.+) km\/s。拉高能量可以早到——但到达时相对火星的速度暴增，刹车 Δv 直线上升。盯着读数面板拨一拨。$/, target: 'The minimum-energy Hohmann transfer takes about $1 days and $2 km/s. More energy gets you there sooner—but arrival speed and braking Δv rise sharply. Tune it while watching the readout.' },
  { source: /^相位错开，就要等地火相对位置转完一整圈：会合周期 ([\d,.]+) 天 ≈ 26 个月。这就是所有真实火星任务挤在窗口前后发射的原因。$/, target: 'Miss the phase and Earth and Mars must cycle through their relative positions again: the synodic period is $1 days, about 26 months. That is why real Mars missions cluster around launch windows.' },
  { source: /^飞行 ([\d,.]+) 天后与火星会合 · 总 Δv (.+?)(，在预算之内|——超出预算)$/, target: (translate, _all, days, deltaV, result) => `Rendezvous with Mars after ${days} days · total Δv ${translate(deltaV)}${result.startsWith('，') ? ', within budget' : '—over budget'}` },
  { source: /^到达时(火星还没走到|火星已经越过)（差 (.+)°）· 距下次发射窗口 (.+)（会合周期 ([\d,.]+) 天 ≈ 26 个月）$/, target: (translate, _all, state, difference, wait, cycle) => `On arrival, Mars ${state === '火星还没走到' ? 'has not arrived yet' : 'has already passed'} (off by ${difference}°) · ${translate(wait)} until the next launch window (${cycle}-day synodic period ≈ 26 months)` },
  { source: /^([\d.]+) 度$/, target: '$1 degrees' },
  { source: /^([\d.]+) 天 ≈ ([\d.]+) 个月$/, target: '$1 days ≈ $2 months' },
  { source: /^约 ([\d.]+) 年$/, target: 'about $1 years' },
  { source: /^约 ([\d.]+) 天$/, target: 'about $1 days' },
  { source: /^([\d.]+)万$/, target: (_translate, _all, value) => formatNumber(Number(value) * 10_000, 0) },
  { source: /^约 (.+)$/, target: (translate, _all, value) => `about ${translate(value)}` },
  { source: /^(.+) 分钟前$/, target: '$1 min ago' },
  { source: /^([\d,.]+) 个演示标记$/, target: '$1 demo markers' },
  { source: /^([\d,.]+) 次测得的脉动$/, target: '$1 measured pulses' },
  { source: /^以最后一个词元「(.*)」为例：它对前面每个词元算一次注意力分数（语义相似度 \+ 距离），再按权重把大家的向量混进自己。每一层都做一次，信息一层层变丰富。$/, target: 'Take the final token “$1”: it scores every earlier token for attention (semantic similarity + distance), then blends their vectors into its own by weight. Each layer repeats this, enriching the information.' },
  { source: /^看完 ([\d,.]+) 个词元后，模型给词表每个候选打分并归一化成概率。温度 (.+) 控制抽样时的「冒险程度」。$/, target: 'After reading $1 tokens, the model scores every candidate in its vocabulary and normalizes the scores into probabilities. Temperature $2 controls how adventurous sampling becomes.' },
  { source: /^当前 r = (.+) · x 的前 60 步$/, target: 'Current r = $1 · first 60 steps of x' },
  { source: /^周期 ([\d,.]+)$/, target: 'Period $1' },
  { source: /^误差 (.+)%$/, target: 'Error $1%' },
  { source: /^跳转到(.+)$/, target: (translate, _all, label) => `Jump to ${translate(label)}` },
  { source: /^隐藏层 ([\d,.]+)$/, target: 'Hidden layer $1' },
  { source: /^(.+) · 节点 ([\d,.]+)$/, target: (translate, _all, layer, node) => `${translate(layer)} · node ${node}` },
  { source: /^激活 (.+)$/, target: 'Activation $1' },
  { source: /^偏置 (.+)$/, target: 'Bias $1' },
  { source: /^探测 \((.+), (.+)\)$/, target: 'Probe ($1, $2)' },
  { source: /^未收敛 · ([\d,.]+) 步$/, target: 'Did not converge · $1 steps' },
  { source: /^([\d,.]+) 步 → 根 ([\d,.]+)$/, target: '$1 steps → root $2' },
  { source: /^根 ([\d,.]+)$/, target: 'Root $1' },
  { source: /^海面以下 ([\d,.]+) 米$/, target: '$1 m below sea level' },
  { source: /^π = …（质量比 (.+)× 的目标：([\d,.]+) 次）$/, target: 'π = … (target for mass ratio $1×: $2 collisions)' },
  { source: /^停住了：([\d,.]+) 次 —— 正好是 π 的前 ([\d,.]+) 位$/, target: 'Stopped: $1 collisions—exactly the first $2 digits of π' },
  { source: /^停住了：共 ([\d,.]+) 次碰撞$/, target: 'Stopped after $1 collisions' },
  { source: /^黄纬夸大 ×(.+) · 窗口 ±(.+)°$/, target: 'Ecliptic latitude exaggerated ×$1 · window ±$2°' },
  { source: /^精确值 (.+)$/, target: 'Exact value $1' },
  { source: /^n = ([\d,.]+) 个矩形$/, target: 'n = $1 rectangles' },
  { source: /^距离一米 ([\d,.]+) 个数量级$/, target: '$1 orders of magnitude from one metre' },
  { source: /^([\d.]+) 年\/秒$/, target: '$1 years/sec' },
  { source: /^([\d.]+) 月\/秒$/, target: '$1 months/sec' },
  { source: /^([\d.]+) 周\/秒$/, target: '$1 weeks/sec' },
  { source: /^([\d.]+) 天\/秒$/, target: '$1 days/sec' },
  { source: /^([\d.]+) 时\/秒$/, target: '$1 hours/sec' },
  { source: /^([\d.]+) 分\/秒$/, target: '$1 min/sec' },
  { source: /^([\d.]+) 秒\/秒$/, target: '$1 sec/sec' },
  { source: /^冠军：(.+) —— 比较 ([\d,.]+) · 交换 ([\d,.]+)$/, target: (translate, _all, winner, comparisons, swaps) => `Winner: ${translate(winner)} — comparisons ${comparisons} · swaps ${swaps}` },
  { source: /^比较 ([\d,.]+)$/, target: 'Comparisons $1' },
  { source: /^交换 ([\d,.]+)$/, target: 'Swaps $1' },
  { source: /^第 (.+) 泛音在这个拨弦位置消失$/, target: 'Harmonics $1 disappear at this plucking position' },
  { source: /^预测 (\d+) · ([\d.]+)%$/, target: 'Prediction $1 · $2%' },
  { source: /^第 ([\d,.]+) 泛音，点击静音$/, target: 'Harmonic $1; click to mute' },
  { source: /^第 ([\d,.]+) 泛音，已静音，点击恢复$/, target: 'Harmonic $1; muted, click to restore' },
  { source: /^(.+)已逃逸 —— 一次差之毫厘的永别$/, target: '$1 escaped—a tiny difference became a permanent farewell' },
  { source: /^(.+)，学名 (.+)，(已经发现|点击发现)$/, target: (translate, _all, common, scientific, state) => `${translate(common)}, scientific name ${scientific}, ${state === '已经发现' ? 'discovered' : 'click to discover'}` },
  { source: /^(.+)，(.+) 个叶端(，你在这里)?$/, target: (translate, _all, name, tips, here) => `${translate(name)}, ${tips} tips${here ? ', you are here' : ''}` },
  { source: /^当前显示最大的分支，另有 ([\d,.]+) 个较小分支。$/, target: 'Showing the largest branches; $1 smaller branches remain.' },
  { source: /^([\d,.]+) 次新记录$/, target: '$1 new records' },
  { source: /^深度 ([\d,.]+) km$/, target: 'Depth $1 km' },
  { source: /^([\d,.]+) 年读数$/, target: '$1 reading' },
  { source: /^相对 (.+) 平均值$/, target: 'Relative to the $1 average' },
  { source: /^再发现 ([\d,.]+) 种，完成这次探索。$/, target: 'Discover $1 more species to complete this exploration.' },
  { source: /^探索(.+)$/, target: (translate, _all, label) => `Explore ${translate(label)}` },
  { source: /^([\d.]+) 光年$/, target: '$1 light-years' },
  { source: /^([\d,.]+) 天$/, target: '$1 days' },
  { source: /^([\d,.]+) 年$/, target: '$1 years' },
  { source: /^([\d,.]+) 万年$/, target: (_translate, _all, value) => tenThousandsToEnglish(value, 'years') },
  { source: /^([\d,.]+) 亿年$/, target: (_translate, _all, value) => hundredMillionsToEnglish(value, 'years') },
  { source: /^([\d.]+) 亿年前$/, target: (_translate, _all, value) => hundredMillionsToEnglish(value, 'years ago') },
  { source: /^([\d.]+) 万年前$/, target: (_translate, _all, value) => tenThousandsToEnglish(value, 'years ago') },
  { source: /^([\d.]+) 年前$/, target: '$1 years ago' },
  { source: /^([\d.]+) 比 1$/, target: '$1 to 1' },
  { source: /^([\d,.]+) 天后冲日$/, target: 'Opposition in $1 days' },
  { source: /^冲日已过 ([\d,.]+) 天$/, target: '$1 days after opposition' },
  { source: /^冲日前 ([\d,.]+) 天$/, target: '$1 days before opposition' },
  { source: /^冲日后 ([\d,.]+) 天$/, target: '$1 days after opposition' },
  { source: /^([+−\d.]+)°\/天$/, target: '$1°/day' },
  { source: /^z = (.+) · 波长 ×(.+)$/, target: 'z = $1 · wavelength ×$2' },
  { source: /^([\d.]+) 亿公里$/, target: (_translate, _all, value) => hundredMillionsToEnglish(value, 'km') },
  { source: /^([\d.]+) 万公里$/, target: (_translate, _all, value) => tenThousandsToEnglish(value, 'km') },
  { source: /^([\d,.]+) 公里$/, target: '$1 km' },
  { source: /^([\d,.]+) 像素$/, target: '$1 px' },
  { source: /^距云顶 (.+)$/, target: (translate, _all, d) => `${translate(d)} above the cloud tops` },
  { source: /^([\d.]+) 万亿吨$/, target: '$1 trillion tonnes' },
  { source: /^([\d.]+) 亿吨$/, target: (_translate, _all, value) => hundredMillionsToEnglish(value, 'tonnes') },
  { source: /^([\d.]+) 万吨$/, target: (_translate, _all, value) => tenThousandsToEnglish(value, 'tonnes') },
  { source: /^([\d.]+) 吨$/, target: '$1 tonnes' },
  { source: /^不足 1 颗$/, target: 'fewer than 1' },
  { source: /^([\d.]+) 颗$/, target: '$1' },
  { source: /^空中解体 · 能量在 (.+) km 高空释放$/, target: 'Airburst · energy released at $1 km altitude' },
  { source: /^撞击地表 · 触地速度 (.+) km\/s（低空解体碎片云）$/, target: 'Surface impact · $1 km/s at contact (low-altitude breakup cloud)' },
  { source: /^撞击地表 · 触地速度 (.+) km\/s$/, target: 'Surface impact · $1 km/s at contact' },
  { source: /^能量约为希克苏鲁伯撞击的 (.+) 倍。$/, target: (translate, _all, ratio) => `Energy is about ${translate(ratio)} times the Chicxulub impact.` },
  { source: /^能量约为希克苏鲁伯撞击的 1\/(.+)。$/, target: (translate, _all, ratio) => `Energy is about 1/${translate(ratio)} of the Chicxulub impact.` },
  { source: /^([\d.]+) 千米每秒$/, target: '$1 km/s' },
  { source: /^与地平线夹角 ([\d.]+) 度$/, target: '$1° above the horizon' },
  { source: /^([\d.]+) 万 K$/, target: (_translate, _all, value) => `${formatNumber(Number(value) * 10_000, 0)} K` },
  { source: /^([\d.]+) 亿$/, target: (_translate, _all, value) => hundredMillionsToEnglish(value, '').trim() },
  { source: /^([\d.]+) 万$/, target: (_translate, _all, value) => tenThousandsToEnglish(value, '').trim() },
  { source: /^氢在核心稳定地烧成氦。这是一生中最长的平静——大约 (.+)。$/, target: (translate, _all, age) => `Hydrogen steadily fuses into helium in the core. This is the longest calm of its life—about ${translate(age)}.` },
  { source: /^质量越大烧得越猛：它的主序星只有 (.+)，约为太阳的 1\/(.+)。$/, target: (translate, _all, age, fraction) => `Greater mass burns fuel faster: its main sequence lasts only ${translate(age)}, about 1/${fraction} of the Sun's.` },
  { source: /^E = ([\d.]+)$/, target: 'Energy E = $1' },
  { source: /^V₀ = ([\d.]+)$/, target: 'Barrier V₀ = $1' },
  { source: /^第 (\d+) 谐波幅度$/, target: 'Harmonic $1 amplitude' },
  { source: /^进度 (\d+)%$/, target: 'Progress $1%' },
  { source: /^(\d+) 重$/, target: '$1-fold' },
  { source: /^回家 × (\d+)$/, target: 'Home × $1' },
  { source: /^峰值 ([\d,.]+)$/, target: 'Peak $1' },
  { source: /^第 (\d+) 步 · 峰值 ([\d,.]+)$/, target: 'Step $1 · peak $2' },
  { source: /^fa = ([\d.]+) Hz · 反向 · n = ([\d-]+)$/, target: 'fa = $1 Hz · reversed · n = $2' },
  { source: /^fa = ([\d.]+) Hz · n = ([\d-]+)$/, target: 'fa = $1 Hz · n = $2' },
  { source: /^重建 fa = ([\d.]+) Hz$/, target: 'Reconstructed fa = $1 Hz' },
  // tides：观察者读数与时间流速
  { source: /^距高潮 (\d+) 小时 (\d+) 分$/, target: 'High tide in $1 h $2 min' },
  { source: /^距低潮 (\d+) 小时 (\d+) 分$/, target: 'Low tide in $1 h $2 min' },
  { source: /^1 天 ≈ ([\d.]+) 秒$/, target: '1 day ≈ $1 s' },
  {
    source: /^场景形变已放大约 ([\d,.]+) 万倍$/,
    target: (_translate, _all, value) => {
      const millions = (Number(value.replaceAll(',', '')) * 10_000) / 1_000_000
      return `Tidal bulge exaggerated about ${formatNumber(millions)} million×`
    },
  },
  { source: /^还有 ([\d,]+) 个候选没画出来$/, target: '$1 more candidates are not drawn' },
  { source: /^它们分掉剩下的 ([\d.]+)%$/, target: 'they share the remaining $1%' },
  // 经济世界共用：金额、订单分流与宏观读数
  { source: /^([\d,.]+) 元\/月$/, target: '¥$1/mo' },
  { source: /^([\d,.]+) 元\/月收入$/, target: '¥$1 monthly revenue' },
  { source: /^([\d,.]+) 元订单$/, target: 'a ¥$1 order' },
  { source: /^([\d,.]+) 元$/, target: '¥$1' },
  { source: /^([\d,.]+) 万亿元\/年$/, target: '¥$1 trillion/yr' },
  { source: /^个税 ([\d,.]+) \+ 社保 ([\d,.]+) 万亿元\/年$/, target: 'tax ¥$1 + social ¥$2 trillion/yr' },
  { source: /^住户一年消费 ([\d,.]+) 万亿元$/, target: 'Households spend ¥$1 trillion a year' },
  { source: /^住户净融出 ([\d,.]+) 万亿元\/年$/, target: 'household net lending ¥$1 trillion/yr' },
  { source: /^净融出 ([\d,.]+) 万亿元$/, target: 'net lending ¥$1 trillion' },
  { source: /^人均储蓄率 ([\d,.]+)%$/, target: 'average savings rate $1%' },
  // money-creation：货币海洋读数、派生链条金额与乘数
  { source: /^([\d,.]+) 万亿元$/, target: '¥$1 trillion' },
  { source: /^([\d,.]+) 万元$/, target: (_translate, _all, value) => `¥${tenThousandsToEnglish(value, '').trim()}` },
  { source: /^第 (\d+) 轮$/, target: 'Round $1' },
  { source: /^([\d.]+) 元 M2$/, target: '¥$1 of M2' },
  // stock-flows：五口池子读数、渗漏口径与市值蒸发
  {
    source: /^([\d,.]+) 亿元$/,
    target: (_translate, _all, value) => {
      const amount = Number(value.replaceAll(',', ''))
      if (!Number.isFinite(amount)) return `¥${value} (100M)`
      return amount >= 10_000
        ? `¥${formatNumber(amount / 10_000)} trillion`
        : `¥${hundredMillionsToEnglish(value, '').trim()}`
    },
  },
  { source: /^([\d.]+) 亿户$/, target: (_translate, _all, value) => hundredMillionsToEnglish(value, 'accounts') },
  { source: /^散户 ([\d.]+)%$/, target: 'retail investors $1%' },
  { source: /^([\d,.]+) 家$/, target: '$1 companies' },
  { source: /^蒸发 ([\d,.]+) 万亿元$/, target: 'Evaporated: ¥$1 trillion' },
  { source: /^≈ 进出公司资金之和的 ([\d,.]+) 倍$/, target: '≈ $1× the year’s company in/out flow' },
  // uncertainty-principle：位置/动量不确定度与波包弥散读数
  { source: /^Δx ≈ ([\d.]+) Å$/, target: 'Δx ≈ $1 Å' },
  { source: /^位置不确定度 ([\d.]+) Å$/, target: 'Position uncertainty ≈ $1 Å' },
  { source: /^动量不确定度 ([\d.]+) keV\/c$/, target: 'Momentum uncertainty ≈ $1 keV/c' },
  { source: /^动量不确定度 ([\d.]+) eV\/c$/, target: 'Momentum uncertainty ≈ $1 eV/c' },
  { source: /^波包正在变宽 ×([\d.]+)$/, target: 'Packet spreading ×$1' },
  // boost-glide：形态标签、跳跃次数与雷达发现时刻
  { source: /^([\d,.]+) km · 升力滑翔$/, target: '$1 km · lift glide' },
  { source: /^([\d,.]+) km · 打水漂$/, target: '$1 km · skip glide' },
  { source: /^([\d,.]+) km · 惯性飞行$/, target: '$1 km · coasting' },
  { source: /^预测漂移 ([\d,.]+) km$/, target: 'prediction drift $1 km' },
  { source: /^漂移 ([\d,.]+) km$/, target: 'drift $1 km' },
  { source: /^第 (\d+) 次跳跃$/, target: 'skip #$1' },
  { source: /^第 (\d+) 次打水漂$/, target: 'skip #$1' },
  { source: /^第 (\d+) 分钟被看见$/, target: 'seen at minute $1' },
  // company-from-one：人数、月序与同龄存活读数
  { source: /^(\d+) 人 · 第 (\d+) 月$/, target: '$1 people · month $2' },
  { source: /^同龄公司大约还剩 (\d+)%$/, target: 'About $1% of same-age firms remain' },
  // package-station：驿站被动读数
  { source: /^占用 (\d+)\/(\d+)$/, target: '$1 / $2 slots in use' },
  { source: /^今日 (\d+)$/, target: '$1 arrived today' },
  { source: /^平均找件 (\d+) 步$/, target: 'avg $1 steps to fetch' },
  { source: /^滞留 (\d+)$/, target: '$1 overdue' },
  { source: /^最优 (.+) · ([\d.]+)$/, target: 'best $1 · $2' },
  { source: /^你选 ([\d.]+) · 最优 (.+) ([\d.]+)$/, target: 'yours $1 · best $2 $3' },
  { source: /^(.+) 排 · 第 (\d+) 层 · 第 (\d+) 位$/, target: 'row $1 · layer $2 · spot $3' },
  {
    source: /^四项加权相加，A27 以 ([\d.]+) 险胜 (.+) 的 ([\d.]+)。$/,
    target: (_translate, _all, winner, label, loser) => `All four weighted terms together, A27 beats ${label}, ${winner} to ${loser}.`,
  },
  // rag-open-book：检索读数、上下文窗口头注与主题扇区标签
  { source: /^已检索 (\d+) 段，最高相似度 ([\d.]+)$/, target: '$1 passages retrieved, best similarity $2' },
  { source: /^库内 (\d+) 段$/, target: '$1 chunks in the library' },
  { source: /^取前 (\d+) 段$/, target: 'top $1 passages' },
  { source: /^最高相似度 ([\d.]+) · 低于阈值$/, target: 'best similarity $1 · below threshold' },
  { source: /^最高相似度 ([\d.]+)$/, target: 'best similarity $1' },
  { source: /^前 (\d+) 段 · 最高 ([\d.]+)$/, target: 'top $1 · best $2' },
  {
    source: /^主题-(astro|weather|health|cooking|company|history)$/,
    target: (_translate, _all, topic) =>
      ({
        astro: 'astronomy',
        weather: 'weather',
        health: 'health',
        cooking: 'cooking',
        company: 'office rules',
        history: 'history',
      })[topic as 'astro' | 'weather' | 'health' | 'cooking' | 'company' | 'history'] ?? topic,
  },
  // moe-switchyard：专家巷道、读数与路由状态
  { source: /^专家 (\d+)$/, target: 'Expert $1' },
  { source: /^当前字送往专家 (\d+) 和 (\d+)$/, target: 'Current token routed to experts $1 and $2' },
  { source: /^已处理 (\d+)\/(\d+)$/, target: '$1/$2 tokens processed' },
  { source: /^最热巷 (\d+)%$/, target: 'hottest lane $1%' },
  { source: /^丢弃 (\d+)$/, target: '$1 dropped' },
]

function translateExperienceString(value: string, dictionary: ExperienceDictionary): string {
  const normalized = value.trim().replace(/\s+/g, ' ')
  // Prefer normalized keys, but also honor raw keys that keep double spaces / padding.
  const exact =
    editorialOverrides[normalized]
    ?? dictionary[normalized]
    ?? editorialOverrides[value]
    ?? dictionary[value]
  if (exact) return exact

  for (const pattern of dynamicPatterns) {
    if (!pattern.source.test(normalized)) continue
    const target = pattern.target
    if (typeof target === 'string') return normalized.replace(pattern.source, target)

    const translateCapture = (capture: string) => translateExperienceString(capture, dictionary)
    return normalized.replace(
      pattern.source,
      (...match: Array<string>) => target(translateCapture, ...match),
    )
  }
  return value
}

export function translateExperienceText<T>(locale: Locale, value: T, dictionary: ExperienceDictionary = {}): T {
  if (locale === 'zh' || typeof value !== 'string') return value
  return translateExperienceString(value, dictionary) as T
}

export function ExperienceI18nProvider({
  dictionary,
  children,
}: {
  dictionary: ExperienceDictionary
  children?: ReactNode
}) {
  return createElement(ExperienceDictionaryContext.Provider, { value: dictionary }, children)
}

export function useExperienceI18n(): ExperienceTextTranslator {
  const { locale } = useI18n()
  const dictionary = useContext(ExperienceDictionaryContext)
  return useCallback(<T,>(value: T) => translateExperienceText(locale, value, dictionary), [dictionary, locale])
}
