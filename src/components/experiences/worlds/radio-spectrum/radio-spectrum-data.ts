/**
 * 电磁频谱地图 · 数据与物理
 *
 * 主口径：ITU《无线电规则》（Radio Regulations, 2020 年版）第 5 条频率划分表，
 * 频段命名沿用 ITU-R V.431-8（VLF … THF）。凡各国/各区差异（Region 1/2/3）
 * 一律以 Region 1 为准并在 regionZh/regionEn 里注明，不冒充全球唯一真理。
 * 具体标志性频点取自各自的公开标准文件：
 *   - GPS L1/L2/L5 → IS-GPS-200（美国空间系统司令部）
 *   - WiFi 信道 → IEEE 802.11
 *   - ISM 2.45 GHz → ITU RR 5.150
 *   - 中性氢谱线 1420.405 751 768 MHz → NIST/IAU
 *   - 可见光边界 ≈ 380–750 nm（CIE 常用工作范围）
 * 穿墙/绕射模型：ITU-R P.2040（建筑材料电特性 + 平板透射）与 ITU-R P.526（单刃绕射）。
 * 拍卖金额：各国监管机构公告（FCC / Ofcom / Bundesnetzagentur），标年份与国家。
 */

/** 真空光速，SI 精确定义值 */
export const LIGHT_SPEED = 299_792_458

export const F_MIN = 1e4
export const F_MAX = 1e15
export const LOG_MIN = Math.log10(F_MIN)
export const LOG_MAX = Math.log10(F_MAX)

export type ServiceKey =
  | 'broadcast'
  | 'mobile'
  | 'nav'
  | 'radar'
  | 'satellite'
  | 'short'
  | 'science'
  | 'thermal'
  | 'visible'

/** 每个业务族一个色相；大多数街区平时是暗的，只有走近才亮起来 */
export const SERVICE_INK: Record<ServiceKey, { hue: number; sat: number; light: number }> = {
  broadcast: { hue: 36, sat: 76, light: 62 },
  mobile: { hue: 8, sat: 66, light: 63 },
  nav: { hue: 196, sat: 58, light: 63 },
  radar: { hue: 212, sat: 42, light: 66 },
  satellite: { hue: 320, sat: 34, light: 68 },
  short: { hue: 152, sat: 44, light: 58 },
  science: { hue: 262, sat: 28, light: 68 },
  thermal: { hue: 22, sat: 78, light: 57 },
  visible: { hue: 0, sat: 0, light: 88 },
}

export const SERVICE_NAMES: Record<ServiceKey, { zh: string; en: string }> = {
  broadcast: { zh: '广播', en: 'Broadcasting' },
  mobile: { zh: '移动通信', en: 'Mobile' },
  nav: { zh: '导航与授时', en: 'Navigation and timing' },
  radar: { zh: '雷达与遥感', en: 'Radar and sensing' },
  satellite: { zh: '卫星', en: 'Satellite' },
  short: { zh: '短距无线', en: 'Short range' },
  science: { zh: '科学与天文', en: 'Science and astronomy' },
  thermal: { zh: '红外', en: 'Infrared' },
  visible: { zh: '光', en: 'Light' },
}

export type ChannelPlan =
  | { kind: 'grid'; f0: number; f1: number; spacing: number; width?: number }
  | { kind: 'list'; items: Array<{ f: number; width?: number; tagZh?: string; tagEn?: string }> }

export type SpectrumBand = {
  id: string
  f0: number
  f1: number
  nameZh: string
  nameEn: string
  useZh: string
  useEn: string
  service: ServiceKey
  /** 视觉层级：2 = 这条街上的地标，1 = 主要街区，0 = 背景地皮 */
  rank: 0 | 1 | 2
  channels?: ChannelPlan
  channelZh?: string
  channelEn?: string
  regionZh?: string
  regionEn?: string
}

/**
 * 街区表。频率单位 Hz。相邻街区之间留下的空隙是真实存在的其他划分
 * （固定业务、军用、气象辅助等），本世界只保留普通人能对上号的主要业务。
 */
