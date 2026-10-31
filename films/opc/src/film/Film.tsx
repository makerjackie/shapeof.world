// 《一人公司（OPC）的形状》: one continuous world, a night market where every stall is a one-person business, with a
// beam of light over each stall as tall as its year's revenue. From a registration on one laptop out to a sea of
// lamps, down to the 煎饼 cart (the old shape: a ceiling and a floor), through the new shape, and on to morning.
// Script: SCRIPT.md (v7). Music: the original score of 《独立开发者的形状》, re-arranged (music/score.js). Every time is
// a film bar on the music grid: S(bar) seconds. Type sits where the picture leaves room, never in one fixed corner.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { FONT, K } from "../theme";
import { b as S, clamp01, EO } from "../timing";
import { toScreen } from "../world/camera";
import { PILLAR_BASE } from "../world/engine";
import { BULB, HERO, stallWorld as sw } from "../world/market";
import { World } from "../world/World";
import { DotRow, Notif, OnScreen, RegScreen, RegularsScreen, StatCard, TVInsert } from "./props";
import { CEIL, LEVEL_100K, LEVEL_10K, LEVEL_1M } from "./shape";
import { CART, ROW, SCREEN_END, STAR0, worldAt } from "./state";
import { At, BrandMark, EndCard, fmt, Line, Note, Pin, Scrim, SHADOW, Sources, useT } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const G = K.gold;

const JOBS: [string, string, number, number][] = [
  ["写代码", "AI 写代码", HERO.company.x - 7, 11.2],
  ["做设计", "AI 出图", HERO.company.x, 11.2],
  ["客服", "AI 客服", HERO.company.x + 7, 11.2],
  ["记账", "记账软件", HERO.company.x - 7, 5.6],
  ["投广告", "投放平台", HERO.company.x, 5.6],
  ["管机房", "云服务", HERO.company.x + 7, 5.6],
];

// the count of the 61: 34 over bars 78–79.2, then on to 61 over 79.5–80.5
const C0 = S(78);
const C1 = S(79.2);
const C2 = S(79.5);
const C3 = S(80.5);

