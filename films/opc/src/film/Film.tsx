// 《一人公司（OPC）的形状》: one continuous world, a night market where every stall is a one-person company,
// from a single laptop screen out to a sea of lamps, and on to morning. Script: SCRIPT.md (v3). Music: the original
// score of 《独立开发者的形状》, re-arranged (music/score.js). Every time is a film bar on the music grid: S(bar) seconds.
import React from "react";
import { AbsoluteFill, Audio, interpolate, staticFile } from "remotion";
import { FONT, K } from "../theme";
import { b as S, clamp01, EO } from "../timing";
import { toScreen } from "../world/camera";
import { BULB, HERO, HERO_IDS, STALLS, STAR, stallWorld } from "../world/market";
import { World } from "../world/World";
import { Dashboard, DocCard, DotRow, Licence, Notif, OnScreen, PayScreen, TVInsert } from "./props";
import { ROW, SCREEN_END, worldAt } from "./state";
import { At, BrandMark, EndCard, fmt, Line, Note, Pin, Scrim, SHADOW, Sources, useT } from "./ui";

const CL = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const CART = STALLS[HERO_IDS.cart];
const STAR0 = STALLS[STAR];
const sw = stallWorld;
const G = K.gold;

const JOBS: [string, string, number, number][] = [
  ["写代码", "AI 写代码", HERO.company.x - 7, 11.2],
  ["做设计", "AI 出图", HERO.company.x, 11.2],
  ["客服", "AI 客服", HERO.company.x + 7, 11.2],
  ["记账", "记账软件", HERO.company.x - 7, 5.6],
  ["投广告", "投放平台", HERO.company.x, 5.6],
  ["管机房", "云服务", HERO.company.x + 7, 5.6],
];

// the count of the 61: 34 over bars 41–42.3, then on to 61 over 42.6–43.8
const C0 = S(41);
const C1 = S(42.3);
const C2 = S(42.6);
const C3 = S(43.8);