export const BANDS: Array<SpectrumBand> = [
  {
    id: 'vlf',
    f0: 1e4,
    f1: 3e4,
    nameZh: '甚低频对潜通信',
    nameEn: 'VLF submarine links',
    useZh: '穿透海水的超长波',
    useEn: 'Very long waves that reach into seawater',
    service: 'nav',
    rank: 1,
    channelZh: '几十千米的波长可以钻进海面以下数十米，是潜艇唯一能收到的无线电',
    channelEn: 'Wavelengths of tens of kilometres reach tens of metres below the sea surface — the only radio a submerged submarine can hear',
  },
  {
    id: 'lf-time',
    f0: 3e4,
    f1: 1e5,
    nameZh: '长波授时台',
    nameEn: 'Longwave time signals',
    useZh: '电波钟对时',
    useEn: 'Radio-controlled clocks',
    service: 'nav',
    rank: 2,
    channels: {
      kind: 'list',
      items: [
        { f: 40e3, tagZh: 'JJY', tagEn: 'JJY' },
        { f: 60e3, tagZh: 'WWVB / MSF', tagEn: 'WWVB / MSF' },
        { f: 68.5e3, tagZh: 'BPC', tagEn: 'BPC' },
        { f: 77.5e3, tagZh: 'DCF77', tagEn: 'DCF77' },
      ],
    },
    channelZh: '全世界只有几座授时台，家里的电波钟每晚在这里对一次表',
    channelEn: 'A handful of transmitters worldwide; radio clocks quietly resynchronise here every night',
  },
  {
    id: 'lw-broadcast',
    f0: 1.485e5,
    f1: 2.835e5,
    nameZh: '长波广播',
    nameEn: 'Longwave broadcasting',
    useZh: '跨国大功率电台',
    useEn: 'High-power cross-border stations',
    service: 'broadcast',
    rank: 1,
    regionZh: '仅 Region 1（欧洲、非洲、中东）划分，其他地区没有长波广播',
    regionEn: 'Allocated in Region 1 only (Europe, Africa, Middle East); no longwave broadcasting elsewhere',
  },
  {
    id: 'ndb',
    f0: 2.835e5,
    f1: 5.265e5,
    nameZh: '无方向信标',
    nameEn: 'Non-directional beacons',
    useZh: '机场与海岸导航',
    useEn: 'Airport and coastal beacons',
    service: 'nav',
    rank: 0,
  },
  {
    id: 'am',
    f0: 5.265e5,
    f1: 1.6065e6,
    nameZh: '中波 AM 广播',
    nameEn: 'AM medium-wave radio',
    useZh: '夜里能听到千里之外',
    useEn: 'At night you can hear a thousand kilometres away',
    service: 'broadcast',
    rank: 2,
    channels: { kind: 'grid', f0: 531e3, f1: 1602e3, spacing: 9e3 },
    channelZh: '信道间隔 9 kHz，一格只够装一路单声道语音',
    channelEn: 'Channels are 9 kHz apart — just wide enough for one mono voice',
    regionZh: 'Region 1/3 为 526.5–1606.5 kHz、间隔 9 kHz；美洲 Region 2 为 525–1705 kHz、间隔 10 kHz',
    regionEn: 'Regions 1 and 3 use 526.5–1606.5 kHz with 9 kHz spacing; Region 2 (the Americas) uses 525–1705 kHz with 10 kHz spacing',
  },
  {
    id: 'mf-marine',
    f0: 1.6065e6,
    f1: 3e6,
    nameZh: '中频海上通信',
    nameEn: 'Maritime MF',
    useZh: '2182 kHz 遇险呼叫',
    useEn: 'The 2182 kHz distress call',
    service: 'nav',
    rank: 0,
  },
  {
    id: 'hf',
    f0: 3e6,
    f1: 3e7,
    nameZh: '短波',
    nameEn: 'Shortwave',
    useZh: '靠电离层反射绕地球',
    useEn: 'Bounced around the planet by the ionosphere',
    service: 'broadcast',
    rank: 2,
    channels: {
      kind: 'list',
      items: [
        { f: 6.05e6, width: 3e5, tagZh: '49 m', tagEn: '49 m' },
        { f: 7.1e6, width: 2e5, tagZh: '业余 40 m', tagEn: 'Amateur 40 m' },
        { f: 9.65e6, width: 5e5, tagZh: '31 m', tagEn: '31 m' },
        { f: 11.85e6, width: 5e5, tagZh: '25 m', tagEn: '25 m' },
        { f: 14.175e6, width: 3.5e5, tagZh: '业余 20 m', tagEn: 'Amateur 20 m' },
        { f: 15.45e6, width: 7e5, tagZh: '19 m', tagEn: '19 m' },
        { f: 17.69e6, width: 4.2e5, tagZh: '16 m', tagEn: '16 m' },
        { f: 21.65e6, width: 4e5, tagZh: '13 m', tagEn: '13 m' },
        { f: 27.185e6, width: 4.4e5, tagZh: '民用对讲 CB', tagEn: 'Citizens band' },
      ],
    },
    channelZh: '广播按「米波段」切块，业余无线电插在缝隙里；电离层把它们折回地面，一跳几千公里',
    channelEn: 'Broadcasting is cut into metre bands with amateur slices between them; the ionosphere folds them back to the ground, thousands of kilometres per hop',
  },
  {
    id: 'vhf-low',
    f0: 3e7,
    f1: 8.75e7,
    nameZh: '甚高频低段',
    nameEn: 'Low VHF',
    useZh: '遥控、对讲、业余 6 m',
    useEn: 'Remote control, walkie-talkies, the 6 m amateur band',
    service: 'short',
    rank: 0,
  },
  {
    id: 'fm',
    f0: 8.75e7,
    f1: 1.08e8,
    nameZh: '调频广播',
    nameEn: 'FM radio',
    useZh: '车里那一格一格的电台',
    useEn: 'The stations you click through in the car',
    service: 'broadcast',
    rank: 2,
    channels: { kind: 'grid', f0: 87.6e6, f1: 107.9e6, spacing: 1e5 },
    channelZh: '信道间隔 100 kHz，整条 FM 只有 205 个格子，一座城市能分到的远不到这个数',
    channelEn: 'Channels sit 100 kHz apart — the whole FM band holds only 205 slots, and a single city gets far fewer',
    regionZh: 'Region 1/3 为 87.5–108 MHz；美洲 Region 2 为 88–108 MHz，间隔 200 kHz；日本另用 76–95 MHz',
    regionEn: 'Regions 1 and 3 use 87.5–108 MHz; Region 2 uses 88–108 MHz with 200 kHz spacing; Japan uses 76–95 MHz',
  },
  {
    id: 'aero',
    f0: 1.08e8,
    f1: 1.37e8,
    nameZh: '航空导航与通话',
    nameEn: 'Aeronautical navigation and voice',
    useZh: '塔台与飞机说话的地方',
    useEn: 'Where the tower talks to the aircraft',
    service: 'nav',
    rank: 1,
    channels: { kind: 'grid', f0: 118e6, f1: 136.975e6, spacing: 25e3 },
    channelZh: '108–118 MHz 是 VOR/ILS 导航台，118 MHz 以上是话音；欧洲已把间隔压到 8.33 kHz 才够用',
    channelEn: '108–118 MHz carries VOR/ILS navigation beacons, above 118 MHz is voice; Europe squeezed the spacing to 8.33 kHz to fit everyone in',
  },
  {
    id: 'vhf-sat',
    f0: 1.37e8,
    f1: 1.56e8,
    nameZh: '气象卫星与业余 2 m',
    nameEn: 'Weather satellites and the 2 m band',
    useZh: '一根天线就能收云图',
    useEn: 'One antenna can pull down a cloud image',
    service: 'satellite',
    rank: 0,
  },
  {
    id: 'marine-vhf',
    f0: 1.56e8,
    f1: 1.74e8,
    nameZh: '海上甚高频',
    nameEn: 'Marine VHF',
    useZh: '16 频道全球守听',
    useEn: 'Channel 16, monitored worldwide',
    service: 'nav',
    rank: 1,
    channels: { kind: 'grid', f0: 156.05e6, f1: 162.025e6, spacing: 5e4 },
    channelZh: '156.8 MHz 是遇险呼叫频道，全世界的船都在守听；161.975 / 162.025 MHz 是船舶自动识别系统',
    channelEn: '156.8 MHz is the distress channel every ship monitors; 161.975 and 162.025 MHz carry the automatic identification system',
  },
  {
    id: 'dab',
    f0: 1.74e8,
    f1: 2.3e8,
    nameZh: '数字广播与甚高频电视',
    nameEn: 'Digital radio and VHF television',
    useZh: '第三频段',
    useEn: 'Band III',
    service: 'broadcast',
    rank: 0,
  },
  {
    id: 'uhf-low',
    f0: 2.3e8,
    f1: 4.7e8,
    nameZh: '专用通信与遥控',
    nameEn: 'Professional radio and remote control',
    useZh: '对讲机、门铃、胎压计',
    useEn: 'Two-way radios, doorbells, tyre-pressure sensors',
    service: 'short',
    rank: 0,
    channels: {
      kind: 'list',
      items: [{ f: 433.92e6, width: 1.74e6, tagZh: '433 MHz ISM', tagEn: '433 MHz ISM' }],
    },
    channelZh: '433 MHz 的免许可小块，是遥控车库门、无线门铃和胎压监测挤在一起的地方',
    channelEn: 'The licence-free 433 MHz slice, shared by garage remotes, wireless doorbells and tyre-pressure monitors',
  },
  {
    id: 'dtv',
    f0: 4.7e8,
    f1: 6.94e8,
    nameZh: '地面数字电视',
    nameEn: 'Terrestrial digital television',
    useZh: '屋顶天线收的那些台',
    useEn: 'What the rooftop aerial still receives',
    service: 'broadcast',
    rank: 2,
    channels: { kind: 'grid', f0: 474e6, f1: 690e6, spacing: 8e6 },
    channelZh: '每个电视频道 8 MHz 宽——一个频道就抵得上整条 FM 广播的三分之一',
    channelEn: 'Each television channel is 8 MHz wide — one channel alone is a third of the entire FM band',
    regionZh: 'Region 1 在 WRC-15 后把 694 MHz 以上划给移动业务；美洲频道宽 6 MHz，上界另有规定',
    regionEn: 'After WRC-15, Region 1 moved everything above 694 MHz to mobile; the Americas use 6 MHz channels with a different upper edge',
  },
  {
    id: 'mobile-700',
    f0: 6.94e8,
    f1: 8.62e8,
    nameZh: '700/800 MHz 移动',
    nameEn: '700/800 MHz mobile',
    useZh: '乡下也有信号的那一段',
    useEn: 'The band that still works in the countryside',
    service: 'mobile',
    rank: 1,
    channelZh: '从电视那里划过来的「数字红利」频段：波长 40 cm 左右，一个基站能盖住很大一片',
    channelEn: 'The digital-dividend band taken from television: a 40 cm wavelength lets one tower cover a very large area',
  },
  {
    id: 'mobile-900',
    f0: 8.62e8,
    f1: 9.6e8,
    nameZh: '900 MHz 移动',
    nameEn: '900 MHz mobile',
    useZh: '第一代数字手机的地盘',
    useEn: 'Home turf of the first digital phones',
    service: 'mobile',
    rank: 1,
  },
  {
    id: 'ism-900',
    f0: 9.6e8,
    f1: 1.16e9,
    nameZh: '短距无线与物联网',
    nameEn: 'Short-range and IoT links',
    useZh: '智能电表、传感器',
    useEn: 'Smart meters and sensors',
    service: 'short',
    rank: 0,
    regionZh: '902–928 MHz 的免许可频段只在 Region 2 划分，欧洲对应的是 863–870 MHz',
    regionEn: 'The licence-free 902–928 MHz band exists only in Region 2; Europe uses 863–870 MHz instead',
  },
  {
    id: 'gnss',
    f0: 1.16e9,
    f1: 1.61e9,
    nameZh: '卫星导航 L 频段',
    nameEn: 'Satellite navigation, L band',
    useZh: '手机里的那颗定位芯片',
    useEn: 'The positioning chip in your phone',
    service: 'nav',
    rank: 2,
    channels: {
      kind: 'list',
      items: [
        { f: 1176.45e6, width: 24e6, tagZh: 'GPS L5', tagEn: 'GPS L5' },
        { f: 1227.6e6, width: 20e6, tagZh: 'GPS L2', tagEn: 'GPS L2' },
        { f: 1561.098e6, width: 4e6, tagZh: '北斗 B1I', tagEn: 'BeiDou B1I' },
        { f: 1575.42e6, width: 24e6, tagZh: 'GPS L1 / 伽利略 E1', tagEn: 'GPS L1 / Galileo E1' },
      ],
    },
    channelZh: '导航卫星发下来的功率比手机弱得多，全靠这几段被严格保护的窄缝活着',
    channelEn: 'Navigation satellites arrive far weaker than a phone signal; they survive only because these narrow slices are fiercely protected',
  },
  {
    id: 'mobile-1800',
    f0: 1.71e9,
    f1: 1.88e9,
    nameZh: '1.8 GHz 移动',
    nameEn: '1.8 GHz mobile',
    useZh: '4G 主力频段',
    useEn: 'A workhorse 4G band',
    service: 'mobile',
    rank: 1,
  },
  {
    id: 'mobile-2100',
    f0: 1.92e9,
    f1: 2.17e9,
    nameZh: '2.1 GHz 移动',
    nameEn: '2.1 GHz mobile',
    useZh: '当年 3G 的天价地皮',
    useEn: 'The famously expensive 3G lot',
    service: 'mobile',
    rank: 1,
  },
  {
    id: 'ism24',
    f0: 2.4e9,
    f1: 2.5e9,
    nameZh: '2.4 GHz 免许可频段',
    nameEn: '2.4 GHz licence-free band',
    useZh: 'WiFi、蓝牙、微波炉同住',
    useEn: 'Wi-Fi, Bluetooth and the microwave oven share one street',
    service: 'short',
    rank: 2,
    channels: {
      kind: 'grid',
      f0: 2412e6,
      f1: 2472e6,
      spacing: 5e6,
      width: 22e6,
    },
    channelZh: 'WiFi 的 13 个信道每格只隔 5 MHz、却各占 22 MHz，彼此重叠——真正互不干扰的只有 1、6、11',
    channelEn: 'Wi-Fi packs 13 channels 5 MHz apart but each is 22 MHz wide, so they overlap; only 1, 6 and 11 are truly clear of each other',
    regionZh: '这段是 ITU RR 5.150 指定的工业、科学、医疗（ISM）频段，不需要执照，也因此谁都不保证你不被干扰',
    regionEn: 'This is an industrial, scientific and medical band designated by ITU RR 5.150: no licence needed, and no protection from interference either',
  },
  {
    id: 'mobile-2600',
    f0: 2.5e9,
    f1: 2.69e9,
    nameZh: '2.6 GHz 移动',
    nameEn: '2.6 GHz mobile',
    useZh: '城市里的容量层',
    useEn: 'The capacity layer inside cities',
    service: 'mobile',
    rank: 0,
  },
  {
    id: 'radar-s',
    f0: 2.7e9,
    f1: 3e9,
    nameZh: '气象雷达 S 波段',
    nameEn: 'S-band weather radar',
    useZh: '天气预报里的回波图',
    useEn: 'The echo maps on the weather forecast',
    service: 'radar',
    rank: 1,
    channelZh: '10 cm 的波长能穿过暴雨还继续往前测，所以大型天气雷达都留在这一段',
    channelEn: 'A 10 cm wavelength keeps probing through heavy rain, which is why the big weather radars stay here',
  },
  {
    id: 'mobile-c',
    f0: 3.3e9,
    f1: 4.2e9,
    nameZh: '5G 中频 C 波段',
    nameEn: '5G mid-band, C band',
    useZh: '5G 覆盖与速率的折中点',
    useEn: '5G’s compromise between reach and speed',
    service: 'mobile',
    rank: 2,
    channelZh: '既比毫米波传得远、又比 1 GHz 以下宽，是全世界 5G 争得最凶的一段地皮',
    channelEn: 'It travels farther than millimetre wave and is wider than anything below 1 GHz — the most fought-over lot in global 5G',
  },
  {
    id: 'wifi5',
    f0: 5.15e9,
    f1: 5.875e9,
    nameZh: 'WiFi 5 GHz',
    nameEn: '5 GHz Wi-Fi',
    useZh: '路由器上更快的那一条',
    useEn: 'The faster stripe on your router',
    service: 'short',
    rank: 2,
    channels: { kind: 'grid', f0: 5180e6, f1: 5825e6, spacing: 20e6 },
    channelZh: '格子多、每格还能拼到 160 MHz 宽，所以更快；但 5.6 GHz 附近是气象雷达，路由器探到就必须让路',
    channelEn: 'More slots, and they can be bonded up to 160 MHz — hence the speed; but weather radar sits near 5.6 GHz, and a router that hears it must move away',
  },
  {
    id: 'wifi6e',
    f0: 5.925e9,
    f1: 7.125e9,
    nameZh: 'WiFi 6E / 7',
    nameEn: 'Wi-Fi 6E and 7',
    useZh: '最新划出来的空地',
    useEn: 'The newest empty lot',
    service: 'short',
    rank: 1,
    regionZh: '美国、韩国开放 5.925–7.125 GHz；欧洲与中国目前只开放到 6.425 GHz，且与卫星上行、微波回传共存',
    regionEn: 'The United States and Korea opened 5.925–7.125 GHz; Europe and China stop at 6.425 GHz, sharing with satellite uplinks and microwave backhaul',
  },
  {
    id: 'radar-x',
    f0: 8.5e9,
    f1: 1e10,
    nameZh: 'X 波段雷达',
    nameEn: 'X-band radar',
    useZh: '船用雷达与测速',
    useEn: 'Marine radar and speed guns',
    service: 'radar',
    rank: 0,
  },
  {
    id: 'ku-down',
    f0: 1.07e10,
    f1: 1.275e10,
    nameZh: 'Ku 卫星电视下行',
    nameEn: 'Ku-band satellite downlink',
    useZh: '阳台上的小锅',
    useEn: 'The little dish on the balcony',
    service: 'satellite',
    rank: 1,
    channelZh: '波长只有 2 cm 出头，一口 60 cm 的碟子就能把它聚成一个点——锅越小，频率越高',
    channelEn: 'At barely over 2 cm, a 60 cm dish is enough to focus it to a point: the smaller the dish, the higher the frequency',
  },
  {
    id: 'ku-up',
    f0: 1.375e10,
    f1: 1.45e10,
    nameZh: 'Ku 卫星上行',
    nameEn: 'Ku-band satellite uplink',
    useZh: '地面站往天上打',
    useEn: 'Earth stations shouting upward',
    service: 'satellite',
    rank: 0,
  },
  {
    id: 'ka',
    f0: 1.77e10,
    f1: 2.12e10,
    nameZh: 'Ka 卫星宽带',
    nameEn: 'Ka-band satellite broadband',
    useZh: '卫星互联网',
    useEn: 'Satellite internet',
    service: 'satellite',
    rank: 1,
  },
  {
    id: 'mmwave',
    f0: 2.425e10,
    f1: 2.95e10,
    nameZh: '5G 毫米波',
    nameEn: '5G millimetre wave',
    useZh: '一米之内快得吓人',
    useEn: 'Frighteningly fast within a metre or two',
    service: 'mobile',
    rank: 2,
    channelZh: '一格就能宽到 400 MHz，是 4G 主力频段的二十倍；代价是一堵墙、一片树叶都挡得住',
    channelEn: 'A single slot can be 400 MHz wide, twenty times a workhorse 4G band; the price is that a wall — or a leaf — stops it',
  },
  {
    id: 'mmwave-39',
    f0: 3.7e10,
    f1: 4e10,
    nameZh: '39 GHz 毫米波',
    nameEn: '39 GHz millimetre wave',
    useZh: '高频段的另一块',
    useEn: 'Another millimetre-wave lot',
    service: 'mobile',
    rank: 0,
  },
  {
    id: 'wigig',
    f0: 5.7e10,
    f1: 7.1e10,
    nameZh: '60 GHz 短距高速',
    nameEn: '60 GHz short-range links',
    useZh: '被氧气吃掉的频段',
    useEn: 'The band that oxygen eats',
    service: 'short',
    rank: 1,
    channelZh: '空气里的氧分子正好在 60 GHz 共振，信号走不出一个房间——反过来，这让每个房间都能重复用同一段频率',
    channelEn: 'Oxygen molecules resonate right at 60 GHz, so the signal cannot leave the room — which is exactly why every room can reuse the same frequencies',
  },
  {
    id: 'auto-radar',
    f0: 7.6e10,
    f1: 8.1e10,
    nameZh: '汽车防撞雷达',
    nameEn: 'Automotive radar',
    useZh: '车头保险杠里那只眼睛',
    useEn: 'The eye behind the front bumper',
    service: 'radar',
    rank: 1,
    channelZh: '4 mm 的波长可以分辨出前车尾灯和护栏的区别，天线小到能塞进保险杠',
    channelEn: 'A 4 mm wavelength can tell a tail light from a guard rail, and the antenna is small enough to hide in a bumper',
  },
  {
    id: 'mm-astronomy',
    f0: 9e10,
    f1: 3e11,
    nameZh: '毫米波天文与云雷达',
    nameEn: 'Millimetre astronomy and cloud radar',
    useZh: '看星云和看云',
    useEn: 'Looking at nebulae, and at clouds',
    service: 'science',
    rank: 0,
  },
  {
    id: 'thz',
    f0: 3e11,
    f1: 6e12,
    nameZh: '太赫兹',
    nameEn: 'Terahertz',
    useZh: '能看穿包裹的成像',
    useEn: 'Imaging that sees into a parcel',
    service: 'science',
    rank: 1,
    channelZh: '介于无线电与红外之间的一段空白：能量低到不电离人体，波长又短到能成像',
    channelEn: 'A gap between radio and infrared: too low in energy to ionise tissue, short enough in wavelength to form an image',
  },
  {
    id: 'far-ir',
    f0: 6e12,
    f1: 2.14e13,
    nameZh: '远红外',
    nameEn: 'Far infrared',
    useZh: '分子转动的指纹',
    useEn: 'The fingerprints of rotating molecules',
    service: 'thermal',
    rank: 0,
  },
  {
    id: 'thermal-ir',
    f0: 2.14e13,
    f1: 3.75e13,
    nameZh: '热成像窗口',
    nameEn: 'The thermal imaging window',
    useZh: '体温发出的光',
    useEn: 'The light your body temperature emits',
    service: 'thermal',
    rank: 2,
    channelZh: '8–14 μm：大气在这里恰好透明，而 37 °C 的人体辐射峰值也正落在这里，所以红外相机看得见你',
    channelEn: 'Between 8 and 14 μm the atmosphere happens to be transparent, and a 37 °C body radiates most strongly right here — which is why a thermal camera can see you',
  },
  {
    id: 'mid-ir',
    f0: 3.75e13,
    f1: 1e14,
    nameZh: '中红外',
    nameEn: 'Mid infrared',
    useZh: '气体成分分析',
    useEn: 'Reading what a gas is made of',
    service: 'thermal',
    rank: 0,
  },
  {
    id: 'near-ir',
    f0: 1e14,
    f1: 4e14,
    nameZh: '近红外与光纤',
    nameEn: 'Near infrared and optical fibre',
    useZh: '互联网真正跑的地方',
    useEn: 'Where the internet actually runs',
    service: 'thermal',
    rank: 2,
    channels: {
      kind: 'list',
      items: [
        { f: 1.934e14, width: 4.4e12, tagZh: '光纤 C 波段 1550 nm', tagEn: 'Fibre C band, 1550 nm' },
        { f: 3.19e14, width: 6e12, tagZh: '遥控器 940 nm', tagEn: 'Remote control, 940 nm' },
      ],
    },
    channelZh: '1550 nm 上，石英玻璃最不吸光——洲际海底光缆全都跑在这一小段里',
    channelEn: 'At 1550 nm silica glass absorbs the least, so every intercontinental submarine cable runs in this narrow slice',
  },
  {
    id: 'visible',
    f0: 4e14,
    f1: 7.9e14,
    nameZh: '可见光',
    nameEn: 'Visible light',
    useZh: '眼睛唯一收得到的一段',
    useEn: 'The only stretch your eyes receive',
    service: 'visible',
    rank: 2,
    channelZh: '整条标尺跨了十一个数量级，而你能看见的只有这不到一个数量级的一小段',
    channelEn: 'The whole ruler spans eleven orders of magnitude; what you can see is less than one of them',
  },
  {
    id: 'uv',
    f0: 7.9e14,
    f1: 1e15,
    nameZh: '紫外',
    nameEn: 'Ultraviolet',
    useZh: '晒伤开始的地方',
    useEn: 'Where sunburn begins',
    service: 'visible',
    rank: 1,
  },
]

