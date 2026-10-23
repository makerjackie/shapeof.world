// 《深圳的写字楼空着，为什么还在盖？》 v4: one 3D city, one camera, the question first. SCRIPT.md has the table.
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { Grain, Vignette } from "../bg";
import { K } from "../theme";
import { MUSIC_END_FRAME, MUSIC_OFFSET } from "../timing";
import { World } from "../world/World";
import { barAt, bf } from "./bars";
import { Account, Deal, LeaseBar, OwnRent, QuestionDim, Rent, SkylineCount, TaxCount, YearCounter } from "./overlays";
import { At, BrandMark, EndCard, Line, Note, Pin, Sources } from "./ui";
import { DISTRICTS, HERO, HQ, PARCEL, PLACES, worldAt } from "./world";

// The film ends three bars before the track does: the music fades out over the end card instead of a long hold.
export const FILM4_FRAMES = Math.min(MUSIC_END_FRAME, bf(80.2));
// The track peaks near +0.8 dBTP once encoded; the master step (tools/tpmaster.py) brings it under −1 dBTP.
const GAIN = 0.79;
const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// A few quiet sounds for the key actions (music.shapeof.world, own library): lights switching off, the years
// ticking while the tower goes up, the dive onto the tower, the 五年不涨 stamp.
const SFX: { id: string; bar: number; vol: number }[] = [
  ...[2.55, 2.78, 3.0, 3.22, 3.45].map((bar, i) => ({ id: "sfx-mechanical-01", bar, vol: 0.2 + 0.04 * (i % 2) })),
  { id: "sfx-transition-13", bar: 6.05, vol: 0.2 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-mechanical-14", bar: 16.4 + (i + 1) * 0.26, vol: 0.13 })),
  { id: "sfx-transition-13", bar: 20.2, vol: 0.15 },
  { id: "sfx-impact-01", bar: 32.2, vol: 0.42 },
  ...[71.0, 71.2, 71.4].map((bar) => ({ id: "sfx-mechanical-01", bar, vol: 0.18 })),
];

const G = K.gold;
const O = K.theme;
const R = K.red;

export const Film4: React.FC = () => {
  const frame = useCurrentFrame();
  const s = worldAt(frame);
  const cam = s.cam;
  const bar = barAt(frame);
  return (
    <AbsoluteFill style={{ background: "#050608", overflow: "hidden" }}>
      <Audio
        src={staticFile("music.m4a")}
        trimBefore={MUSIC_OFFSET}
        volume={(f) => GAIN * interpolate(f, [0, 3], [0.6, 1], CL) * interpolate(f, [bf(78.4), FILM4_FRAMES - 1], [1, 0], { ...CL, easing: (t) => 1 - (1 - t) * (1 - t) })}
      />
      {SFX.map((x, i) => (
        <Sequence key={i} from={bf(x.bar)} durationInFrames={60} layout="none">
          <Audio src={staticFile(`sfx/${x.id}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
      {bar < 77.6 ? <World s={s} /> : null}
      <QuestionDim />

      {/* ---------- the question ---------- */}
      <At x={120} y={130}>
        <Line at={0} out={2.05} size={84} parts={["深圳的摩天楼，"]} />
        <Line at={0.45} out={2.05} size={84} parts={[{ t: "全世界最多。", c: G }]} />
      </At>
      <Note at={0.6} out={2.05}>200 米以上的楼：200 栋，世界城市第一 · CTBUH 2026-10</Note>

      <At x={120} y={760}>
        <Line at={2.2} out={4.3} size={76} parts={["可写字楼里，"]} />
        <Line at={2.6} out={4.3} size={76} parts={[{ t: "约四分之一", c: G }, "，是空的。"]} />
      </At>
      <Note at={2.6} out={4.3}>2026 年三季度空置率 23.6%–28.7%：高力、仲量联行、戴德梁行、第一太平戴维斯</Note>

      <At x={960} y={120} align="center">
        <Line at={4.3} out={5.4} size={76} parts={["新楼，还在一栋接一栋地", { t: "盖", c: G }, "。"]} />
      </At>
      <Note at={4.4} out={5.4}>南山后海 · 2024–2025 年深圳又建成 37 栋 200 米以上的楼（CTBUH）</Note>

      <At x={960} y={390} align="center" gap={6}>
        <Line at={5.45} out={6.3} size={104} serif weight={700} stagger={1} parts={["空着这么多，"]} />
        <Line at={5.65} out={6.3} size={104} serif weight={700} stagger={1} parts={["为什么", { t: "还要盖", c: G }, "？"]} />
      </At>

      {/* ---------- one tower ---------- */}
      <At x={120} y={140}>
        <Line at={6.4} out={8.2} size={66} parts={["答案，藏在一栋楼的账本里。"]} />
      </At>
      <Pin cam={cam} at={7.2} out={10.2} x={-128} y={-766} h={218} lift={50} text="深圳能源大厦" sub="北塔 218 米 · 南塔 111 米" color={K.fg} size={36} />
      <At x={120} y={140}>
        <Line at={8.5} out={10.2} size={60} parts={["它在", { t: "福田中心区", c: O }, "，深圳的 CBD。"]} />
      </At>
      <Pin cam={cam} at={8.6} out={10.2} x={PLACES.lianhua.x} y={PLACES.lianhua.y} text="莲花山" size={26} lift={40} />
      <Pin cam={cam} at={8.7} out={10.2} x={PLACES.civic.x} y={PLACES.civic.y} text="市民中心" size={26} lift={40} />
      <Pin cam={cam} at={8.8} out={10.2} x={PLACES.expo.x} y={PLACES.expo.y} text="会展中心" size={26} lift={40} side="left" />
      <Pin cam={cam} at={8.9} out={10.2} x={PLACES.pingan.x} y={PLACES.pingan.y} h={0} text="平安金融中心" size={26} lift={40} side="left" />

      {/* ---------- 2008: the plot ---------- */}
      <At x={120} y={140}>
        <Line at={10.6} out={12.4} size={66} parts={[{ t: "2008", c: O }, " 年，这里还是一块空地。"]} />
        <Line at={11.2} out={12.4} size={48} weight={700} parts={[{ t: "6,427 平方米", c: O }, "，比一个足球场还小。"]} />
      </At>
      <Pin cam={cam} at={11.0} out={12.4} x={PARCEL.x} y={PARCEL.y} h={2} text="6,427 ㎡" color={O} size={34} lift={110} />
      <Pin cam={cam} at={11.3} out={12.4} x={PARCEL.x + 120} y={PARCEL.y + 10} h={2} text="标准足球场" sub="7,140 ㎡" color="#9fe3b0" size={28} lift={80} />

      <At x={120} y={140}>
        <Line at={12.5} out={14.4} size={60} parts={["规划允许在这块地上，"]} />
        <Line at={12.9} out={14.4} size={60} parts={["盖 ", { t: "9.6 万平方米", c: O }, "：约是地块的 15 倍。"]} />
      </At>
      <Pin cam={cam} at={13.6} out={14.4} x={PARCEL.x} y={PARCEL.y} h={134} text="× 15" color={O} size={54} lift={30} dot={false} />

      <At x={120} y={140}>
        <Line at={14.6} out={16.4} size={66} parts={["深圳能源花 ", { t: "6.7 亿元", c: O }, "，"]} />
        <Line at={15.0} out={16.4} size={66} parts={["买下这块地 ", { t: "50 年", c: O }, "的使用权。"]} />
      </At>
      <LeaseBar />
      <Note at={14.8} out={16.4}>深圳能源公告 2008-04-25：宗地 B119-0053，2008 年 4 月 23 日竞得</Note>

      {/* ---------- ten years ---------- */}
      <At x={120} y={140}>
        <Line at={16.6} out={19.0} size={60} weight={700} parts={["设计、审批、施工……"]} />
        <Line at={17.4} out={19.0} size={80} parts={["盖了", { t: "整整十年", c: O }, "。"]} />
      </At>
      <Note at={16.8} out={19.0}>2009 年国际设计竞赛，丹麦 BIG 事务所中标；2018 年交付 · 楼层逐年长高为示意</Note>
      <YearCounter />
      <At x={120} y={140}>
        <Line at={19.05} out={20.3} size={70} parts={["加上地，一共约 ", { t: "29 亿元", c: O }, "。"]} />
      </At>
      <Note at={19.1} out={20.3}>预算 29.36 亿元，含地价 6.7 亿 · 深圳能源年报</Note>

      {/* ---------- after it was built ---------- */}
      <At x={120} y={140}>
        <Line at={21.0} out={24.4} size={70} parts={["它盖的那十年，"]} />
        <Line at={21.4} out={24.4} size={70} parts={[{ t: "全城都在盖", c: G }, "。"]} />
      </At>
      <SkylineCount />
      <Note at={21.2} out={24.4}>CTBUH：深圳已建成的高楼，按竣工年份 · 全城视角下楼高放大 2 倍</Note>

      <At x={120} y={140}>
        <Line at={24.7} out={27.3} size={66} parts={["楼多了，人没跟上。"]} />
        <Line at={25.5} out={27.3} size={54} weight={700} parts={["最空的南山后海，", { t: "三间空一间", c: R }, "。"]} />
      </At>
      {DISTRICTS.map((d, i) => (
        <Pin key={d.name} cam={cam} at={24.9 + i * 0.12} out={27.3} x={d.x} y={d.y} h={d.vac * 45} lift={18} dot={false} text={`${d.vac.toFixed(1)}%`} sub={d.name} size={d.name === "后海" ? 34 : 26} color={d.vac > 30 ? R : K.fg} />
      ))}
      <Note at={24.9} out={27.3}>莱坊 2026 年二季度，各片区甲级写字楼空置率</Note>

      <At x={960} y={330} align="center">
        <Line at={27.5} out={30.3} size={66} parts={["房租，跟着跌了一半。"]} />
      </At>
      <Rent />
      <Note at={27.6} out={30.3}>戴德梁行，全市甲级写字楼平均租金：2018 年 276.6 元/㎡/月 → 2026 年三季度 142.2 元</Note>

      <At x={120} y={140}>
        <Line at={30.7} out={33.3} size={60} parts={["它的南塔，拿出 10 层出租："]} />
        <Line at={31.2} out={33.3} size={60} parts={["2023 年续租，租金", { t: "不升反降", c: R }, "。"]} />
      </At>
      <OwnRent />
      <Note at={30.8} out={33.3}>深圳能源关联交易公告 2018-10、2023-06 · 南塔 10–19 层</Note>

      {/* ---------- the account ---------- */}
      <At x={960} y={150} align="center">
        <Line at={34.1} out={38.0} size={66} parts={["那么，假如整栋都出租，"]} />
        <Line at={34.5} out={38.0} size={66} parts={["多少年能收回 ", { t: "29 亿", c: O }, "？"]} />
      </At>
      <At x={960} y={150} align="center">
        <Line at={38.2} out={42.1} size={66} parts={["可这块地的使用权，", { t: "只有 50 年", c: "#a9c1e0" }, "。"]} />
        <Line at={40.2} out={42.1} size={66} parts={["盖好那天，", { t: "只剩 40 年", c: "#a9c1e0" }, "。"]} />
      </At>
      <Note at={38.4} out={42.1}>非住宅用地到期不会自动续期，要重新申请、再交出让金 · 《民法典》第三百五十九条</Note>
      <At x={960} y={190} align="center">
        <Line at={42.6} out={45.95} size={84} serif weight={700} parts={["按今天的租金呢？"]} />
      </At>
      <At x={960} y={130} align="center" gap={4}>
        <Line at={46.0} out={50.3} size={120} weight={900} parts={[{ t: "33 到 41 年", c: R }]} />
        <Line at={46.9} out={50.3} size={56} parts={["回本，要用掉这块地", { t: "几乎全部的使用年限", c: G }, "。"]} />
      </At>
      <Account />
      <Note at={46.2} out={50.3}>估算：整栋按市场租金出租、租金不涨，扣除房产税、运营和大修；33 年按福田 CBD 168 元/㎡、出租率 82%，41 年按全市 140 元、75%</Note>

      {/* ---------- what they are after ---------- */}
      <At x={120} y={140}>
        <Line at={50.5} out={53.4} size={62} parts={["所以，盖它的人，本来就不靠收租。"]} />
        <Line at={51.4} out={53.4} size={62} parts={["它要的，是", { t: "自己的总部", c: O }, "。"]} />
      </At>
      <Pin cam={cam} at={51.6} out={53.4} x={-128} y={-766} h={190} lift={60} text="北塔 29–41 层：自己用" color={O} size={32} side="right" />
      <Note at={50.7} out={53.4}>深圳能源 2010 年公告："公司自成立以来，一直没有一栋自己的办公大楼"；2008 年买地条件：建成后 60% 以上自用</Note>

      <At x={120} y={140}>
        <Line at={53.5} out={55.8} size={56} parts={["不只它：2025 年深圳新盖好的写字楼，"]} />
        <Line at={53.9} out={55.8} size={56} parts={[{ t: "一半以上", c: O }, "是企业给自己盖的总部。"]} />
      </At>
      {HQ.map((h, i) => (
        <Pin key={h.label} cam={cam} at={54.2 + i * 0.15} out={55.8} x={h.x} y={h.y} h={i === 3 ? 600 : 300} lift={40} text={h.label} size={24} color={O} />
      ))}
      <Note at={53.6} out={55.8}>仲量联行 2026-01-20 · 地图上的总部为举例</Note>

      <At x={120} y={140}>
        <Line at={55.9} out={58.6} size={60} parts={["为什么不租，要自己盖？"]} />
        <Line at={56.7} out={58.6} size={54} weight={700} parts={["同一条街道，总部用地的价钱，", { t: "只有住宅的十分之一", c: O }, "。"]} />
      </At>
      <Pin cam={cam} at={56.6} out={58.6} x={PLACES.yuehai.x - 260} y={PLACES.yuehai.y + 120} h={10.86 * 90} lift={20} dot={false} text="10.86 万" sub="住宅地 · 每平方米" color={R} size={34} />
      <Pin cam={cam} at={57.3} out={58.6} x={PLACES.yuehai.x + 120} y={PLACES.yuehai.y - 40} h={1.11 * 90} lift={20} dot={false} text="1.11 万" sub="总部地 · 每平方米" color={O} size={34} />
      <Note at={56.0} out={58.6}>南山粤海街道：住宅地 2026-06（第一财经）；总部地 K602-0016，2025（澎湃新闻），楼面价为估算</Note>

      <At x={120} y={140}>
        <Line at={58.7} out={60.3} size={56} parts={["条件是：5 年在深圳交够 ", { t: "15 亿元税", c: G }, "，"]} />
        <Line at={59.1} out={60.3} size={56} parts={["楼不准卖。"]} />
      </At>
      <Deal />
      <Note at={58.8} out={60.3}>例：K602-0016，2025 年由字节跳动旗下公司竞得；出让公告原文为"形成地方财力不低于 15 亿元"</Note>

      <At x={960} y={170} align="center">
        <Line at={60.35} out={62.4} size={76} serif weight={700} parts={["城市卖的不是地，是", { t: "以后的税", c: G }, "。"]} />
        <Line at={61.2} out={62.4} size={52} weight={700} parts={["这些税，会变成路、地铁和学校。"]} />
      </At>

      {/* ---------- 升华 ---------- */}
      <At x={120} y={250}>
        <Line at={62.7} out={66.4} size={52} weight={700} parts={["福田区，一年交税过亿元的写字楼"]} />
      </At>
      <TaxCount />
      <Note at={62.8} out={66.4}>福田区政府工作报告 2012；《福田概况》2026 · 按楼里企业交的税计 · 亮起的楼为示意</Note>
      <At x={960} y={150} align="center">
        <Line at={66.8} out={70.5} size={68} parts={["你每天走进去的那栋楼，"]} />
        <Line at={67.7} out={70.5} size={68} parts={["是一座城市", { t: "十年前下的注", c: G }, "。"]} />
      </At>
      <At x={960} y={170} align="center" gap={18}>
        <Line at={71.3} out={74.4} size={64} weight={700} parts={["空着的那些，还在等。"]} />
        <Line at={72.5} out={74.4} size={96} serif weight={700} parts={["它赌的，是", { t: "你会来", c: G }, "。"]} />
      </At>

      <Sources at={74.4} out={77.0} />
      <BrandMark o={interpolate(frame, [bf(76.7), bf(77.0)], [1, 0], CL)} />
      <Vignette />
      <Grain />
      <EndCard at={76.9} />
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [FILM4_FRAMES - 24, FILM4_FRAMES - 1], [0, 1], CL), pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};

export const HERO_XY = HERO;