export const Film: React.FC = () => {
  const t = useT();
  const w = worldAt(t);
  const cam = w.cam;
  const blur = Math.max(interpolate(t, [S(5.9), S(6.2), S(7.7), S(8.0)], [0, 3, 3, 0], CL), interpolate(t, [S(68.3), S(68.8), S(72.6), S(73.1)], [0, 6, 6, 0], CL));
  const front = HERO.company.z + HERO.company.d / 2 + 0.05;
  const count = t < C0 ? 0 : t < C1 ? Math.round(34 * clamp01((t - C0) / (C1 - C0))) : t < C2 ? 34 : Math.round(34 + 27 * clamp01((t - C2) / (C3 - C2)));

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <World s={w} blur={blur} />

      {/* ---------- 0. the opening ---------- */}
      <OnScreen cam={cam} o={t < S(4) ? 1 : 0}>
        <RegScreen t0={0} />
      </OnScreen>
      <Scrim at={S(1.75)} out={S(3.4)} kind="bl" k={0.8} />
      <At x={140} y={660}>
        <Line at={S(1.8)} out={S(3.35)} size={60} weight={700} parts={["2025 年，中国新开了"]} />
        <Line at={S(2.0)} out={S(3.35)} size={124} parts={[{ t: "731.5 万家", c: G }, "一人公司"]} />
        <Line at={S(2.6)} out={S(3.35)} size={60} weight={700} parts={["比前一年，多了 ", { t: "42%", c: G }]} />
      </At>
      <Note at={S(1.9)} out={S(3.35)}>经济日报 2026-10-29 援引的最新数据：2025 年全国新设"一人公司"（只有一个股东的公司）731.5 万户，同比增长 42.3%</Note>
      <Scrim at={S(3.45)} out={S(6.0)} kind="c" k={0.55} />
      <At x={960} y={390} align="center" gap={6}>
        <Line at={S(3.5)} out={S(6.0)} size={76} weight={700} parts={["一个人开公司，"]} />
        <Line at={S(3.85)} out={S(6.0)} size={120} parts={["到底能不能", { t: "赚钱", c: G }, "？"]} />
      </At>

      {/* ---------- 1. title ---------- */}
      <At x={960} y={400} align="center" gap={10}>
        <Line at={S(6.05)} out={S(8.0)} size={124} serif weight={800} stagger={0.02} parts={["一人公司（OPC）的形状"]} />
        <Line at={S(6.45)} out={S(8.0)} size={34} weight={600} color={K.sub} parts={["OPC：One Person Company，一个人开的公司"]} />
      </At>

      {/* ---------- 2. the old shape: the 煎饼 cart ---------- */}
      <Scrim at={S(8.05)} out={S(10.3)} kind="bl" k={0.6} />
      <At x={130} y={700}>
        <Line at={S(8.1)} out={S(10.25)} size={64} weight={700} parts={["一个人做生意，"]} />
        <Line at={S(8.45)} out={S(10.25)} size={96} parts={["一点也不新"]} />
      </At>
      <Pin cam={cam} at={S(9.0)} out={S(11.1)} p={sw(CART, 0.55, 0.62, 0.44)} lift={120} dx={-160} side="left" text="一辆车" />
      <Pin cam={cam} at={S(9.3)} out={S(11.1)} p={sw(CART, -0.46, 1.05, 0.04)} lift={60} dx={-220} side="left" text="一口锅" />
      <Pin cam={cam} at={S(9.6)} out={S(11.1)} p={sw(CART, 0.2, 0.02, 2.6)} lift={70} dx={200} side="right" text="一条街" />
      <Notif cam={cam} at={S(10.05)} out={S(11.0)} p={sw(CART, 0.84, 1.5, 0.45)} text="收款到账" sub="7 元" lift={40} />

      <Scrim at={S(11.0)} out={S(13.0)} kind="r" k={0.62} />
      <At x={1800} y={300} align="right" gap={18}>
        <Line at={S(11.05)} out={S(12.95)} size={52} weight={700} color={K.sub} parts={["大多数生意，本来就是一个人在干："]} />
        <Line at={S(11.4)} out={S(12.95)} size={56} weight={700} parts={["中国：每 3 个经营主体，", { t: "2 个是个体户", c: G }]} />
        <Line at={S(11.75)} out={S(12.95)} size={56} weight={700} parts={["美国：每 5 家企业，", { t: "4 家只有老板自己", c: G }]} />
        <Line at={S(12.1)} out={S(12.95)} size={56} weight={700} parts={["英国：每 4 家，", { t: "3 家只有老板自己", c: G }]} />
      </At>
      <Note at={S(11.2)} out={S(12.95)}>市场监管总局：个体工商户 1.25 亿户，占经营主体 66.9%（2024 年 6 月）· 美国人口普查局：有雇员的企业占 21.6%（2023）· 英国商业贸易部：没有雇员的企业占私营企业 75%（2025）</Note>
      <Scrim at={S(13.0)} out={S(14.55)} kind="b" k={0.62} />
      <At x={960} y={760} align="center" gap={6}>
        <Line at={S(13.05)} out={S(14.5)} size={58} weight={700} parts={["以前，这叫个体户，守着一条街；"]} />
        <Line at={S(13.5)} out={S(14.5)} size={58} weight={700} parts={["现在，很多人带一台电脑，去网上开", { t: "一人公司", c: G }]} />
      </At>

      <Scrim at={S(14.6)} out={S(19.3)} kind="r" k={0.55} />
      <At x={1800} y={250} align="right" gap={14}>
        <Line at={S(14.65)} out={S(17.05)} size={62} parts={["一个人的生意，有两道天花板："]} />
        <Line at={S(15.1)} out={S(17.05)} size={52} weight={700} parts={[{ t: "手", c: G }, "：活多了，一个人干不完——一口锅，一次只能摊一张"]} />
        <Line at={S(15.8)} out={S(17.05)} size={52} weight={700} parts={[{ t: "街", c: G }, "：来买的，只有路过这条街的人"]} />
      </At>
      <Pin cam={cam} at={S(15.5)} out={S(16.9)} p={[CART.x + 1.5, PILLAR_BASE + CEIL, CART.z + 0.5]} lift={50} dx={-120} side="left" text="天花板" color="#ffd9b8" size={40} dot={false} />
      <At x={1800} y={250} align="right" gap={14}>
        <Line at={S(17.1)} out={S(19.25)} size={62} parts={["也有", { t: "地板", c: K.screen }, "："]} />
        <Line at={S(17.5)} out={S(19.25)} size={52} weight={700} parts={["街坊天天路过，总要吃早饭"]} />
      </At>
      <Notif cam={cam} at={S(17.7)} out={S(18.8)} p={sw(CART, 0.84, 1.5, 0.45)} text="老顾客" sub="又来了" gold lift={40} />
      <Scrim at={S(19.3)} out={S(21.9)} kind="b" k={0.62} />
      <At x={960} y={740} align="center" gap={8}>
        <Line at={S(19.35)} out={S(21.85)} size={56} weight={700} parts={["以前，一个人的生意，大多是这个形状："]} />
        <Line at={S(19.8)} out={S(21.85)} size={64} parts={["高的，高不过", { t: "天花板", c: "#ffd9b8" }, "；低的，有", { t: "街坊", c: K.screen }, "兜着"]} />
      </At>
      <Tag at={S(19.4)} out={S(21.85)} x={1780} y={980} text="示意" />

      {/* ---------- 3. now: both ceilings come down ---------- */}
      <Scrim at={S(22.0)} out={S(23.0)} kind="c" k={0.5} />
      <At x={960} y={440} align="center">
        <Line at={S(22.05)} out={S(22.95)} size={76} parts={["这两道天花板，这些年都被拆了"]} />
      </At>
      <Kicker at={S(23.0)} out={S(29.5)} text="第一道：手" />
      <Scrim at={S(23.0)} out={S(29.5)} kind="bl" k={0.62} />
      <At x={120} y={690} gap={8}>
        <Line at={S(23.05)} out={S(24.4)} size={64} weight={700} parts={["以前，一个人干不完的活，得雇人干："]} />
        <Line at={S(23.4)} out={S(24.4)} size={72} parts={["一家公司要很多人"]} />
        <Line at={S(24.45)} out={S(25.95)} size={60} weight={700} parts={["每样活都去外面临时找人、谈价，太麻烦，"]} />
        <Line at={S(24.85)} out={S(25.95)} size={60} weight={700} parts={["不如雇进来"]} />
        <Line at={S(26.0)} out={S(28.55)} size={60} weight={700} parts={["现在，很多活", { t: "按月租个 AI、按次买个服务", c: K.screen }, "就行"]} />
        <Line at={S(28.6)} out={S(29.45)} size={76} parts={["一家公司要的人，越来越少"]} />
      </At>
      <Note at={S(24.6)} out={S(25.95)}>科斯《企业的性质》（1937）：企业之所以存在，是因为每样活都去市场上找人做，要花找人、谈价、监督的成本</Note>
      {JOBS.map(([a, z, x, y], i) => {
        const flip = interpolate(t, [S(26.0 + i * 0.22), S(26.2 + i * 0.22)], [0, 1], CL);
        return (
          <Pin
            key={i}
            cam={cam}
            at={S(23.4 + i * 0.14)}
            out={S(27.8)}
            p={[x, y, front]}
            lift={34}
            dot={false}
            text={<span style={{ color: flip > 0.5 ? K.screen : K.fg, display: "inline-block", transform: `scaleY(${Math.abs(1 - 2 * flip)})` }}>{flip > 0.5 ? z : a}</span>}
            size={40}
          />
        );
      })}
      <Kicker at={S(29.6)} out={S(32.0)} text="第二道：街" />
      <At x={960} y={400} align="center">
        <Line at={S(30.2)} out={S(31.95)} size={72} weight={700} parts={["网上，一个人"]} />
        <Line at={S(30.55)} out={S(31.95)} size={110} parts={["能卖给", { t: "全世界", c: G }]} />
      </At>

      <Scrim at={S(32.0)} out={S(37.4)} kind="tc" k={0.55} />
      <At x={960} y={110} align="center" gap={4}>
        <Line at={S(32.05)} out={S(37.35)} size={64} weight={700} parts={["于是，一个人的公司，"]} />
        <Line at={S(32.4)} out={S(37.35)} size={100} parts={["从没", { t: "这么多", c: G }, "过"]} />
      </At>
      <Scrim at={S(33.0)} out={S(37.4)} kind="b" k={0.55} />
      <StatCard at={S(33.2)} out={S(37.35)} x={110} y={600} tag="中国" main={<>一年新开一人公司<br /><span style={{ color: G }}>731.5 万家</span></>} sub="2025 年，比前一年多 42%" />
      <StatCard at={S(34.3)} out={S(37.35)} x={680} y={600} tag="美国" main={<>开公司的申请<br /><span style={{ color: G }}>350 万 → 567 万</span></>} sub="2019 → 2025 年；其中七成，看样子是一个人干" />
      <StatCard at={S(35.4)} out={S(37.35)} x={1250} y={600} tag="Stripe（网上收款公司）" main={<>帮人注册的新公司<br /><span style={{ color: G }}>63%</span> 只有一个创始人</>} sub="2026 年第二季度，历史最高" />
      <Note at={S(33.4)} out={S(37.35)}>经济日报 2026-10-29 · 美国人口普查局《商业设立统计》（年度申请数为月度加总；"一个人干"指统计局判断雇人可能性不高的申请，占 69.9%）· Stripe 博客 2026-05-28（Stripe Atlas）</Note>

      {/* ---------- 4. can it make money ---------- */}
      <Scrim at={S(38.0)} out={S(40.0)} kind="c" k={0.4} />
      <At x={960} y={400} align="center" gap={6}>
        <Line at={S(38.1)} out={S(39.95)} size={84} weight={700} parts={[{ t: "天花板", c: "#ffd9b8" }, "没了，"]} />
        <Line at={S(38.65)} out={S(39.95)} size={112} parts={[{ t: "地板", c: K.screen }, "也没了"]} />
      </At>
      <Scrim at={S(40.05)} out={S(43.0)} kind="tc" k={0.55} />
      <At x={960} y={110} align="center">
        <Line at={S(40.1)} out={S(41.6)} size={68} parts={["开的人从没这么多。那，到底能挣多少？"]} />
      </At>
      <Scrim at={S(41.4)} out={S(43.3)} kind="l" k={0.6} />
      <At x={120} y={360} gap={8}>
        <Line at={S(41.45)} out={S(43.25)} size={50} weight={700} color={K.sub} parts={["中国还没有一本公开的全账；"]} />
        <Line at={S(41.75)} out={S(43.25)} size={56} weight={700} parts={["全世界最全的一本，在美国税务局："]} />
        <Line at={S(42.1)} out={S(43.25)} size={92} parts={[{ t: "3,113 万", c: G }, "份个人生意的报税表"]} />
      </At>
      <Note at={S(41.6)} out={S(43.25)}>美国国税局 SOI：2023 纳税年度非农个人独资经营（Schedule C）报税表 31,125,909 份；有的雇了人，大多数没有</Note>
      <Legend at={S(41.6)} out={S(52.4)} />
      {/* the levels */}
      <LevelPin cam={cam} at={S(43.5)} out={S(46.6)} y={PILLAR_BASE + LEVEL_10K} x={-2} z={12} text="一年收入 1 万美元" sub="约 6.7 万元" />
      <Scrim at={S(43.6)} out={S(52.0)} kind="bl" k={0.62} />
      <At x={130} y={760} gap={6}>
        <Line at={S(43.7)} out={S(46.55)} size={66} parts={["一年收入不到 1 万美元的：", { t: "一半", c: G }]} />
        <Line at={S(46.95)} out={S(49.75)} size={66} parts={["过 10 万美元的：", { t: "每 10 家，1 家", c: G }]} />
        <Line at={S(50.4)} out={S(51.95)} size={66} parts={["过 100 万美元的：", { t: "大约每 160 家，1 家", c: G }]} />
      </At>
      <LevelPin cam={cam} at={S(46.9)} out={S(49.9)} y={PILLAR_BASE + LEVEL_100K} x={-6} z={18} text="10 万美元" sub="约 67 万元" />
      <LevelPin cam={cam} at={S(50.3)} out={S(52.0)} y={PILLAR_BASE + LEVEL_1M} x={-40} z={40} text="100 万美元" sub="约 670 万元" />
      <Note at={S(43.8)} out={S(51.95)}>美国国税局 SOI，2020 纳税年度个人独资经营按营业收入分组：2,835 万份里 1,427 万份不到 1 万美元，279 万份过 10 万美元，17 万份过 100 万美元 · 光柱高度按 1 米 = 5,000 美元画</Note>
      <At x={130} y={660} gap={6}>
        <Line at={S(52.25)} out={S(54.5)} size={56} weight={700} parts={["这还只是收入。扣掉成本，算净赚："]} />
        <Line at={S(52.6)} out={S(54.5)} size={84} parts={["每 10 家，", { t: "3 家没赚到钱", c: K.red }]} />
        <Line at={S(53.3)} out={S(54.5)} size={50} weight={700} color={K.sub} parts={["赚到钱的，平均一年净赚 2.5 万美元："]} />
        <Line at={S(53.6)} out={S(54.5)} size={50} weight={700} color={K.sub} parts={["不到美国全职上班的人收入中位数的一半"]} />
      </At>
      <Note at={S(52.4)} out={S(54.5)}>美国国税局 SOI，2023 纳税年度：有净利润的 21,411,462 份（68.8%），平均约 24,800 美元 · 美国劳工统计局：2025 年全职雇员周薪中位数 1,204 美元（一年约 6.3 万美元）</Note>
      <Scrim at={S(54.6)} out={S(56.6)} kind="tc" k={0.6} />
      <At x={960} y={110} align="center" gap={8}>
        <Line at={S(54.65)} out={S(56.55)} size={56} weight={700} parts={["而且越分越薄：18 年里，美国的个人生意多了 ", { t: "45%", c: G }, "；"]} />
        <Line at={S(55.2)} out={S(56.55)} size={62} parts={["平均每家净赚的钱，扣掉物价，", { t: "少了近四成", c: K.red }]} />
      </At>
      <Note at={S(54.8)} out={S(56.55)}>美国国税局 SOI：2005 纳税年度 2,147 万份、平均净利润（含亏损）12,573 美元；2023 年 3,113 万份、12,119 美元；美国消费者物价同期涨 56%</Note>
      <Scrim at={S(56.6)} out={S(58.45)} kind="r" k={0.62} />
      <At x={1800} y={330} align="right" gap={10}>
        <Line at={S(56.65)} out={S(58.4)} size={56} weight={700} parts={["中国街边的小店（北大的跟踪调查）："]} />
        <Line at={S(57.0)} out={S(58.4)} size={76} parts={["每 10 家，", { t: "2 家亏钱", c: K.red }, "，"]} />
        <Line at={S(57.35)} out={S(58.4)} size={76} parts={[{ t: "2 家勉强打平", c: "#c6ccd4" }]} />
      </At>
      <Note at={S(56.8)} out={S(58.4)}>北京大学光华管理学院等《中国小微经营者调查》2024 年三季度，7,502 份有效问卷：净利润率为负 20.7%，勉强盈亏平衡 20.9%（多是面向周边居民的小店）</Note>
      <Scrim at={S(58.5)} out={S(60.95)} kind="tc" k={0.6} />
      <At x={960} y={100} align="center" gap={6}>
        <Line at={S(58.55)} out={S(60.9)} size={60} weight={700} parts={["网上新开的，差距更大："]} />
        <Line at={S(58.9)} out={S(60.9)} size={52} weight={700} color={K.sub} parts={["新上线的收费 App，两年里——"]} />
        <Line at={S(59.3)} out={S(60.9)} size={66} parts={[{ t: "83%", c: K.red }, " 月收入没到过 1,000 美元；到过 1 万美元的：", { t: "4.6%", c: G }]} />
      </At>
      <Note at={S(58.7)} out={S(60.9)}>RevenueCat《State of Subscription Apps 2026》：新上线的订阅 App，两年内月收入到过 1,000 美元的 17%，到过 1 万美元的 4.6%</Note>
      <Scrim at={S(61.0)} out={S(63.95)} kind="c" k={0.55} />
      <At x={960} y={320} align="center" gap={10}>
        <Line at={S(61.05)} out={S(63.9)} size={58} weight={700} parts={["所以，一个人开公司，能赚钱吗？"]} />
        <Line at={S(61.7)} out={S(63.9)} size={70} parts={["能。可近三成连本都没赚回来，大多数", { t: "只够糊口", c: K.screen }, "；"]} />
        <Line at={S(62.4)} out={S(63.9)} size={84} parts={["挣大钱的，", { t: "不到百分之一", c: G }]} />
      </At>

      {/* ---------- 5. why this shape ---------- */}
      <Scrim at={S(64.0)} out={S(65.0)} kind="c" k={0.5} />
      <At x={960} y={430} align="center">
        <Line at={S(64.05)} out={S(64.95)} size={96} parts={["为什么会是这个形状？"]} />
      </At>
      <Scrim at={S(65.0)} out={S(68.35)} kind="bl" k={0.6} />
      <At x={130} y={680} gap={8}>
        <Line at={S(65.05)} out={S(68.3)} size={66} color={G} parts={["先是，街的墙拆了："]} />
        <Line at={S(65.5)} out={S(68.3)} size={56} weight={700} parts={["你能卖给全世界的人，", { t: "全世界也能卖给你的街坊", c: G }]} />
        <Line at={S(66.6)} out={S(68.3)} size={56} weight={700} parts={["网上没有远近，大家都去挑最好、最有名的那几家"]} />
      </At>
      <TVInsert at={S(68.4)} tvAt={S(70.6)} out={S(73.0)} />
      <At x={960} y={110} align="center" gap={8}>
        <Line at={S(68.5)} out={S(69.6)} size={66} parts={["七十年前，电视台开起来时，这事就发生过一次"]} />
        <Line at={S(69.6)} out={S(70.65)} size={54} weight={700} parts={["电视来之前，演员的观众，就是剧场里那几百个座位"]} />
        <Line at={S(70.7)} out={S(72.95)} size={54} weight={700} parts={["电视来之后：最红的演员，", { t: "挣得更多了", c: G }, "；"]} />
        <Line at={S(71.5)} out={S(72.95)} size={54} weight={700} parts={["娱乐业的工作少了约 13%，", { t: "中间那批掉得最多", c: K.red }]} />
      </At>
      <Note at={S(70.8)} out={S(72.95)}>Felix Koenig，American Economic Review: Insights，2023：美国各地电视台开播后，演员里收入进入全美前 1% 的比例翻倍，娱乐业工作减少约 13%</Note>
      <Scrim at={S(73.1)} out={S(77.0)} kind="r" k={0.62} />
      <At x={1800} y={250} align="right" gap={10}>
        <Line at={S(73.15)} out={S(75.35)} size={66} color={G} parts={["再是，人手不缺了："]} />
        <Line at={S(73.6)} out={S(75.35)} size={56} weight={700} parts={["开公司越容易，摊位越多"]} />
        <Line at={S(75.4)} out={S(76.95)} size={52} weight={700} parts={["Stripe 上新开的一人公司，同样是开张头半年："]} />
        <Line at={S(75.75)} out={S(76.95)} size={56} weight={700} parts={["排在中间的那家，收入比一年前", { t: "少了 23%", c: K.red }, "；"]} />
        <Line at={S(76.1)} out={S(76.95)} size={56} weight={700} parts={["做得最好的 10%，", { t: "多了 19%", c: G }]} />
      </At>
      <Counter at={S(73.9)} out={S(75.35)} />
      <Note at={S(74.0)} out={S(75.35)}>RevenueCat：每月新上线的订阅收费 App，2022 年 1 月约 2,000 个，2026 年 1 月 14,700 多个（数据来自 Appfigures）</Note>
      <Note at={S(75.5)} out={S(76.95)}>Stripe 2026-05-28：Stripe Atlas 上的单人创始公司，2025 年开张头 6 个月的收入，中位数比前一年少 23%，前 10% 多 19%</Note>
      <Scrim at={S(77.0)} out={S(80.9)} kind="tl" k={0.6} />
      <At x={110} y={130} gap={4}>
        <Line at={S(77.05)} out={S(80.85)} size={58} weight={700} parts={["做得最好的 10%，"]} />
        <Line at={S(77.35)} out={S(80.85)} size={58} weight={700} parts={["收入是中间那家的几倍？"]} />
      </At>
      {(() => {
        // number the counted lamps, skipping labels that would crowd the one before (far down the row)
        let lastX = -1e9;
        let lastY = -1e9;
        return ROW.map((r, i) => {
          if (i >= count) return null;
          const bl = BULB[r.kind];
          const [x, y, z] = sw(r, bl[0], bl[1] + 0.55, bl[2]);
          const [sx, sy, ok] = toScreen(cam, x, y, z);
          if (!ok || sx < -40 || sx > 1960) return null;
          if (Math.hypot(sx - lastX, sy - lastY) < 30 && i !== count - 1) return null;
          lastX = sx;
          lastY = sy;
          const age = t - (i < 34 ? C0 + ((C1 - C0) * i) / 34 : C2 + ((C3 - C2) * (i - 34)) / 27);
          const k = interpolate(age, [0, 0.15], [0, 1], { ...CL, easing: EO });
          return (
            <div key={r.id} style={{ position: "absolute", left: sx, top: sy, transform: `translate(-50%,-100%) scale(${0.6 + 0.4 * k})`, opacity: k * (t > S(80.6) ? 1 - clamp01((t - S(80.6)) / 0.3) : 1), fontFamily: FONT, fontSize: 24, fontWeight: 800, color: "rgba(207,227,255,0.9)", textShadow: SHADOW }}>
              {i + 1}
            </div>
          );
        });
      })()}
      <Pin cam={cam} at={S(77.9)} out={S(80.8)} p={sw(STAR0, 0, 1.9, 0.12)} lift={110} text="前 10%" color={G} size={40} />
      <Big at={S(78.0)} out={S(80.85)} label={t < S(79.4) ? "四年前" : "去年"} value={count} />
      <Note at={S(78.0)} out={S(80.85)}>Stripe 2026-05-28：Stripe Atlas 上的单人创始公司，开张头 6 个月的收入，前 10% 是中位数（排在正中间那家）的 34 倍（四年前）、61 倍（2025 年）</Note>
      <Scrim at={S(81.0)} out={S(84.0)} kind="c" k={0.55} />
      <At x={960} y={360} align="center" gap={10}>
        <Line at={S(81.05)} out={S(83.95)} size={62} weight={700} parts={["街的墙拆了，人手也不缺了："]} />
        <Line at={S(81.6)} out={S(83.95)} size={84} parts={[{ t: "天花板越来越高", c: G }, "，"]} />
        <Line at={S(82.2)} out={S(83.95)} size={84} parts={[{ t: "地板越来越低", c: K.screen }]} />
      </At>

      {/* ---------- 6. the future ---------- */}
      <Scrim at={S(84.0)} out={S(85.35)} kind="c" k={0.5} />
      <At x={960} y={430} align="center">
        <Line at={S(84.05)} out={S(85.3)} size={84} parts={["那以后，一个人开公司，还值得吗？"]} />
      </At>
      <Scrim at={S(85.4)} out={S(88.0)} kind="bl" k={0.62} />
      <At x={130} y={640} gap={10}>
        <Line at={S(85.45)} out={S(87.95)} size={58} weight={700} parts={["当一份工作：大多数", { t: "挣得不如上班", c: K.screen }, "；"]} />
        <Line at={S(86.2)} out={S(87.95)} size={58} weight={700} parts={["当一次尝试：", { t: "从没这么便宜", c: G }]} />
        <Line at={S(86.7)} out={S(87.95)} size={46} weight={700} color={K.sub} parts={["很多活按月租个 AI，不少城市还送工位、送算力"]} />
      </At>
      <Note at={S(86.4)} out={S(87.95)}>工信部《人工智能中小企业创业支持计划（2026—2028 年）》2026-09 · 《成都市支持人工智能 OPC 创新发展若干措施（征求意见稿）》2026-03：工位免租、算力券每年最高 500 万元</Note>
      <Scrim at={S(88.0)} out={S(89.5)} kind="tc" k={0.55} />
      <At x={960} y={120} align="center">
        <Line at={S(88.05)} out={S(89.45)} size={72} parts={["照这几年的样子：摊位会更多，", { t: "差距会更大", c: G }]} />
      </At>
      <At x={960} y={120} align="center">
        <Line at={S(89.65)} out={S(91.9)} size={76} parts={["那些站到上面的，凭什么？"]} />
      </At>
      <Scrim at={S(92.0)} out={S(94.45)} kind="l" k={0.62} />
      <At x={120} y={400} gap={10}>
        <Line at={S(92.05)} out={S(94.4)} size={56} weight={700} parts={["既然大家都去挑最好的那几家，"]} />
        <Line at={S(92.6)} out={S(94.4)} size={66} parts={["就去做", { t: "一小群人眼里，最好的那一家", c: G }]} />
      </At>
      <Scrim at={S(94.5)} out={S(99.0)} kind="r" k={0.62} />
      <At x={1800} y={260} align="right" gap={10}>
        <Line at={S(94.55)} out={S(96.4)} size={56} weight={700} parts={["这群人可以很小，却散在全世界："]} />
        <Line at={S(95.0)} out={S(96.4)} size={60} parts={["Stripe 上做得最好的 10%，", { t: "一半的钱来自国外", c: G }]} />
        <Line at={S(95.5)} out={S(96.4)} size={60} parts={["中间那家：", { t: "2%", c: K.screen }]} />
      </At>
      <At x={1800} y={230} align="right">
        <Line at={S(96.5)} out={S(98.95)} size={60} weight={700} parts={["而且会", { t: "再来", c: G }, "："]} />
      </At>
      <DotRow at={S(96.8)} out={S(98.95)} x={860} y={360} lit={3} label="做得最好的：每 10 个新客人，下个月回来" value="3 个" />
      <DotRow at={S(97.5)} out={S(98.95)} x={860} y={540} lit={0.8} label="中间那家：" value="不到 1 个" color={K.screen} />
      <Note at={S(94.7)} out={S(98.95)}>Stripe 2026-05-28：前 10% 的单人公司，国际销售占收入 51%，中间水平 2%；第一个月的客户近 30% 下个月回来，中间水平 8%</Note>

      {/* ---------- 7. morning ---------- */}
      <Scrim at={S(100.1)} out={S(106.7)} kind="bl" k={0.62} />
      <At x={130} y={680} gap={10}>
        <Line at={S(100.2)} out={S(102.3)} size={60} weight={700} parts={["煎饼车最值钱的，从来不是那口锅：锅，谁都买得到"]} />
        <Line at={S(100.9)} out={S(102.3)} size={72} parts={["是认准了它的", { t: "街坊", c: G }]} />
        <Line at={S(102.4)} out={S(104.3)} size={64} parts={["今天，", { t: "AI", c: K.screen }, " 就是那口人人都租得到的锅"]} />
        <Line at={S(103.0)} out={S(104.3)} size={60} weight={700} parts={["它抄得走你做的东西，", { t: "抄不走认准你的人", c: G }]} />
        <Line at={S(104.4)} out={S(106.65)} size={64} weight={700} parts={["以前，地板是那条街白送的；"]} />
        <Line at={S(105.0)} out={S(106.65)} size={76} parts={["现在，得自己", { t: "一块块铺", c: G }]} />
      </At>
      <Notif cam={cam} at={S(101.3)} out={S(102.4)} p={sw(CART, 0.84, 1.5, 0.45)} text="老顾客" sub="早" gold lift={40} />
      <OnScreen cam={cam} scr={SCREEN_END} o={interpolate(t, [S(106.6), S(107.0)], [0, 1], CL)}>
        <RegularsScreen />
      </OnScreen>
      <Scrim at={S(107.9)} out={S(112.0)} kind="l" k={0.7} />
      <At x={110} y={400} gap={14}>
        <Line at={S(108.0)} out={S(111.95)} size={60} weight={700} parts={["当开一家公司，人人都做得到——"]} />
        <Line at={S(108.8)} out={S(111.95)} size={84} parts={["谁会", { t: "认准你", c: G }, "，再来找你？"]} />
      </At>

      {/* ---------- end ---------- */}
      <Sources at={S(112.0)} out={S(115.05)} />
      <BrandMark o={t < S(115) ? 1 : 0} />
      <EndCard at={S(115.0)} />
      <Audio src={staticFile("score.wav")} />
    </AbsoluteFill>
  );
};