export type Landmark = {
  id: string
  f: number
  nameZh: string
  nameEn: string
}

/** 街上的门牌号：单一频点，缩放到位时才浮出来 */
export const LANDMARKS: Array<Landmark> = [
  { id: 'dcf77', f: 77.5e3, nameZh: 'DCF77 授时', nameEn: 'DCF77 time signal' },
  { id: 'distress-mf', f: 2.182e6, nameZh: '海上遇险 2182 kHz', nameEn: 'Maritime distress, 2182 kHz' },
  { id: 'nfc', f: 13.56e6, nameZh: 'NFC 刷卡', nameEn: 'NFC tap-to-pay' },
  { id: 'ch16', f: 156.8e6, nameZh: '海上 16 频道', nameEn: 'Marine channel 16' },
  { id: 'hydrogen', f: 1420.405_751_768e6, nameZh: '中性氢 21 cm 谱线', nameEn: 'Neutral hydrogen, the 21 cm line' },
  { id: 'gps-l1', f: 1575.42e6, nameZh: 'GPS L1', nameEn: 'GPS L1' },
  { id: 'oven', f: 2.45e9, nameZh: '微波炉 2.45 GHz', nameEn: 'Microwave oven, 2.45 GHz' },
  { id: 'radar-c', f: 5.6e9, nameZh: '气象雷达 C 波段', nameEn: 'C-band weather radar' },
  { id: 'oxygen', f: 60e9, nameZh: '氧气吸收峰', nameEn: 'Oxygen absorption peak' },
  { id: 'fibre', f: 1.934e14, nameZh: '光纤 1550 nm', nameEn: 'Optical fibre, 1550 nm' },
  { id: 'green', f: 5.45e14, nameZh: '视觉最敏感的绿光', nameEn: 'The green your eye sees best' },
]