export const Film: React.FC = () => {
  const t = useT();
  const w = worldAt(t);
  const cam = w.cam;
  const blur = Math.max(interpolate(t, [S(5.85), S(6.2), S(7.8), S(8.05)], [0, 9, 9, 0], CL), interpolate(t, [S(50.0), S(50.5), S(54.6), S(55.1)], [0, 6, 6, 0], CL));
  const front = HERO.company.z + HERO.company.d / 2 + 0.05;
  const count = t < C0 ? 0 : t < C1 ? Math.round(34 * clamp01((t - C0) / (C1 - C0))) : t < C2 ? 34 : Math.round(34 + 27 * clamp01((t - C2) / (C3 - C2)));

  return (
    <AbsoluteFill style={{ background: K.bg }}>
      <World s={w} blur={blur} />

      {/* ---------- 1. the opening ---------- */}
      <OnScreen cam={cam} o={t < S(4) ? 1 : 0}>
        <Dashboard t0={0} />
      </OnScreen>
      <Scrim at={0} out={S(2.0)} kind="b" k={0.85} />
      <At x={150} y={720}>
        <Line at={0.05} out={S(2.05)} size={86} parts={["一个人起步的公司，"]} />
        <Line at={0.5} out={S(2.05)} size={86} parts={["半年，卖了 ", { t: "8000 万美元", c: G }]} />
      </At>
      <Note at={0.6} out={S(2.05)}>Base44：AI 建站工具，2025 年 6 月被建站公司 Wix 收购（约 5.4 亿元）· 卖掉时团队 8 人 · TechCrunch</Note>

      <Scrim at={S(3.2)} out={S(4.65)} kind="tl" k={0.7} />
      <At x={120} y={170}>
        <Line at={S(3.25)} out={S(4.65)} size={52} weight={700} parts={["可在网上晒出真实收入的 5,079 个小生意里，"]} />
        <Line at={S(3.6)} out={S(4.65)} size={88} parts={["一半，每月赚不到 ", { t: "1,100 块", c: G }]} />
      </At>
      <Note at={S(3.4)} out={S(4.65)}>Indie Hackers 分析 TrustMRR 上 5,079 个经 Stripe 核验收入的项目，月收入中位数 $169（按 1 美元约 6.72 元），2026 年 3 月</Note>

      <At x={960} y={420} align="center">
        <Line at={S(4.75)} out={S(6.0)} size={70} weight={700} parts={["都是一个人做的生意，"]} />
        <Line at={S(5.05)} out={S(6.0)} size={100} parts={["差距为什么这么大？"]} />
      </At>

      {/* ---------- 2. title ---------- */}
      <Licence at={S(6.0)} out={S(8.05)} />
      <At x={960} y={110} align="center" gap={6}>
        <Line at={S(6.0)} out={S(8.05)} size={112} serif weight={800} stagger={0.02} parts={["一人公司（OPC）的形状"]} />
        <Line at={S(6.35)} out={S(8.05)} size={32} weight={600} color={K.sub} parts={["OPC：One Person Company，一个人开的公司"]} />
      </At>

      {/* ---------- 3. the oldest one-person business ---------- */}
      <Scrim at={S(8.1)} out={S(14.95)} kind="bl" k={0.6} />
      <Scrim at={S(14.95)} out={S(16.3)} kind="tl" k={0.55} />
      <At x={120} y={720}>
        <Line at={S(8.15)} out={S(9.95)} size={66} weight={700} parts={["一个人做生意，"]} />
        <Line at={S(8.5)} out={S(9.95)} size={90} parts={["其实一点也不新"]} />
      </At>
      <Pin cam={cam} at={S(9.0)} out={S(11.1)} p={sw(CART, 0.55, 0.62, 0.44)} lift={120} dx={-160} side="left" text="一辆车" />
      <Pin cam={cam} at={S(9.3)} out={S(11.1)} p={sw(CART, -0.46, 1.05, 0.04)} lift={60} dx={-220} side="left" text="一口锅" />
      <Pin cam={cam} at={S(9.6)} out={S(11.1)} p={sw(CART, 0.84, 1.28, 0.45)} lift={150} dx={170} side="right" text="一张收款码" />
      <Notif cam={cam} at={S(10.05)} out={S(11.3)} p={sw(CART, 0.84, 1.5, 0.45)} text="收款到账" lift={40} />
      <At x={120} y={760}>
        <Line at={S(10.15)} out={S(12.0)} size={60} weight={700} parts={["全国 ", { t: "1.25 亿户", c: G }, "个体工商户，"]} />
        <Line at={S(10.5)} out={S(12.0)} size={60} weight={700} parts={["靠一个人或一家人撑着"]} />
      </At>
      <Note at={S(10.3)} out={S(12.0)}>市场监管总局：登记在册个体工商户 1.25 亿户，2024 年 6 月底</Note>
      <At x={120} y={640} gap={14}>
        <Line at={S(12.05)} out={S(14.95)} size={66} parts={["它有两道天花板："]} />
        <Line at={S(12.55)} out={S(14.95)} size={52} weight={700} parts={[{ t: "手", c: G }, "：一口锅，一次只能摊一张"]} />
        <Line at={S(13.75)} out={S(14.95)} size={52} weight={700} parts={[{ t: "街", c: G }, "：来买的，只有路过的人"]} />
      </At>
      <Pin cam={cam} at={S(12.6)} out={S(13.6)} p={sw(CART, -0.46, 1.05, 0.04)} lift={120} dx={-40} side="left" text="一次一张" color={G} size={34} />
      <At x={120} y={150} gap={10}>
        <Line at={S(15.0)} out={S(16.3)} size={62} weight={700} parts={["可街也护着它：附近的人，就买它的"]} />
        <Line at={S(15.4)} out={S(16.3)} size={62} weight={700} parts={["每天早上，都是那几张", { t: "熟面孔", c: G }]} />
      </At>
      <Notif cam={cam} at={S(15.25)} out={S(16.3)} p={sw(CART, 0.84, 1.5, 0.45)} text="老顾客" sub="又来了" gold lift={40} />

      {/* ---------- 4. the first ceiling: hands ---------- */}
      <Scrim at={S(16.6)} out={S(23.1)} kind="tl" k={0.6} />
      <At x={120} y={70}>
        <Line at={S(16.4)} out={S(23.1)} size={34} weight={700} color={G} parts={["第一道天花板：手"]} />
      </At>
      <At x={120} y={140}>
        <Line at={S(16.65)} out={S(18.35)} size={66} weight={700} parts={["一家公司要很多人，"]} />
        <Line at={S(17.0)} out={S(18.35)} size={88} parts={["是因为活多"]} />
      </At>
      {JOBS.map(([a, z, x, y], i) => {
        const flip = interpolate(t, [S(19.75 + i * 0.22), S(19.95 + i * 0.22)], [0, 1], CL);
        return (
          <Pin
            key={i}
            cam={cam}
            at={S(17.25 + i * 0.14)}
            out={S(21.65)}
            p={[x, y, front]}
            lift={34}
            dot={false}
            text={<span style={{ color: flip > 0.5 ? K.screen : K.fg, display: "inline-block", transform: `scaleY(${Math.abs(1 - 2 * flip)})` }}>{flip > 0.5 ? z : a}</span>}
            size={40}
          />
        );
      })}
      <At x={120} y={140}>
        <Line at={S(18.4)} out={S(19.7)} size={66} weight={700} parts={["以前，每样活都得雇人干"]} />
        <Line at={S(19.7)} out={S(21.4)} size={66} weight={700} parts={["现在，", { t: "按月租、按次买", c: K.screen }, "就行"]} />
        <Line at={S(21.65)} out={S(23.1)} size={80} parts={["一家公司要的人，越来越少"]} />
      </At>

      {/* more makers */}
      <At x={120} y={140}>
        <Line at={S(23.15)} out={S(25.1)} size={66} weight={700} parts={["于是，摆摊的人一下子多了"]} />
      </At>
      <Counter at={S(23.5)} out={S(25.1)} />
      <Note at={S(23.6)} out={S(25.1)}>RevenueCat：每月新上线的订阅收费 App，2022 年 1 月约 2,000 个，2026 年 1 月 14,700 多个（数据来自 Appfigures）</Note>

      {/* the burden stays with the one person */}
      <Scrim at={S(25.2)} out={S(30.0)} kind="tl" k={0.6} />
      <At x={110} y={140} gap={8}>
        <Line at={S(25.25)} out={S(26.6)} size={66} weight={700} parts={["活，可以交给 AI；"]} />
        <Line at={S(25.6)} out={S(26.6)} size={88} parts={["担子，", { t: "交不出去", c: G }]} />
        <Line at={S(26.6)} out={S(27.8)} size={62} weight={700} parts={["社保：公司那份、个人那份，都是你出"]} />
        <Line at={S(27.8)} out={S(29.95)} size={56} weight={700} parts={["开的要是一人有限公司，公司欠了债，"]} />
        <Line at={S(28.15)} out={S(29.95)} size={56} weight={700} parts={["你得自己证明：公司的钱和家里的钱，是分开的"]} />
        <Line at={S(28.9)} out={S(29.95)} size={72} parts={["证明不了，就要", { t: "一起还", c: K.red }]} />
      </At>
      <Note at={S(27.9)} out={S(29.95)}>《公司法》（2023 修订）第二十三条第三款：只有一个股东的公司，股东不能证明公司财产独立于自己的财产的，对公司债务承担连带责任</Note>

      {/* ---------- 5. the second ceiling: the street ---------- */}
      <At x={960} y={400} align="center">
        <Line at={S(30.05)} out={S(32.2)} size={36} weight={700} color={G} parts={["第二道天花板：街"]} />
        <Line at={S(30.25)} out={S(32.2)} size={70} weight={700} parts={["网上，一个人"]} />
        <Line at={S(30.6)} out={S(32.2)} size={104} parts={["也能卖给全世界的人"]} />
      </At>
      <Scrim at={S(32.35)} out={S(36.3)} kind="tl" k={0.55} />
      <At x={110} y={140}>
        <Line at={S(32.4)} out={S(36.25)} size={64} weight={700} parts={["各地开始给一人公司", { t: "送工位、送算力", c: G }]} />
      </At>
      <DocCard at={S(33.0)} out={S(36.25)} x={100} y={560} org="工信部" date="2026 年 9 月" quote={<>“鼓励各地对……‘一人公司’、超级个体等微型主体给予包容支持”</>} />
      <DocCard at={S(33.9)} out={S(36.25)} x={1060} y={300} org="广东省发改委" date="2026 年 3 月" quote="到 2028 年，建成 100 个人工智能 OPC 社区" />
      <DocCard at={S(34.8)} out={S(36.25)} x={1060} y={590} org="成都（征求意见稿）" date="2026 年 3 月" quote="工位免租 3 个月；算力券每年最高 500 万元" note="算力券：政府发券，帮你付 AI 的钱" />

      {/* ---------- 6. the turn ---------- */}
      <At x={120} y={160} gap={10}>
        <Line at={S(36.3)} out={S(37.45)} size={96} parts={["可网上，也没有街"]} />
        <Line at={S(37.35)} out={S(39.0)} size={64} weight={700} parts={["人人都能卖给所有人，"]} />
        <Line at={S(37.75)} out={S(39.0)} size={64} weight={700} parts={["所有人，也都挤在同一个网上抢客人"]} />
        <Line at={S(38.95)} out={S(40.1)} size={70} parts={["客人和钱，越来越往", { t: "最亮的几家", c: G }, "走"]} />
      </At>
      <Scrim at={S(40.0)} out={S(44.9)} kind="tl" k={0.6} />
      <At x={110} y={130} gap={4}>
        <Line at={S(40.05)} out={S(44.9)} size={58} weight={700} parts={["做得最好的那 10%，"]} />
        <Line at={S(40.35)} out={S(44.9)} size={58} weight={700} parts={["赚的是普通那家的几倍？"]} />
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
            <div key={r.id} style={{ position: "absolute", left: sx, top: sy, transform: `translate(-50%,-100%) scale(${0.6 + 0.4 * k})`, opacity: k * (t > S(44.6) ? 1 - clamp01((t - S(44.6)) / 0.3) : 1), fontFamily: FONT, fontSize: 24, fontWeight: 800, color: "rgba(207,227,255,0.9)", textShadow: SHADOW }}>
              {i + 1}
            </div>
          );
        });
      })()}
      <Pin cam={cam} at={S(40.9)} out={S(44.8)} p={sw(STAR0, 0, 1.9, 0.12)} lift={110} text="前 10%" color={G} size={40} />
      <Big at={S(41.0)} out={S(44.85)} label={t < S(42.5) ? "四年前" : "去年"} value={count} />
      <Note at={S(41.0)} out={S(44.85)}>Stripe：Stripe Atlas 上的单人创始公司，开张头 6 个月的收入，前 10% 是中位数（排在正中间那家）的 34 倍（四年前）、61 倍（2025 年）</Note>

      {/* ---------- 7. why ---------- */}
      <Scrim at={S(45.0)} out={S(50.0)} kind="tl" k={0.55} />
      <At x={120} y={150} gap={10}>
        <Line at={S(45.05)} out={S(45.9)} size={100} parts={["为什么？"]} />
        <Line at={S(45.65)} out={S(47.0)} size={60} weight={700} parts={["以前，客人只逛门口那条街，每家都分到一些"]} />
        <Line at={S(47.0)} out={S(48.3)} size={60} weight={700} parts={["网上没有远近，客人能在", { t: "所有店里挑", c: G }]} />
        <Line at={S(48.3)} out={S(49.95)} size={70} parts={["大家都去挑最好、最有名的那几家"]} />
      </At>
      <TVInsert at={S(50.0)} tvAt={S(52.7)} out={S(55.0)} />
      <At x={960} y={110} align="center" gap={8}>
        <Line at={S(50.1)} out={S(51.3)} size={70} parts={["这事，七十年前就发生过一次"]} />
        <Line at={S(51.25)} out={S(52.75)} size={54} weight={700} parts={["电视台开起来以前，演员的观众，就是剧场里那几百个座位"]} />
        <Line at={S(52.8)} out={S(54.95)} size={54} weight={700} parts={["电视台开起来以后："]} />
        <Line at={S(53.1)} out={S(54.95)} size={54} weight={700} parts={["最红的那批演员，", { t: "挣得更多了", c: G }]} />
        <Line at={S(53.85)} out={S(54.95)} size={54} weight={700} parts={["娱乐业的工作却少了约 13%，", { t: "中间那批掉得最多", c: K.red }]} />
      </At>
      <Note at={S(53.1)} out={S(54.95)}>Felix Koenig，American Economic Review: Insights，2023：电视台开播后，演员里收入进入全美前 1% 的比例翻倍，娱乐业工作减少约 13%</Note>
      <Scrim at={S(55.05)} out={S(58.0)} kind="tl" k={0.6} />
      <At x={120} y={150} gap={10}>
        <Line at={S(55.1)} out={S(57.95)} size={70} parts={["这几年，", { t: "AI", c: K.screen }, " 又加了一把火："]} />
        <Line at={S(55.6)} out={S(57.95)} size={58} weight={700} parts={["摊位多了好几倍，普通那家头半年的收入，", { t: "一年少了 23%", c: K.red }]} />
        <Line at={S(56.6)} out={S(57.95)} size={58} weight={700} parts={["前 10% 的，", { t: "反而多了 19%", c: G }]} />
      </At>
      <Note at={S(55.7)} out={S(57.95)}>Stripe 2026：Stripe Atlas 上的单人创始公司，2025 年开张头 6 个月的收入，中位数比上一年少 23%，前 10% 多 19%</Note>

      {/* ---------- 8. what the bright ones did ---------- */}
      <At x={960} y={150} align="center" gap={8}>
        <Line at={S(58.5)} out={S(59.8)} size={70} weight={700} parts={["街，原来替煎饼车做了两件事"]} />
        <Line at={S(59.75)} out={S(61.0)} size={70} weight={700} parts={["网上没有街，这两件事，", { t: "得自己做", c: G }]} />
      </At>
      <Scrim at={S(61.0)} out={S(73.1)} kind="tl" k={0.62} />
      <At x={110} y={130} gap={12}>
        <Line at={S(61.0)} out={S(66.95)} size={80} color={G} parts={["第一，让人找到你"]} />
        <Line at={S(61.8)} out={S(66.95)} size={52} weight={700} parts={["开头那家：创始人之前就在创业圈做了好几年"]} />
        <Line at={S(63.2)} out={S(66.95)} size={52} weight={700} parts={["那个建站工具，是他边做边在网上公开记录，"]} />
        <Line at={S(63.6)} out={S(66.95)} size={52} weight={700} parts={["靠", { t: "口口相传", c: G }, "传开的"]} />
      </At>
      <Note at={S(61.9)} out={S(66.95)}>TechCrunch 2025-06-18：Base44 主要靠创始人在 LinkedIn 和 X 上分享制作过程、口口相传扩散；他此前因创办 Explorium 在以色列创业圈已有名气</Note>
      <At x={110} y={130}>
        <Line at={S(67.1)} out={S(72.95)} size={80} color={G} parts={["第二，让来过的人再来"]} />
      </At>
      <DotRow at={S(67.9)} out={S(72.95)} x={110} y={290} lit={3} label="做得最好的：每 10 个新客人，下个月回来" value="3 个" />
      <DotRow at={S(69.2)} out={S(72.95)} x={110} y={480} lit={0.8} label="普通的：" value="不到 1 个" color={K.screen} />
      <At x={110} y={700}>
        <Line at={S(70.8)} out={S(72.95)} size={56} weight={700} parts={["到了第二年，这些老客人比刚来时", { t: "多花近一半", c: G }]} />
      </At>
      <Note at={S(68.0)} out={S(72.95)}>Stripe 2026：前 10% 的单人公司，第一个月的客户近 30% 下个月回来，中间水平的 8%；到第二年开头，这些客户比刚来时多花 47%</Note>
      <At x={960} y={400} align="center" gap={10}>
        <Line at={S(73.1)} out={S(75.1)} size={66} weight={700} parts={["工位和算力，城市可以帮你省"]} />
        <Line at={S(73.65)} out={S(75.1)} size={92} parts={["回头客，只能自己攒"]} />
      </At>

      {/* ---------- 9. morning ---------- */}
      <Scrim at={S(76.3)} out={S(82.8)} kind="tl" k={0.45} />
      <At x={120} y={150} gap={10}>
        <Line at={S(76.4)} out={S(78.6)} size={62} weight={700} parts={["这辆煎饼车最值钱的，"]} />
        <Line at={S(76.8)} out={S(78.6)} size={74} parts={["是每天早上都会来的那些人"]} />
        <Line at={S(78.65)} out={S(80.0)} size={74} parts={["网上，没有现成的街护着你"]} />
        <Line at={S(80.0)} out={S(82.75)} size={66} weight={700} parts={["AI 能替你干很多人的活；"]} />
        <Line at={S(80.5)} out={S(82.75)} size={66} weight={700} parts={["那条让人找到你、再回来找你的街，", { t: "得自己修", c: G }]} />
      </At>
      <Notif cam={cam} at={S(79.65)} out={S(81.0)} p={sw(CART, 0.84, 1.5, 0.45)} text="老顾客" sub="早" gold lift={40} />
      <OnScreen cam={cam} scr={SCREEN_END} o={interpolate(t, [S(82.6), S(83.1)], [0, 1], CL)}>
        <PayScreen />
      </OnScreen>
      <Scrim at={S(83.9)} out={S(86.3)} kind="l" k={0.7} />
      <At x={110} y={400} gap={14}>
        <Line at={S(84.1)} out={S(86.2)} size={60} weight={700} parts={["如果明天，你也开一家一人公司——"]} />
        <Line at={S(84.8)} out={S(86.2)} size={80} parts={["你的", { t: "第一个回头客", c: G }, "，会是谁？"]} />
      </At>

      {/* ---------- end ---------- */}
      <Sources at={S(86.1)} out={S(89.1)} />
      <BrandMark o={t < S(89) ? 1 : 0} />
      <EndCard at={S(89.0)} />
      <Audio src={staticFile("score.wav")} />
    </AbsoluteFill>
  );
};

const Counter: React.FC<{ at: number; out: number }> = ({ at, out }) => {
  const t = useT();
  const o = Math.min(interpolate(t, [at, at + 0.3], [0, 1], CL), interpolate(t, [out - 0.3, out], [1, 0], CL));
  if (o <= 0) return null;
  const v = Math.round(2000 + 12700 * interpolate(t, [at + 0.4, at + 2.0], [0, 1], { ...CL, easing: EO }));
  return (
    <div style={{ position: "absolute", right: 120, top: 640, textAlign: "right", opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 40, fontWeight: 700, color: K.sub }}>每月新上线的收费 App</div>
      <div style={{ fontSize: 120, fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
        <span style={{ fontSize: 70, color: K.sub }}>2,000 → </span>
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
