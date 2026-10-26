// 《高层住宅，几十年后会变成贫民窟吗？》v7: fifty years in the first five seconds, then one 33-floor tower cut
// open — the everyday costs, and the three ledgers (money, rules, people) that decide how it ages (SCRIPT.md).
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { K } from "../theme";
import { FILM_FRAMES, FPS, ramp, sf as b } from "../timing";
import { World } from "../world/World";
import { Abroad, AgeCounter, Births, Budget, Chapter, CostMeter, ExodusGrid, FloorPlan, FloorsCounter, HookYear, LiftCount, NoiseRings, PassLegend, PhotoStage, PriceCompare, RushCounter, Tally, YouRing } from "./overlays";
import { NOISE_SRC, REWIND, worldAt, YOU, yf } from "./state";
import { At, BrandMark, EndCard, Line, Note, Pin, Sources } from "./ui";

const G = K.gold;
const L = K.lit;
const S = 72;
const S2 = 60;
const Q = 112;

const SFX: { id: string; t: number; vol: number }[] = [
  ...Array.from({ length: 16 }, (_, i) => ({ id: "sfx-mechanical-14", t: 0.15 + i * 0.32 * (1 - i * 0.025), vol: 0.13 })),
  { id: "sfx-scifi-17", t: b(2.1), vol: 0.3 },
  { id: "sfx-transition-07", t: REWIND[0] - 0.3, vol: 0.38 },
  { id: "sfx-transition-19", t: b(10.5), vol: 0.22 },
  { id: "sfx-transition-16", t: b(16.2), vol: 0.32 },
  ...Array.from({ length: 6 }, (_, i) => ({ id: "sfx-mechanical-16", t: b(24.4) + i * 0.6, vol: 0.2 })),
  { id: "sfx-foley-02", t: b(28.2), vol: 0.25 },
  { id: "sfx-mechanical-18", t: b(31.8), vol: 0.25 },
  { id: "sfx-mechanical-18", t: b(33.4), vol: 0.22 },
  { id: "sfx-impact-08", t: b(35.6), vol: 0.3 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-mechanical-14", t: b(39.4) + i * 0.5, vol: 0.1 })),
  { id: "sfx-transition-05", t: b(44.6), vol: 0.25 },
  { id: "sfx-impact-20", t: b(48.4), vol: 0.35 },
  ...Array.from({ length: 12 }, (_, i) => ({ id: "sfx-impact-03", t: b(54) + i * 0.24, vol: 0.1 + (i % 4) * 0.02 })),
  { id: "sfx-water-10", t: b(57.5), vol: 0.25 },
  { id: "sfx-water-10", t: b(59.8), vol: 0.3 },
  { id: "sfx-impact-20", t: b(64.3), vol: 0.35 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-ui-13", t: b(66.4) + i * 0.42, vol: 0.1 })),
  { id: "sfx-notification-18", t: b(68.8), vol: 0.22 },
  { id: "sfx-scifi-17", t: b(73), vol: 0.3 },
  { id: "sfx-foley-02", t: b(76.9), vol: 0.22 },
  { id: "sfx-impact-20", t: b(80.4), vol: 0.35 },
  { id: "sfx-transition-16", t: b(80.7), vol: 0.22 },
  { id: "sfx-impact-19", t: b(119.5), vol: 0.3 },
];

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = worldAt(t);
  const cam = s.cam;
  const musicVol = (f: number) => {
    const tt = f / FPS;
    return 0.92 * interpolate(tt, [b(122), FILM_FRAMES / FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };
  return (
    <AbsoluteFill style={{ background: "#040508", overflow: "hidden" }}>
      <Audio src={staticFile("music.wav")} volume={musicVol} />
      {SFX.map((x, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(x.t * FPS))} durationInFrames={90} layout="none">
          <Audio src={staticFile(`sfx/${x.id}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
      <World s={s} />
      <PhotoStage w={900} src="photos/meifoo-2021.jpg" at={b(100.2)} out={b(103.8)} zoom={[1.0, 1.08]} focus={[52, 62]} caption="美孚新邨，香港荔枝角，2021 年" credit="照片：Wpcpey · CC BY 4.0" />

      {/* ---------- hook: fifty years in five seconds ---------- */}
      <HookYear at={0} out={REWIND[1] + 0.2} />
      <At x={110} y={110}>
        <Line at={0.25} out={b(2.5)} size={96} serif weight={900} stagger={0.03} parts={["这栋楼，"]} />
        <Line at={0.55} out={b(2.5)} size={96} serif weight={900} stagger={0.03} parts={[{ t: "50 年", c: G }, "后会怎样？"]} />
      </At>
      <Note at={0.3} out={b(4.3)}>示意：一栋普通的 33 层住宅</Note>
      <At x={110} y={110}>
        <Line at={b(2.6)} out={b(4.3)} size={88} serif weight={700} parts={["有人说：会变成", { t: "贫民窟", c: K.red }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(4.6)} out={b(6.3)} size={S} parts={["中国约有 ", { t: "102 万栋", c: G }, "高层住宅。"]} />
      </At>
      <Note at={b(4.6)} out={b(6.3)}>约 102.3 万栋，截至 2023 年底（中国消防协会科普教育工作委员会委员许传升，据《中国新闻周刊》）</Note>
      <At x={960} y={420} align="center">
        <Line at={b(6.4)} out={b(8.4)} size={Q} serif weight={700} parts={["会吗？"]} />
        <Line at={b(6.9)} out={b(8.4)} size={56} parts={["先看懂一栋高楼。"]} />
      </At>

      {/* ---------- one tower ---------- */}
      <At x={110} y={110}>
        <Line at={b(8.6)} out={b(9.9)} size={S} parts={[{ t: "33", c: L }, " 层，", { t: "128", c: L }, " 户，三百多人。"]} />
      </At>
      <Note at={b(8.6)} out={b(9.9)}>示意：首层大堂，32 层住人，一层 4 户；每户按 2.62 人（第七次全国人口普查）估算</Note>
      <At x={110} y={110}>
        <Line at={b(10)} out={b(12)} size={S} parts={["为什么盖这么高？"]} />
        <Line at={b(10.5)} out={b(12)} size={S2} parts={["地贵：同一块地，盖得越高，能卖的房子越多。"]} />
      </At>
      <FloorsCounter at={b(10.3)} out={b(12)} from={b(10.6)} to={b(11.9)} />
      <At x={110} y={110}>
        <Line at={b(12.1)} out={b(14.1)} size={S} parts={["可住宅过了 ", { t: "100 米", c: K.red }, "，"]} />
        <Line at={b(12.5)} out={b(14.1)} size={S2} parts={["就要加避难层，造价跳一截。"]} />
      </At>
      <Pin cam={cam} at={b(12.3)} out={b(14.2)} p={[0, 100, -60]} lift={0} dot={false} side="right" dx={10} text="100 米" color={K.fg} size={40} />
      <Note at={b(12.1)} out={b(14.1)}>《建筑设计防火规范》GB 50016：建筑高度大于 100 米的住宅建筑应设置避难层</Note>
      <At x={110} y={110}>
        <Line at={b(14.2)} out={b(16)} size={S} parts={["于是全国长出了一片片 ", { t: "33 层", c: L }, "："]} />
        <Line at={b(14.7)} out={b(16)} size={S2} parts={["差一点，就到 100 米。"]} />
      </At>

      {/* ---------- cut open: living together ---------- */}
      <At x={960} y={96} align="center">
        <Line at={b(16.6)} out={b(19)} size={Q} serif weight={700} parts={["剖开看，它是一座", { t: "竖起来的村子", c: L }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(19.1)} out={b(22)} size={S2} parts={[{ t: "128", c: L }, " 户，合用两部电梯、一套水泵、"]} />
        <Line at={b(19.6)} out={b(22)} size={S2} parts={["一根根管道、一个屋顶。"]} />
      </At>
      <Pin cam={cam} at={b(19.4)} out={b(22)} p={[0, 66, 5]} lift={30} dx={120} side="right" text="两部电梯" color={K.lit} size={36} />
      <At x={960} y={96} align="center">
        <Line at={b(22.1)} out={b(24)} size={Q} serif weight={700} parts={["住在一起，天天有代价。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(24.3)} out={b(28.1)} size={S} parts={["一户装修，"]} />
        <Line at={b(24.9)} out={b(28.1)} size={S} parts={[{ t: "三百多人", c: K.red }, "一起听。"]} />
      </At>
      <NoiseRings cam={cam} at={b(24.3)} out={b(28)} i={NOISE_SRC} />
      <At x={110} y={110}>
        <Line at={b(28.2)} out={b(31.4)} size={S} parts={["买 100 平方米，"]} />
        <Line at={b(28.7)} out={b(31.4)} size={S} parts={["到手往往", { t: "七十几平", c: G }, "。"]} />
      </At>
      <FloorPlan at={b(28.2)} out={b(31.4)} />
      <Note at={b(28.6)} out={b(31.4)}>中国新闻网 2022-08：深圳 40 层以上在售新房得房率普遍 71%–75%；多层、小高层一般在 80% 以上</Note>
      <At x={110} y={110}>
        <Line at={b(31.6)} out={b(35)} size={S} parts={["早高峰，", { t: "2 部电梯", c: L }, "。"]} />
        <Line at={b(32.3)} out={b(35)} size={S2} parts={["住得越高，等得越久。"]} />
      </At>
      <RushCounter at={b(31.6)} out={b(35)} />
      <Note at={b(31.8)} out={b(35)}>128 户 × 2.62 人，估算</Note>
      <At x={110} y={110}>
        <Line at={b(35.6)} out={b(38.6)} size={S} parts={["大多数城市的云梯，只够到 ", { t: "50 米", c: K.red }, "左右。"]} />
        <Line at={b(36.4)} out={b(38.6)} size={S2} parts={["再往上，着火只能靠楼里自己的消防。"]} />
      </At>
      <Pin cam={cam} at={b(35.8)} out={b(38.6)} p={[45, 50, 40]} lift={0} dot={false} side="right" dx={12} text="50 米" color={K.red} size={42} />
      <Note at={b(35.6)} out={b(38.6)}>第一财经：云梯有高度限制，通常在 50 米左右</Note>

      {/* ---------- fifteen years: the machine ---------- */}
      <At x={110} y={110}>
        <Line at={b(39.2)} out={b(44.6)} size={88} serif weight={700} parts={["这台", { t: "机器", c: K.cyan }, "，用到十五年，"]} />
        <Line at={b(40)} out={b(44.6)} size={88} serif weight={700} parts={["开始", { t: "一起老", c: K.amber }, "。"]} />
      </At>
      <At x={110} y={850}>
        <Line at={b(41.2)} out={b(44.6)} size={S2} parts={["电梯、水泵、管道、外墙、防水……"]} />
      </At>
      <Pin cam={cam} at={b(39.6)} out={b(44.4)} p={[-16, 3, -2]} lift={60} dx={-70} side="left" text="水泵" color={K.water} size={36} />
      <Pin cam={cam} at={b(40.2)} out={b(44.4)} p={[-14, 104, -2]} lift={40} dx={-70} side="left" text="楼顶水箱" color={K.water} size={36} />
      <Note at={b(41.2)} out={b(44.6)}>住房城乡建设部、财政部 2015 年通知：运行超过 15 年的老旧电梯，可以使用维修资金更新改造</Note>
      <At x={110} y={110}>
        <Line at={b(44.8)} out={b(47.7)} size={S} parts={["全国的电梯，四台里有三台，"]} />
        <Line at={b(45.3)} out={b(47.7)} size={S} parts={["是最近 12 年装的：它们会", { t: "一起变老", c: K.amber }, "。"]} />
      </At>
      <LiftCount at={b(44.8)} out={b(47.7)} run={[b(45), b(46.3)]} />
      <Note at={b(44.8)} out={b(47.7)}>市场监管总局：2025 年底 1231.59 万台；质检总局：2013 年底 300.93 万台</Note>
      <At x={960} y={110} align="center">
        <Line at={b(47.8)} out={b(49.3)} size={92} serif weight={700} parts={["它会怎样老去，看", { t: "三笔账", c: G }, "。"]} />
      </At>

      {/* ---------- ledger one: money ---------- */}
      <Chapter at={b(49.4)} out={b(50.6)} n="第一笔账" title="钱" />
      <At x={110} y={110}>
        <Line at={b(50.7)} out={b(53.5)} size={S} parts={["机器越老，", { t: "越费钱", c: K.red }, "。"]} />
      </At>
      <CostMeter at={b(50.7)} out={b(53.5)} />
      <Note at={b(50.8)} out={b(53.5)}>中国物业管理协会：房龄 5 年以下维护约占物业费 25%–35%，10–15 年约 45%–60%，15 年左右约 70%–100%（据智谷趋势 2026-07 转引）</Note>
      <At x={110} y={110}>
        <Line at={b(53.7)} out={b(57.4)} size={S} parts={["日常开销，靠物业费。"]} />
        <Line at={b(54.3)} out={b(57.4)} size={S2} parts={["按每平米 1 元算，一栋楼一年约 15 万元。"]} />
      </At>
      <Budget at={b(54.6)} out={b(57.4)} />
      <Note at={b(53.7)} out={b(57.4)}>估算：128 户 × 100 平方米 × 1 元 × 12 个月；南方都市报 2025-04：20 年梯龄的高层电梯年均维保约 3 万元</Note>
      <At x={110} y={110}>
        <Line at={b(57.5)} out={b(61)} size={S} parts={["大修，靠买房时交的", { t: "维修资金", c: G }, "。"]} />
        <Line at={b(58.1)} out={b(61)} size={S2} parts={["一栋楼约 150 万元；"]} />
        <Line at={b(58.8)} out={b(61)} size={S2} parts={["换一部 30 层的电梯，连拆带装就要几十万。"]} />
      </At>
      <Pin cam={cam} at={b(58)} out={b(61)} p={[8.5, 18, 34]} lift={40} dx={80} side="right" text="维修资金" color={G} size={38} />
      <Note at={b(57.5)} out={b(61)}>估算：128 户 × 100 平方米 × 120 元（南京高层首期标准，宁房物字〔2017〕159 号）；南方都市报 2025-04：30 层电梯安装约 10–30 万元，梯价另计</Note>
      <At x={110} y={110}>
        <Line at={b(61.2)} out={b(64.1)} size={S} parts={["同一部电梯，在哪换都差不多贵。"]} />
        <Line at={b(61.9)} out={b(64.1)} size={S} parts={["可房子越便宜，这笔钱就越", { t: "扎眼", c: K.red }, "。"]} />
      </At>
      <PriceCompare at={b(61.2)} out={b(64.1)} />
      <Note at={b(61.2)} out={b(64.1)}>中指研究院：2025 年 12 月百城二手住宅均价 13,016 元/平方米；深圳样本均价 64,314 元/平方米</Note>

      {/* ---------- ledger two: rules ---------- */}
      <Chapter at={b(64.3)} out={b(65.5)} n="第二笔账" title="规矩" />
      <At x={110} y={110}>
        <Line at={b(65.6)} out={b(69.4)} size={S} parts={["钱，要 128 户", { t: "一起", c: G }, "出。"]} />
        <Line at={b(66.2)} out={b(69.4)} size={S2} parts={["再凑钱，要四分之三的人点头。"]} />
      </At>
      <Pin cam={cam} at={b(65.8)} out={b(68.4)} p={[-16.9, yf(1), 7]} lift={10} dx={-80} side="left" dot={false} text="2 楼：“我走楼梯。”" color={K.red} size={34} />
      <Pin cam={cam} at={b(66.3)} out={b(68.4)} p={[16.9, yf(4), 7]} lift={10} dx={80} side="right" dot={false} text="5 楼：“房子又不是我的。”" color="#cfe0ff" size={34} />
      <Pin cam={cam} at={b(66.8)} out={b(68.4)} p={[-16.9, yf(8), 7]} lift={10} dx={-80} side="left" dot={false} text="9 楼：“今年没了工作。”" color={K.amber} size={34} />
      <Tally at={b(66.4)} out={b(69.4)} />
      <Note at={b(65.6)} out={b(69.4)}>《民法典》第 278 条：筹集维修资金、改建重建须经参与表决的业主面积、人数双四分之三以上同意 · 住户理由为示意</Note>
      <At x={110} y={110}>
        <Line at={b(69.6)} out={b(72.6)} size={S} parts={["收不上钱，物业就", { t: "撤", c: K.red }, "。"]} />
        <Line at={b(70.2)} out={b(72.6)} size={S2} parts={["新楼也一样。"]} />
      </At>
      <ExodusGrid at={b(69.6)} out={b(72.6)} />
      <Note at={b(69.6)} out={b(72.6)}>中指研究院《2026 中国物业服务百强企业研究报告》（据第一财经 2026-04-28）：2025 年初至 2026 年 3 月底，监测到住宅物业撤场 212 个，楼龄 5 年以内的次新房占 35%</Note>
      <At x={110} y={110}>
        <Line at={b(72.8)} out={b(76.4)} size={S2} parts={["柳州一个小区，电梯全停。"]} />
        <Line at={b(73.4)} out={b(76.4)} size={S2} parts={["11 楼一位要透析的老人，"]} />
        <Line at={b(74)} out={b(76.4)} size={S2} parts={["家里花 ", { t: "3000 元", c: G }, "买了爬楼轮椅。"]} />
      </At>
      <Pin cam={cam} at={b(73.2)} out={b(76.3)} p={[6.6, yf(10), 7]} lift={50} dx={90} side="right" text="11 楼" color={G} size={40} />
      <Note at={b(72.8)} out={b(76.4)}>南方周末（据智谷趋势 2026-07 转引）：柳州东悦佳苑，物业费每平方米 0.8 元收不齐，18–24 层楼的电梯全部关停</Note>
      <At x={960} y={130} align="center">
        <Line at={b(76.8)} out={b(80.2)} size={80} serif weight={700} parts={["高楼活得好的地方，", { t: "修楼不全靠自觉", c: G }, "。"]} />
      </At>
      <Abroad at={b(77.2)} out={b(80.2)} />
      <Note at={b(77.2)} out={b(80.2)}>新加坡建屋发展局：组屋电梯翻新计划须四分之三合资格住户同意，政府承担大部分费用 · 香港屋宇署：强制验楼计划 · 美国佛罗里达州法规 §718.116：业主协会可就欠缴的管理费申请留置权并强制拍卖</Note>

      {/* ---------- ledger three: people ---------- */}
      <Chapter at={b(80.4)} out={b(81.6)} n="第三笔账" title="人" />
      <At x={110} y={110}>
        <Line at={b(81.7)} out={b(84.6)} size={S} parts={["先走的，是", { t: "走得起", c: L }, "的人。"]} />
        <Line at={b(82.3)} out={b(84.6)} size={S2} parts={["房子租出去，再隔成群租……"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(84.7)} out={b(88)} size={S2} parts={["一路往下传。留下的，"]} />
        <Line at={b(85.3)} out={b(88)} size={S} parts={["是最", { t: "付不起维修费", c: K.red }, "的人。"]} />
      </At>
      <PassLegend at={b(81.6)} out={b(88)} />
      <At x={110} y={110}>
        <Line at={b(88.2)} out={b(92)} size={S} parts={["楼里的人，也在和楼", { t: "一起老", c: K.amber }, "。"]} />
        <Line at={b(88.9)} out={b(92)} size={S2} parts={["第一次买房，平均 29.5 岁；楼 40 岁那年，他们快 70 了。"]} />
      </At>
      <AgeCounter at={b(88.2)} out={b(92)} run={[b(88.6), b(91.2)]} />
      <Note at={b(88.2)} out={b(92)}>贝壳研究院 2018 年全国购房调查：购房者平均年龄 29.5 岁</Note>
      <At x={110} y={110}>
        <Line at={b(92.2)} out={b(96)} size={S} parts={["接下一棒的人呢？"]} />
        <Line at={b(92.7)} out={b(96)} size={S2} parts={["1990 年前后，每年出生约 2400 万人；"]} />
        <Line at={b(93.4)} out={b(96)} size={S2} parts={["2025 年，", { t: "792 万", c: K.red }, "。"]} />
      </At>
      <Births at={b(92.2)} out={b(96)} />
      <Note at={b(92.2)} out={b(96)}>《中国统计年鉴》：1990 年出生率 21.06‰（约 11.4 亿人，推算约 2400 万）；国家统计局：2025 年出生 792 万</Note>

      {/* ---------- the answer ---------- */}
      <At x={960} y={130} align="center">
        <Line at={b(96.4)} out={b(100)} size={Q} serif weight={700} parts={["所以，会变成贫民窟吗？"]} />
        <Line at={b(97.6)} out={b(100)} size={S} parts={["不看楼有多高，看这", { t: "三笔账", c: G }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(100.2)} out={b(104)} size={S} parts={["钱够、规矩硬、人还在："]} />
        <Line at={b(100.8)} out={b(104)} size={S2} parts={["香港美孚新邨，快 60 年，仍是抢手货。"]} />
      </At>
      <Note at={b(100.2)} out={b(104)}>美孚新邨：1968–1978 年入伙，99 座；2025 年 9 月二手平均呎价 10,177 港元（星岛头条）</Note>
      <At x={960} y={110} align="center">
        <Line at={b(104.2)} out={b(110)} size={92} serif weight={700} parts={["三笔账都不够的地方，"]} />
        <Line at={b(105.2)} out={b(110)} size={92} serif weight={700} parts={["它会", { t: "一层一层暗下去", c: K.grey }, "。"]} />
      </At>

      {/* ---------- lift ---------- */}
      <At x={960} y={150} align="center" gap={6}>
        <Line at={b(110.4)} out={b(116.6)} size={116} serif weight={900} stagger={0.07} parts={["盖一栋楼，三年。"]} />
        <Line at={b(112.2)} out={b(116.6)} size={116} serif weight={900} stagger={0.07} parts={["养一栋楼，", { t: "五十年", c: G }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(117)} out={b(121)} size={84} serif weight={900} parts={["人会走，楼走不了。"]} />
      </At>
      <At x={110} y={850}>
        <Line at={b(118.2)} out={b(121)} size={88} serif weight={900} parts={["你，就是其中", { t: "一户", c: G }, "。"]} />
      </At>
      <YouRing cam={cam} at={b(118.6)} out={b(121)} i={YOU} />

      <Sources at={b(121)} out={b(122.4)} />
      <EndCard at={b(122.3)} />
      <BrandMark o={1 - ramp(t, b(122.1), b(122.4))} />
    </AbsoluteFill>
  );
};