/** ITU-R V.431-8 频段命名 */
export const ITU_BANDS = [
  { f0: 3e3, f1: 3e4, code: 'VLF', zh: '甚低频', en: 'Very low frequency' },
  { f0: 3e4, f1: 3e5, code: 'LF', zh: '低频', en: 'Low frequency' },
  { f0: 3e5, f1: 3e6, code: 'MF', zh: '中频', en: 'Medium frequency' },
  { f0: 3e6, f1: 3e7, code: 'HF', zh: '高频', en: 'High frequency' },
  { f0: 3e7, f1: 3e8, code: 'VHF', zh: '甚高频', en: 'Very high frequency' },
  { f0: 3e8, f1: 3e9, code: 'UHF', zh: '特高频', en: 'Ultra high frequency' },
  { f0: 3e9, f1: 3e10, code: 'SHF', zh: '超高频', en: 'Super high frequency' },
  { f0: 3e10, f1: 3e11, code: 'EHF', zh: '极高频', en: 'Extremely high frequency' },
  { f0: 3e11, f1: 3e12, code: 'THF', zh: '至高频', en: 'Tremendously high frequency' },
  { f0: 3e12, f1: 4e14, code: 'IR', zh: '红外', en: 'Infrared' },
  { f0: 4e14, f1: 7.9e14, code: 'VIS', zh: '可见光', en: 'Visible' },
  { f0: 7.9e14, f1: 3e16, code: 'UV', zh: '紫外', en: 'Ultraviolet' },
] as const

