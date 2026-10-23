// 《深圳写字楼空了四分之一，为什么还在盖？》 v5: one 3D city, the question first, then one tower's account and the
// reasons building goes on. SCRIPT.md has the bar table; bars are story bars (src/v4/bars.ts).
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Grain, Vignette } from "../bg";
import { K } from "../theme";
import { World } from "../world/World";
import { barAt, bf } from "./bars";
import { Deal, Elsewhere, LeaseBar, LeaseLeft, MoveOutKey, QuestionDim, Rent, RentArc, Returns, SkylineCount, TaxCount, YearCounter } from "./overlays";
import { At, BrandMark, EndCard, Line, Note, Pin, Sources } from "./ui";
import { DISTRICTS, HERO, HQ, LAND_COLS, PARCEL, PLACES, SCZ, worldAt } from "./world";

// The edited track (tools/music-edit.sh) runs past the film; the film ends on the end card with the music fading.
export const FILM4_FRAMES = bf(104.2);
// The track peaks near +0.8 dBTP once encoded; this keeps the master under −1 dBTP.
const GAIN = 0.75;
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Quiet sounds for the key actions (music.shapeof.world): lights switching off, the years ticking while the tower
// goes up, the cut into the tower, the 五年不涨 stamp.
const SFX: { id: string; bar: number; vol: number }[] = [
  ...[3.2, 3.4, 3.6, 3.8].map((bar, i) => ({ id: "sfx-mechanical-01", bar, vol: 0.2 + 0.04 * (i % 2) })),
  { id: "sfx-transition-13", bar: 6.0, vol: 0.2 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-mechanical-14", bar: 16.4 + (i + 1) * 0.26, vol: 0.13 })),
  { id: "sfx-transition-13", bar: 21.0, vol: 0.15 },
  { id: "sfx-impact-01", bar: 32.3, vol: 0.42 },
  ...[95.95, 96.15, 96.35].map((bar) => ({ id: "sfx-mechanical-01", bar, vol: 0.18 })),
];

const G = K.gold;
const O = K.theme;
const R = K.red;
const B = "#a9c1e0";

// Type sizes: S = statement, S2 = its second line, Q = question.
const S = 76;
const S2 = 62;
const Q = 124;

export const Film4: React.FC = () => {
  const frame = useCurrentFrame();
  const s = worldAt(frame);
  const cam = s.cam;
  const bar = barAt(frame);
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      <Audio src={staticFile("music-v6.wav")} volume={(f) => GAIN * interpolate(f, [0, 3], [0.6, 1], CL) * interpolate(f, [bf(102.4), FILM4_FRAMES - 1], [1, 0], { ...CL, easing: (t) => 1 - (1 - t) * (1 - t) })} />
      {SFX.map((x, i) => (
        <Sequence key={i} from={bf(x.bar)} durationInFrames={60} layout="none">
          <Audio src={staticFile(`sfx/${x.id}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
      {bar < 101.6 ? <World s={s} /> : null}
      <QuestionDim />

      {/* ---------- the question ---------- */}
      <At x={110} y={110}>
        <Line at={1.78} out={3.05} size={96} stagger={1} parts={["深圳的摩天楼，", { t: "全世界最多", c: G }, "。"]} />
      </At>
      <Note at={1.9} out={3.05}>200 米以上的楼 200 栋，世界城市第一 · CTBUH 2026-10</Note>

      <At x={110} y={110}>
        <Line at={3.08} out={4.3} size={96} stagger={1} parts={["可写字楼里，"]} />
        <Line at={3.3} out={4.3} size={96} stagger={1} parts={[{ t: "约四分之一", c: G }, "是空的。"]} />
      </At>
      <Note at={3.1} out={4.3}>2026 年三季度空置率 23.6%–28.7%：高力、仲量联行、戴德梁行、第一太平戴维斯</Note>

      <At x={960} y={96} align="center">
        <Line at={4.35} out={5.3} size={92} stagger={1} parts={["新楼，还在一栋接一栋地", { t: "盖", c: G }, "。"]} />
      </At>
      <Note at={4.4} out={5.3}>南山后海 · 2024–2025 年深圳又建成 37 栋 200 米以上的楼（CTBUH）</Note>

      <At x={960} y={350} align="center" gap={4}>
        <Line at={5.3} out={6.6} size={Q} serif weight={700} stagger={0.8} parts={["空着这么多，"]} />
        <Line at={5.45} out={6.6} size={Q} serif weight={700} stagger={0.8} parts={["为什么", { t: "还要盖", c: G }, "？"]} />
      </At>

      {/* ---------- one tower's account ---------- */}
      <At x={110} y={880}>
        <Line at={6.7} out={8.25} size={S} parts={["先跟着一栋楼，算一笔账。"]} />
      </At>
      <Pin cam={cam} at={7.2} out={10.2} x={-128} y={-766} h={218} lift={50} text="深圳能源大厦" sub="北塔 218 米 · 南塔 111 米" color={K.fg} size={44} />
      <At x={110} y={110}>
        <Line at={8.35} out={10.2} size={S} parts={["它在", { t: "福田中心区", c: O }, "，深圳的 CBD。"]} />
      </At>
      <Pin cam={cam} at={8.6} out={10.2} x={PLACES.lianhua.x} y={PLACES.lianhua.y} text="莲花山" size={32} lift={40} />
      <Pin cam={cam} at={8.7} out={10.2} x={PLACES.civic.x} y={PLACES.civic.y} text="市民中心" size={32} lift={40} />
      <Pin cam={cam} at={8.8} out={10.2} x={PLACES.expo.x} y={PLACES.expo.y} text="会展中心" size={32} lift={40} side="left" />
      <Pin cam={cam} at={8.9} out={10.2} x={PLACES.pingan.x} y={PLACES.pingan.y} text="平安金融中心" size={32} lift={40} side="left" />

      <At x={110} y={110}>
        <Line at={10.4} out={12.35} size={S} parts={[{ t: "2008", c: O }, " 年，这里是一块空地，"]} />
        <Line at={10.9} out={12.35} size={S} parts={["比一个足球场还小。"]} />
      </At>
      <Pin cam={cam} at={11.0} out={12.35} x={PARCEL.x} y={PARCEL.y} h={2} text="6,427 ㎡" color={O} size={44} lift={110} />
      <Pin cam={cam} at={11.3} out={12.35} x={PARCEL.x + 120} y={PARCEL.y + 10} h={2} text="标准足球场" sub="7,140 ㎡" color="#9fe3b0" size={36} lift={80} />

      <At x={110} y={110}>
        <Line at={12.45} out={14.35} size={S} parts={["规划允许盖 ", { t: "9.6 万平方米", c: O }, "，"]} />
        <Line at={12.9} out={14.35} size={S} parts={["是地块面积的 15 倍。"]} />
      </At>
      <Pin cam={cam} at={13.7} out={14.35} x={PARCEL.x} y={PARCEL.y} h={134} text="× 15" color={O} size={72} lift={30} dot={false} />

      <At x={110} y={110}>
        <Line at={14.45} out={16.4} size={S} parts={["深圳能源花 ", { t: "6.7 亿元", c: O }, "，"]} />
        <Line at={14.9} out={16.4} size={S} parts={["买下这块地 ", { t: "50 年", c: O }, "的使用权。"]} />
      </At>
      <LeaseBar />

      <At x={110} y={110}>
        <Line at={16.5} out={18.95} size={S2} weight={700} parts={["设计、审批、施工……"]} />
        <Line at={17.3} out={18.95} size={96} parts={["盖了", { t: "整整十年", c: O }, "。"]} />
      </At>
      <YearCounter />

      <At x={110} y={110}>
        <Line at={19.0} out={21.0} size={S} parts={["加上地，一共约 ", { t: "29 亿元", c: O }, "。"]} />
        <Line at={19.6} out={21.0} size={S2} weight={700} parts={["计划一半自己出，一半向银行借。"]} />
      </At>

      {/* ---------- after it was built ---------- */}
      <At x={110} y={110}>
        <Line at={21.3} out={24.9} size={S} parts={["它盖的那十年，"]} />
        <Line at={21.7} out={24.9} size={S} parts={[{ t: "全城都在盖", c: G }, "。"]} />
      </At>
      <SkylineCount />
      <Note at={21.5} out={24.9}>CTBUH：深圳已建成的高楼，按竣工年份 · 全城视角下楼高放大 2 倍</Note>

      <At x={110} y={110}>
        <Line at={25.0} out={27.4} size={S} parts={["楼多了，人没跟上。"]} />
        <Line at={25.6} out={27.4} size={S2} weight={700} parts={["最空的南山后海，", { t: "三间空一间", c: R }, "。"]} />
      </At>
      {DISTRICTS.map((d, i) => (
        <Pin key={d.name} cam={cam} at={25.2 + i * 0.12} out={27.4} x={d.x} y={d.y} h={d.vac * 45} lift={18} dot={false} text={`${d.vac.toFixed(1)}%`} sub={d.name} size={d.name === "后海" ? 44 : 32} color={d.vac > 30 ? R : K.fg} />
      ))}

      <At x={960} y={300} align="center">
        <Line at={27.5} out={30.5} size={S} parts={["房租，跌了一半。"]} />
      </At>
      <Rent />
      <Note at={27.6} out={30.5}>戴德梁行：全市甲级写字楼平均租金 2018 年 276.6 元 → 2026 年三季度 142.2 元；"回落至与 2011 年基本相当的水平"</Note>

      <At x={960} y={130} align="center">
        <Line at={30.65} out={33.6} size={S} parts={["可在它盖楼的那些年，"]} />
        <Line at={31.0} out={33.6} size={S} parts={["房租一路在", { t: "涨", c: K.green }, "。"]} />
      </At>
      <RentArc />
      <Note at={30.8} out={33.6}>戴德梁行：2018 年高点 276.6 元/㎡/月；2025 年二季度 160.1 元"回落至与 2011 年基本相当的水平"，2011 年按约 160 元画；2026 年三季度 142.2 元</Note>

      {/* ---------- the account ---------- */}
      <At x={960} y={130} align="center">
        <Line at={33.8} out={35.6} size={S} parts={["假如整栋都出租，"]} />
        <Line at={34.15} out={35.6} size={S} parts={["这 ", { t: "29 亿", c: O }, "，一年能赚多少？"]} />
      </At>
      <At x={960} y={130} align="center">
        <Line at={35.7} out={38.4} size={S} parts={["先记住：这块地只能用 ", { t: "50 年", c: B }, "。"]} />
        <Line at={36.4} out={38.4} size={S2} weight={700} parts={["盖好那天只剩 40 年；到期要续，得再交一笔地价。"]} />
      </At>
      <LeaseLeft />

      <At x={960} y={130} align="center">
        <Line at={38.5} out={40.6} size={S} parts={["算上这一点，按盖好时的租金："]} />
        <Line at={38.95} out={40.6} size={S} parts={["一年约赚 ", { t: "3.4%", c: K.green }, "。"]} />
      </At>
      <At x={960} y={130} align="center">
        <Line at={40.7} out={43.3} size={S} parts={["可这几年，房租一路在", { t: "跌", c: R }, "……"]} />
      </At>
      <At x={960} y={150} align="center">
        <Line at={43.4} out={45.95} size={106} serif weight={700} parts={["按今天的租金呢？"]} />
      </At>
      <At x={960} y={110} align="center" gap={2}>
        <Line at={46.0} out={48.8} size={150} weight={900} parts={[{ t: "不到 1%", c: R }]} />
        <Line at={46.6} out={48.8} size={S2} weight={700} parts={["比今天买国债还少。按全市平均租金，40 年都", { t: "收不回本", c: R }, "。"]} />
      </At>
      <Returns />
      <Note at={38.6} out={48.8}>估算：40 年年化回报，按 2018 年一次投入 29.36 亿、整栋按市场租金出租、租金不涨，扣除税费、运营和大修，地到期后不计价值；2018 年起始租金满租；福田 168 元/㎡、出租率 82%；全市 140 元、75% · 十年期国债约 1.62%（2026-10）</Note>

      {/* ---------- why it goes on ---------- */}
      <At x={960} y={330} align="center">
        <Line at={48.9} out={50.4} size={Q} serif weight={700} stagger={0.8} parts={["那为什么，", { t: "还在盖", c: G }, "？"]} />
      </At>
      <At x={960} y={110} align="center">
        <Line at={50.5} out={53.6} size={S} parts={["城市其实已经踩了刹车。"]} />
        <Line at={51.0} out={53.6} size={S2} weight={700} parts={["今年计划卖的商业办公用地，只有 2021 年的五分之一。"]} />
      </At>
      <Pin cam={cam} at={51.2} out={53.6} x={-1050} y={-250} h={303} lift={30} dot={false} text="52.3 公顷" sub="2021 年" color={B} size={48} />
      <Pin cam={cam} at={52.0} out={53.6} x={420} y={-250} h={303} lift={30} dot={false} text="10 公顷" sub="2026 年" color={O} size={48} />
      <Note at={50.6} out={53.6}>深圳市规划和自然资源局《2026 年度建设用地供应计划》：商服用地 10 公顷，"严控商办用地新增供应"；2021 年 52.3 公顷（每日经济新闻）</Note>

      <At x={110} y={110}>
        <Line at={53.75} out={57.8} size={S} parts={["还在盖的，是好几年前定下的楼。"]} />
        <Line at={54.5} out={57.8} size={S2} weight={700} parts={["从拿地到搬进去，要 ", { t: "5 到 10 年", c: G }, "。"]} />
      </At>
      <Pin cam={cam} at={54.7} out={57.8} x={-9750} y={-1621} h={393} lift={40} text="招商银行全球总部" sub="2016 年拿地 → 2025 年建成" color={K.fg} size={36} />
      <Pin cam={cam} at={55.1} out={57.8} x={-12720} y={-2739} h={158} lift={60} text="字节跳动后海中心" sub="2020 年拿地 → 2025 年建成" color={K.fg} size={36} side="right" />

      <At x={110} y={110}>
        <Line at={57.95} out={60.6} size={S} parts={["而且很多楼，本来就不是盖来出租的。"]} />
        <Line at={59.2} out={60.6} size={S2} weight={700} parts={["2025 年深圳新盖好的写字楼，", { t: "一半以上", c: O }, "是企业自己的总部。"]} />
      </At>
      <Pin cam={cam} at={58.1} out={59.05} x={-128} y={-766} h={190} lift={60} text="深圳能源：北塔 13 层自己用" color={O} size={40} side="right" />
      {HQ.map((h, i) => (
        <Pin key={h.label} cam={cam} at={59.6 + i * 0.1} out={60.6} x={h.x} y={h.y} h={i === 3 ? 600 : 300} lift={40} text={h.label} size={30} color={O} />
      ))}

      <At x={110} y={110}>
        <Line at={60.75} out={62.9} size={S} parts={["公司搬进自己的楼，"]} />
        <Line at={61.15} out={62.9} size={S} parts={["原来租的写字楼，就", { t: "空了出来", c: R }, "。"]} />
      </At>
      <MoveOutKey />

      <At x={110} y={110}>
        <Line at={63.05} out={65.6} size={S} parts={["企业愿意自己盖，因为地便宜："]} />
        <Line at={63.6} out={65.6} size={S2} weight={700} parts={["同一条街道，总部用地的价钱，", { t: "只有住宅的十分之一", c: O }, "。"]} />
      </At>
      <Pin cam={cam} at={63.8} out={65.6} x={PLACES.yuehai.x - 260} y={PLACES.yuehai.y + 120} h={10.86 * 90} lift={20} dot={false} text="10.86 万元" sub="住宅地 · 每盖 1㎡ 摊的地价" color={R} size={44} />
      <Pin cam={cam} at={64.4} out={65.6} x={PLACES.yuehai.x + 120} y={PLACES.yuehai.y - 40} h={1.11 * 90} lift={20} dot={false} text="1.11 万元" sub="总部地 · 每盖 1㎡ 摊的地价" color={O} size={44} />
      <Note at={63.1} out={65.6}>南山粤海街道：住宅地 2026-06（第一财经）；总部地 K602-0016，2025（澎湃新闻），楼面价为估算</Note>

      <At x={110} y={110}>
        <Line at={65.7} out={68.2} size={S} parts={["条件是：5 年在深圳交够 ", { t: "15 亿元税", c: G }, "，"]} />
        <Line at={66.1} out={68.2} size={S} parts={["楼不准卖。"]} />
      </At>
      <Deal />
      <Note at={65.8} out={68.2}>K602-0016，2025 年由字节跳动旗下公司竞得；出让公告原文为"形成地方财力不低于 15 亿元"，办公等产权不得转让</Note>

      <At x={960} y={150} align="center" gap={14}>
        <Line at={68.3} out={70.5} size={96} serif weight={700} parts={["城市卖的不是地，是", { t: "以后的税", c: G }, "。"]} />
        <Line at={69.1} out={70.5} size={S2} weight={700} parts={["这些税，会变成路、地铁和学校。"]} />
      </At>

      {/* ---------- zoom out ---------- */}
      <At x={110} y={110}>
        <Line at={70.65} out={74.6} size={S} parts={["靠卖地赚钱的日子，正在过去。"]} />
        <Line at={71.3} out={74.6} size={S2} weight={700} parts={["全国卖地的钱，4 年", { t: "少了一半多", c: R }, "。"]} />
      </At>
      <Pin cam={cam} at={71.7} out={76.3} x={LAND_COLS[0].x} y={LAND_COLS[0].y} h={8.7051 * 300} lift={24} dot={false} text="8.7 万亿" sub="2021 年 · 全国卖地收入" color={G} size={52} />
      <Pin cam={cam} at={72.4} out={76.3} x={LAND_COLS[1].x} y={LAND_COLS[1].y} h={4.1518 * 300} lift={24} dot={false} text="4.2 万亿" sub="2025 年" color={O} size={52} />
      <Note at={70.8} out={76.3}>财政部：全国国有土地使用权出让收入 2021 年 87,051 亿元，2025 年 41,518 亿元</Note>
      <At x={110} y={110}>
        <Line at={74.7} out={76.3} size={S} parts={["所以不只深圳，"]} />
        <Line at={75.1} out={76.3} size={S} parts={["各地都更要靠", { t: "企业交的税", c: G }, "。"]} />
      </At>

      <At x={960} y={170} align="center">
        <Line at={76.4} out={78.0} size={S} parts={["写字楼空着，也不只是深圳。"]} />
        <Line at={76.6} out={78.0} size={S2 - 10} weight={700} color="rgba(244,240,232,0.8)" parts={["甲级写字楼空置率"]} />
      </At>
      <Elsewhere />

      <At x={110} y={110}>
        <Line at={78.1} out={82.1} size={S} parts={["盖楼这场赌，也有人", { t: "输了", c: R }, "。"]} />
        <Line at={78.8} out={82.1} size={S2 - 6} weight={700} parts={["恒大：2017 年拿地，挖到地下 42 米停工，2022 年转手。"]} />
        <Line at={79.9} out={82.1} size={S2 - 6} weight={700} parts={["万科：2017 年拿地，2024 年转手，亏了约 ", { t: "9 亿", c: R }, "。"]} />
      </At>
      <Pin cam={cam} at={78.4} out={82.1} x={SCZ.x} y={SCZ.y} h={0} lift={120} text="深圳湾超级总部基地" sub="两块地都在这里" color={K.fg} size={38} />
      <Note at={78.3} out={82.1}>观点网 2022-11-12：恒大 T208-0054 2021-09 停工，基坑深 42.40 米，2022-11 转让；赢商网 2024-05-28：万科 T208-0053 以 22.35 亿元转让（2017 年 31.37 亿元拿地）</Note>

      <At x={110} y={110}>
        <Line at={82.2} out={86.1} size={S} parts={["深圳押的，是", { t: "下一批公司", c: G }, "。"]} />
        <Line at={82.9} out={86.1} size={S2} weight={700} parts={["2.6 万多家高新技术企业，谁长大了，"]} />
        <Line at={83.5} out={86.1} size={S2} weight={700} parts={["谁就会搬进", { t: "下一栋楼", c: G }, "。"]} />
      </At>
      <Note at={82.4} out={86.1}>2026 年深圳市政府工作报告：2025 年新增国家高新技术企业 7300 家，总量突破 2.6 万家 · 亮起的楼为示意</Note>

      {/* ---------- 升华 ---------- */}
      <At x={120} y={240}>
        <Line at={86.6} out={90.5} size={S2} weight={700} parts={["福田区，一年交税过亿元的写字楼"]} />
      </At>
      <TaxCount />
      <Note at={86.7} out={90.5}>福田区政府工作报告 2012；《福田概况》2026 · 按楼里企业交的税计 · 亮起的楼为示意</Note>
      <At x={960} y={130} align="center">
        <Line at={90.7} out={94.6} size={84} parts={["你每天走进去的那栋楼，"]} />
        <Line at={91.6} out={94.6} size={84} parts={["是一座城市", { t: "十年前下的注", c: G }, "。"]} />
      </At>
      <At x={960} y={150} align="center" gap={18}>
        <Line at={95.4} out={98.6} size={S} weight={700} parts={["空着的那些，还在等。"]} />
        <Line at={96.6} out={98.6} size={120} serif weight={700} parts={["它赌的，是", { t: "你会来", c: G }, "。"]} />
      </At>

      <Sources at={98.6} out={101.0} />
      <BrandMark o={interpolate(frame, [bf(100.7), bf(101.0)], [1, 0], CL)} />
      <Vignette />
      <Grain />
      <EndCard at={100.9} />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM4_FRAMES - 24, FILM4_FRAMES - 1], [0, 1], CL), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const HERO_XY = HERO;