// A chapter label: small, gold, top left, with a rule.
const Kicker: React.FC<{ at: number; out: number; text: string }> = ({ at, out, text }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.35], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 120, top: 120, opacity: o, fontFamily: FONT, display: "flex", alignItems: "center", gap: 18 }}>
      <div style={{ width: 48 * o, height: 4, background: G }} />
      <span style={{ fontSize: 40, fontWeight: 800, color: G, letterSpacing: 4, textShadow: SHADOW }}>{text}</span>
    </div>
  );
};

// A small boxed label (e.g. "示意").
const Tag: React.FC<{ at: number; out: number; x: number; y: number; text: string }> = ({ at, out, x, y, text }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.3], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-100%, -100%)", opacity: o * 0.8, fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.fg, padding: "4px 14px", border: "1.5px solid rgba(244,240,232,0.5)", borderRadius: 8 }}>{text}</div>
  );
};

// What the pillars mean, while they are measured.
const Legend: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.4], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 110, top: 110, opacity: o, fontFamily: FONT, display: "flex", alignItems: "center", gap: 16, padding: "14px 24px", background: "rgba(6,9,15,0.55)", borderRadius: 14, border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ width: 6, height: 48, borderRadius: 3, background: "linear-gradient(180deg,#fff2c8,#ffb24a)", boxShadow: "0 0 14px #ffc46b" }} />
      <div>
        <div style={{ fontSize: 30, fontWeight: 800, color: K.fg }}>光柱的高度 = 一年的收入</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: K.sub }}>收入，不是利润</div>
      </div>
    </div>
  );
};