export type SpectrumLot = {
  id: string
  f0: number
  f1: number
  year: number
  usd: number
  placeZh: string
  placeEn: string
  nameZh: string
  nameEn: string
  amountZh: string
  amountEn: string
}

/**
 * 公开拍卖结果（成交总额，按公告口径的当年货币，未做通胀调整）。
 * 折算用的 usd 只用来决定柱高的量级，不作为精确汇率结论。
 */
export const LOTS: Array<SpectrumLot> = [
  {
    id: 'uk-3g',
    f0: 1.92e9,
    f1: 2.17e9,
    year: 2000,
    usd: 34e9,
    placeZh: '英国',
    placeEn: 'United Kingdom',
    nameZh: '3G 牌照拍卖',
    nameEn: '3G licence auction',
    amountZh: '225 亿英镑',
    amountEn: '£22.5 billion',
  },
  {
    id: 'fcc-600',
    f0: 6.17e8,
    f1: 6.98e8,
    year: 2017,
    usd: 19.8e9,
    placeZh: '美国',
    placeEn: 'United States',
    nameZh: '600 MHz 激励拍卖',
    nameEn: '600 MHz incentive auction',
    amountZh: '198 亿美元',
    amountEn: '$19.8 billion',
  },
  {
    id: 'fcc-aws3',
    f0: 1.755e9,
    f1: 2.18e9,
    year: 2015,
    usd: 44.9e9,
    placeZh: '美国',
    placeEn: 'United States',
    nameZh: 'AWS-3 拍卖',
    nameEn: 'AWS-3 auction',
    amountZh: '449 亿美元',
    amountEn: '$44.9 billion',
  },
  {
    id: 'fcc-cband',
    f0: 3.7e9,
    f1: 3.98e9,
    year: 2021,
    usd: 81.17e9,
    placeZh: '美国',
    placeEn: 'United States',
    nameZh: 'C 波段拍卖',
    nameEn: 'C-band auction',
    amountZh: '811.7 亿美元',
    amountEn: '$81.17 billion',
  },
  {
    id: 'fcc-24',
    f0: 2.425e10,
    f1: 2.5e10,
    year: 2019,
    usd: 2.02e9,
    placeZh: '美国',
    placeEn: 'United States',
    nameZh: '24 GHz 毫米波拍卖',
    nameEn: '24 GHz millimetre-wave auction',
    amountZh: '20.2 亿美元',
    amountEn: '$2.02 billion',
  },
  {
    id: 'fcc-39',
    f0: 3.7e10,
    f1: 4e10,
    year: 2020,
    usd: 7.56e9,
    placeZh: '美国',
    placeEn: 'United States',
    nameZh: '37/39/47 GHz 拍卖',
    nameEn: '37/39/47 GHz auction',
    amountZh: '75.6 亿美元',
    amountEn: '$7.56 billion',
  },
]

export type ScaleObjectShape =
  | 'mountain'
  | 'tower'
  | 'building'
  | 'bus'
  | 'person'
  | 'hand'
  | 'coin'
  | 'rice'
  | 'hair'
  | 'cell'
  | 'virus'

export type ScaleObject = {
  id: string
  metres: number
  shape: ScaleObjectShape
  nameZh: string
  nameEn: string
}

/** 波长实感用的日常参照物，尺寸取常见公开值 */
export const SCALE_OBJECTS: Array<ScaleObject> = [
  { id: 'everest', metres: 8_849, shape: 'mountain', nameZh: '珠穆朗玛峰高 8 849 m', nameEn: 'Everest is 8,849 m tall' },
  { id: 'burj', metres: 828, shape: 'tower', nameZh: '哈利法塔高 828 m', nameEn: 'The Burj Khalifa is 828 m tall' },
  { id: 'eiffel', metres: 330, shape: 'tower', nameZh: '埃菲尔铁塔高 330 m', nameEn: 'The Eiffel Tower is 330 m tall' },
  { id: 'block', metres: 30, shape: 'building', nameZh: '一栋十层楼约 30 m', nameEn: 'A ten-storey block is about 30 m' },
  { id: 'bus', metres: 12, shape: 'bus', nameZh: '一辆公交车约 12 m', nameEn: 'A city bus is about 12 m' },
  { id: 'person', metres: 1.7, shape: 'person', nameZh: '一个成年人约 1.7 m', nameEn: 'An adult is about 1.7 m' },
  { id: 'hand', metres: 0.19, shape: 'hand', nameZh: '一只手掌约 19 cm', nameEn: 'A hand is about 19 cm' },
  { id: 'coin', metres: 0.025, shape: 'coin', nameZh: '一枚硬币约 25 mm', nameEn: 'A coin is about 25 mm' },
  { id: 'rice', metres: 0.006, shape: 'rice', nameZh: '一粒米约 6 mm', nameEn: 'A grain of rice is about 6 mm' },
  { id: 'hair', metres: 7e-5, shape: 'hair', nameZh: '一根头发约 70 μm', nameEn: 'A hair is about 70 μm' },
  { id: 'cell', metres: 2e-6, shape: 'cell', nameZh: '一个细菌约 2 μm', nameEn: 'A bacterium is about 2 μm' },
  { id: 'virus', metres: 1e-7, shape: 'virus', nameZh: '一个病毒约 100 nm', nameEn: 'A virus is about 100 nm' },
]