// A label on a glass level: a short line at the sheet's edge, held in the 3D world.
const LevelPin: React.FC<{ cam: ReturnType<typeof worldAt>["cam"]; at: number; out: number; x: number; y: number; z: number; text: string; sub: string }> = ({ cam, at, out, x, y, z, text, sub }) => (
  <Pin cam={cam} at={at} out={out} p={[x, y, z]} lift={70} dx={-90} side="left" text={text} sub={sub} color="#dfe9ff" size={42} />
);

const Counter: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.3], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  const v = Math.round(2000 + 12700 * interpolate(t, [at + 0.3, at + 1.6], [0, 1], { ...CL, easing: EO }));
  return (
    <div style={{ position: "absolute", right: 120, top: 520, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 38, fontWeight: 700, color: K.sub }}>每月新上线的收费 App</div>
      <div style={{ fontSize: 116, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        <span style={{ fontSize: 68, color: K.sub }}>2,000 → </span>
        <span style={{ color: G }}>{fmt(v)}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 600, color: K.sub }}>2022 年 1 月 → 2026 年 1 月</div>
    </div>
  );
};

const Big: React.FC<{ at: number; out: number; label: string; value: number }> = ({ at, out, label, value }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.3], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", right: 120, top: 560, textAlign: "right", opacity: o, fontFamily: FONT, textShadow: SHADOW }}>
      <div style={{ fontSize: 46, fontWeight: 700, color: K.sub }}>{label}</div>
      <div style={{ fontSize: 210, fontWeight: 900, color: G, lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
        {value}
        <span style={{ fontSize: 90 }}> 倍</span>
      </div>
    </div>
  );
};