/**
 * ITU-R P.2040 表 3 的建筑材料电特性：
 *   相对介电常数实部 η' = a · f_GHz^b，电导率 σ = c · f_GHz^d (S/m)
 * validGHz 是 Recommendation 声明的适用频率范围，超出范围本世界画成外推。
 */
export type WallMaterial = {
  id: string
  nameZh: string
  nameEn: string
  a: number
  b: number
  c: number
  d: number
  validGHz: [number, number]
  thickness: number
}

export const WALL_MATERIALS: Array<WallMaterial> = [
  { id: 'concrete', nameZh: '混凝土 20 cm', nameEn: 'Concrete, 20 cm', a: 5.24, b: 0, c: 0.0462, d: 0.7822, validGHz: [1, 100], thickness: 0.2 },
  { id: 'brick', nameZh: '砖墙 12 cm', nameEn: 'Brick, 12 cm', a: 3.91, b: 0, c: 0.0238, d: 0.16, validGHz: [1, 40], thickness: 0.12 },
  { id: 'plaster', nameZh: '石膏板 13 mm', nameEn: 'Plasterboard, 13 mm', a: 2.73, b: 0, c: 0.0085, d: 0.9395, validGHz: [1, 100], thickness: 0.013 },
  { id: 'glass', nameZh: '玻璃 6 mm', nameEn: 'Glass, 6 mm', a: 6.31, b: 0, c: 0.0036, d: 1.3394, validGHz: [0.1, 100], thickness: 0.006 },
]

/** 绕射演示的固定几何，画面上要写出来 */
export const DIFFRACTION_GEOMETRY = { edgeHeight: 3, d1: 30, d2: 20 }

export function wavelength(frequency: number) {
  return LIGHT_SPEED / frequency
}

type Complex = [number, number]

function cMul(a: Complex, b: Complex): Complex {
  return [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]]
}

function cDiv(a: Complex, b: Complex): Complex {
  const denominator = b[0] * b[0] + b[1] * b[1]
  return [(a[0] * b[0] + a[1] * b[1]) / denominator, (a[1] * b[0] - a[0] * b[1]) / denominator]
}

function cSqrt(a: Complex): Complex {
  const modulus = Math.hypot(a[0], a[1])
  const real = Math.sqrt(Math.max(0, (modulus + a[0]) / 2))
  const imaginary = Math.sign(a[1] || 1) * Math.sqrt(Math.max(0, (modulus - a[0]) / 2))
  return [real, imaginary]
}

/** e^z */
function cExp(a: Complex): Complex {
  const scale = Math.exp(a[0])
  return [scale * Math.cos(a[1]), scale * Math.sin(a[1])]
}

function cAbs(a: Complex) {
  return Math.hypot(a[0], a[1])
}

/**
 * ITU-R P.2040 的均匀平板法向入射透射：
 *   T = (1 − Γ²) e^{−jk₀ n d} / (1 − Γ² e^{−2jk₀ n d})
 * 含板内多次反射，因此曲线上会出现真实的法布里–珀罗起伏。
 * 返回穿墙损耗 dB（正值 = 衰减）。
 */
export function wallLossDb(frequency: number, material: WallMaterial) {
  const fGHz = frequency / 1e9
  const real = material.a * fGHz ** material.b
  const conductivity = material.c * fGHz ** material.d
  const imaginary = -17.98 * conductivity / fGHz
  const permittivity: Complex = [real, imaginary]
  const index = cSqrt(permittivity)
  const one: Complex = [1, 0]
  const reflection = cDiv([one[0] - index[0], one[1] - index[1]], [one[0] + index[0], one[1] + index[1]])
  const reflectionSquared = cMul(reflection, reflection)
  const k0 = (2 * Math.PI * frequency) / LIGHT_SPEED
  // e^{−j k₀ n d}
  const phase = cExp([k0 * material.thickness * index[1], -k0 * material.thickness * index[0]])
  const phaseTwice = cMul(phase, phase)
  const numerator = cMul([one[0] - reflectionSquared[0], one[1] - reflectionSquared[1]], phase)
  const denominator: Complex = [
    1 - (reflectionSquared[0] * phaseTwice[0] - reflectionSquared[1] * phaseTwice[1]),
    -(reflectionSquared[0] * phaseTwice[1] + reflectionSquared[1] * phaseTwice[0]),
  ]
  const transmission = cAbs(cDiv(numerator, denominator))
  return Math.max(0, -20 * Math.log10(Math.max(transmission, 1e-12)))
}

/**
 * ITU-R P.526 单刃绕射损耗近似：
 *   ν = h √(2/λ · (1/d₁ + 1/d₂))
 *   J(ν) = 6.9 + 20 lg( √((ν − 0.1)² + 1) + ν − 0.1 )，ν > −0.78 时适用
 */
export function diffractionLossDb(frequency: number, geometry = DIFFRACTION_GEOMETRY) {
  const lambda = wavelength(frequency)
  const nu = geometry.edgeHeight * Math.sqrt((2 / lambda) * (1 / geometry.d1 + 1 / geometry.d2))
  if (nu <= -0.78) return 0
  return 6.9 + 20 * Math.log10(Math.sqrt((nu - 0.1) ** 2 + 1) + nu - 0.1)
}

export function bandAt(frequency: number): SpectrumBand | null {
  let best: SpectrumBand | null = null
  for (const band of BANDS) {
    if (frequency >= band.f0 && frequency <= band.f1) {
      if (!best || band.f1 - band.f0 < best.f1 - best.f0) best = band
    }
  }
  return best
}

export function ituBandAt(frequency: number) {
  return ITU_BANDS.find((band) => frequency >= band.f0 && frequency < band.f1) ?? ITU_BANDS[ITU_BANDS.length - 1]
}

export function nearestObject(metres: number): ScaleObject {
  let best = SCALE_OBJECTS[0]
  let bestDistance = Infinity
  for (const object of SCALE_OBJECTS) {
    const distance = Math.abs(Math.log10(object.metres / metres))
    if (distance < bestDistance) {
      bestDistance = distance
      best = object
    }
  }
  return best
}

/** 光标落在某笔拍卖里就返回它；否则返回频率上最近的一笔，面板永远有话可说 */
export function lotAt(frequency: number): { lot: SpectrumLot; inside: boolean } {
  let inside: SpectrumLot | null = null
  let nearest = LOTS[0]
  let nearestDistance = Infinity
  for (const lot of LOTS) {
    if (frequency >= lot.f0 && frequency <= lot.f1) {
      if (!inside || lot.f1 - lot.f0 < inside.f1 - inside.f0) inside = lot
    }
    const centre = Math.sqrt(lot.f0 * lot.f1)
    const distance = Math.abs(Math.log10(centre / frequency))
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = lot
    }
  }
  return inside ? { lot: inside, inside: true } : { lot: nearest, inside: false }
}

const FREQUENCY_UNITS = [
  { scale: 1e12, unit: 'THz' },
  { scale: 1e9, unit: 'GHz' },
  { scale: 1e6, unit: 'MHz' },
  { scale: 1e3, unit: 'kHz' },
  { scale: 1, unit: 'Hz' },
] as const

export function formatFrequency(frequency: number, digits?: number) {
  const entry = FREQUENCY_UNITS.find((item) => frequency >= item.scale) ?? FREQUENCY_UNITS[FREQUENCY_UNITS.length - 1]
  const value = frequency / entry.scale
  const decimals = digits ?? (value >= 100 ? 1 : value >= 10 ? 2 : 3)
  return { value: value.toFixed(decimals), unit: entry.unit }
}

const LENGTH_UNITS = [
  { scale: 1e3, unit: 'km' },
  { scale: 1, unit: 'm' },
  { scale: 1e-2, unit: 'cm' },
  { scale: 1e-3, unit: 'mm' },
  { scale: 1e-6, unit: 'μm' },
  { scale: 1e-9, unit: 'nm' },
] as const

export function formatLength(metres: number, digits?: number) {
  const entry = LENGTH_UNITS.find((item) => metres >= item.scale) ?? LENGTH_UNITS[LENGTH_UNITS.length - 1]
  const value = metres / entry.scale
  const decimals = digits ?? (value >= 100 ? 0 : value >= 10 ? 1 : 2)
  return { value: value.toFixed(decimals), unit: entry.unit }
}

/**
 * 可见光近似着色：Dan Bruton 的经典分段线性近似（公有领域教学算法）。
 * 只用于把可见光那一小段画出颜色，不是比色学结论。
 */
export function visibleColour(nanometres: number, alpha = 1) {
  const nm = nanometres
  let r = 0
  let g = 0
  let b = 0
  if (nm >= 380 && nm < 440) {
    r = -(nm - 440) / 60
    b = 1
  } else if (nm < 490) {
    g = (nm - 440) / 50
    b = 1
  } else if (nm < 510) {
    g = 1
    b = -(nm - 510) / 20
  } else if (nm < 580) {
    r = (nm - 510) / 70
    g = 1
  } else if (nm < 645) {
    r = 1
    g = -(nm - 645) / 65
  } else if (nm <= 780) {
    r = 1
  }
  let falloff = 1
  if (nm < 420) falloff = 0.3 + (0.7 * (nm - 360)) / 60
  else if (nm > 700) falloff = 0.3 + (0.7 * (780 - nm)) / 80
  falloff = Math.max(0, Math.min(1, falloff))
  const encode = (value: number) => Math.round(255 * Math.max(0, Math.min(1, value * falloff)) ** 0.8)
  return `rgba(${encode(r)}, ${encode(g)}, ${encode(b)}, ${alpha})`
}

export type Tick = { f: number; major: boolean; label: string }

/**
 * 刻度自动换档：跨度大于一个半数量级时按十进制走，
 * 收窄之后切成 1/2/5 的线性刻度，单位随量级换成 kHz/MHz/GHz/THz。
 */
export function buildTicks(left: number, right: number): { ticks: Array<Tick>; unit: string } {
  const decades = Math.log10(right / left)
  const unitEntry = FREQUENCY_UNITS.find((item) => right >= item.scale * 1.0001) ?? FREQUENCY_UNITS[FREQUENCY_UNITS.length - 1]
  const ticks: Array<Tick> = []

  if (decades > 1.4) {
    const first = Math.floor(Math.log10(left))
    const last = Math.ceil(Math.log10(right))
    const stride = decades > 8 ? 2 : 1
    for (let exponent = first; exponent <= last; exponent += 1) {
      for (const multiplier of decades > 4 ? [1] : [1, 2, 5]) {
        const f = multiplier * 10 ** exponent
        if (f < left || f > right) continue
        const major = multiplier === 1 && (exponent % stride === 0 || decades <= 4)
        const entry = FREQUENCY_UNITS.find((item) => f >= item.scale * 0.999) ?? FREQUENCY_UNITS[FREQUENCY_UNITS.length - 1]
        const value = f / entry.scale
        ticks.push({
          f,
          major,
          label: major ? `${value >= 1 ? value.toFixed(0) : value.toFixed(1)} ${entry.unit}` : '',
        })
      }
    }
    return { ticks, unit: '' }
  }

  const span = right - left
  const rough = span / 7
  const exponent = Math.floor(Math.log10(rough))
  const base = 10 ** exponent
  const normalised = rough / base
  const step = (normalised > 5 ? 10 : normalised > 2 ? 5 : normalised > 1 ? 2 : 1) * base
  const minor = step / 5
  const start = Math.ceil(left / minor) * minor
  const scale = unitEntry.scale
  const decimals = Math.max(0, Math.min(6, Math.ceil(-Math.log10(step / scale)) + 0))
  for (let f = start; f <= right; f += minor) {
    const isMajor = Math.abs(f / step - Math.round(f / step)) < 1e-6
    ticks.push({
      f,
      major: isMajor,
      label: isMajor ? (f / scale).toFixed(decimals) : '',
    })
    if (ticks.length > 240) break
  }
  return { ticks, unit: unitEntry.unit }
}
