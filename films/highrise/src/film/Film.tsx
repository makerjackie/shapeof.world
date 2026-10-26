// 《高层住宅，几十年后会变成贫民窟吗？》v5: one city, one 33-floor tower cut open, the everyday costs of living
// stacked up, then the slow story of how it ages (SCRIPT.md). Timed in film bars on 《千年之后》.
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { K } from "../theme";
import { FILM_FRAMES, FPS, ramp, sf as b, win } from "../timing";
import { World } from "../world/World";
import { AgeCounter, Births, CostMeter, Fade, FloorPlan, FloorsCounter, LiftCount, NoiseRings, PassLegend, PhotoStage, RushCounter, Tally, Timeline, YearBadge, YouRing } from "./overlays";
import { NOISE_SRC, OLDIE, worldAt, YOU, yf } from "./state";
import { At, BrandMark, EndCard, Line, Note, Pin, Sources } from "./ui";

const G = K.gold;
const L = K.lit;
const S = 72; // statement
const S2 = 60; // second line
const Q = 112; // big serif line

const SFX: { id: string; t: number; vol: number }[] = [
  ...Array.from({ length: 8 }, (_, i) => ({ id: "sfx-mechanical-01", t: b(0.5) + i * 0.6, vol: 0.08 + (i % 3) * 0.03 })),
  { id: "sfx-transition-05", t: b(6.4), vol: 0.25 },
  { id: "sfx-transition-19", t: b(10.5), vol: 0.22 },
  { id: "sfx-transition-16", t: b(16.2), vol: 0.32 },
  ...Array.from({ length: 6 }, (_, i) => ({ id: "sfx-mechanical-16", t: b(24.4) + i * 0.65, vol: 0.2 })),
  { id: "sfx-foley-02", t: b(29), vol: 0.25 },
  { id: "sfx-mechanical-18", t: b(33), vol: 0.25 },
  { id: "sfx-mechanical-18", t: b(34.6), vol: 0.22 },
  { id: "sfx-impact-08", t: b(37.2), vol: 0.3 },
  ...Array.from({ length: 12 }, (_, i) => ({ id: "sfx-mechanical-14", t: b(41.6) + i * 0.5, vol: 0.1 })),
  { id: "sfx-transition-08", t: b(48.3), vol: 0.28 },
  { id: "sfx-transition-05", t: b(53.2), vol: 0.25 },
  ...Array.from({ length: 12 }, (_, i) => ({ id: "sfx-impact-03", t: b(60.4) + i * 0.22, vol: 0.1 + (i % 4) * 0.02 })),
  { id: "sfx-transition-16", t: b(64.2), vol: 0.28 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-ui-13", t: b(69) + i * 0.45, vol: 0.1 })),
  { id: "sfx-notification-18", t: b(71.6), vol: 0.22 },
  { id: "sfx-scifi-17", t: b(75.2), vol: 0.3 },
  { id: "sfx-foley-02", t: b(80.1), vol: 0.25 },
  { id: "sfx-impact-11", t: b(89.3), vol: 0.32 },
  { id: "sfx-transition-19", t: b(90.2), vol: 0.26 },
  { id: "sfx-transition-15", t: b(94.2), vol: 0.26 },
  { id: "sfx-impact-16", t: b(94.6), vol: 0.42 },
  { id: "sfx-transition-16", t: b(96.6), vol: 0.24 },
  { id: "sfx-impact-19", t: b(121.6), vol: 0.3 },
];

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = worldAt(t);
  const cam = s.cam;
  const offWorld = t > b(80.4) && t < b(87.8);
  const musicVol = (f: number) => {
    const tt = f / FPS;
    return 0.92 * interpolate(tt, [0, 0.4], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(tt, [b(122.3), FILM_FRAMES / FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };
  const dip = Math.max(win(t, b(80.1), b(80.7), 0.3), win(t, b(87.5), b(88.1), 0.3));
  return (
    <AbsoluteFill style={{ background: "#040508", overflow: "hidden" }}>
      <Audio src={staticFile("music.wav")} volume={musicVol} />
      {SFX.map((x, i) => (
        <Sequence key={i} from={Math.round(x.t * FPS)} durationInFrames={90} layout="none">
          <Audio src={staticFile(`sfx/${x.id}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
      {!offWorld ? <World s={s} /> : null}
      <PhotoStage src="photos/surfside-before.jpg" at={b(80.3)} out={b(85.9)} zoom={[1.02, 1.12]} focus={[45, 45]} caption="Champlain Towers South，美国佛罗里达" credit="照片：Mapillary 用户 · CC BY-SA 4.0" />
      <PhotoStage src="photos/surfside-rescue3.jpg" at={b(85.8)} out={b(87.9)} zoom={[1.0, 1.05]} focus={[50, 55]} caption="2021 年 6 月 24 日" credit="照片：Miami-Dade Fire Rescue · 公有领域" />
      <PhotoStage src="photos/meifoo-2021.jpg" at={b(110.2)} out={b(112.6)} zoom={[1.0, 1.08]} focus={[52, 62]} caption="美孚新邨，香港荔枝角，2021 年" credit="照片：Wpcpey · CC BY 4.0" />
      <Fade o={dip} />

      {/* ---------- hook ---------- */}
      <At x={110} y={110}>
        <Line at={b(0.5)} out={b(2.4)} size={92} serif weight={700} parts={["中国的城市，长成了这样。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(2.5)} out={b(4.4)} size={S} parts={["约 ", { t: "102 万栋", c: G }, "高层住宅。"]} />
        <Line at={b(3.1)} out={b(4.4)} size={S2} parts={["一栋，就是上百户人家。"]} />
      </At>
      <Note at={b(2.5)} out={b(4.4)}>约 102.3 万栋，截至 2023 年底（中国消防协会科普教育工作委员会委员许传升，据《中国新闻周刊》）</Note>
      <At x={960} y={420} align="center">
        <Line at={b(4.6)} out={b(6.3)} size={64} serif weight={600} color="rgba(244,240,232,0.85)" parts={["有人说：几十年后，它们会变成", { t: "贫民窟", c: K.red }, "。"]} />
      </At>
      <At x={960} y={420} align="center">
        <Line at={b(6.4)} out={b(8)} size={Q} serif weight={700} parts={["会吗？"]} />
        <Line at={b(6.9)} out={b(8)} size={56} parts={["先看懂一栋高楼。"]} />
      </At>

      {/* ---------- one tower ---------- */}
      <At x={110} y={110}>
        <Line at={b(8.1)} out={b(9.5)} size={S} parts={[{ t: "33", c: L }, " 层，", { t: "132", c: L }, " 户，约 ", { t: "350", c: L }, " 人。"]} />
      </At>
      <Note at={b(8.1)} out={b(9.5)}>示意：一栋普通的 33 层住宅，一层 4 户；每户按 2.62 人（第七次全国人口普查）估算</Note>
      <At x={110} y={110}>
        <Line at={b(9.6)} out={b(12)} size={S} parts={["为什么盖这么高？"]} />
        <Line at={b(10.4)} out={b(12)} size={S2} parts={["地贵：同一块地，盖得越高，能卖的房子越多。"]} />
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
      <Note at={b(14.2)} out={b(16)}>33 层 × 约 3 米层高 ≈ 99 米（估算）</Note>

      {/* ---------- cut open ---------- */}
      <At x={960} y={96} align="center">
        <Line at={b(16.6)} out={b(19)} size={Q} serif weight={700} parts={["剖开看，它是一座", { t: "竖起来的村子", c: L }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(19.1)} out={b(22)} size={S2} parts={[{ t: "132", c: L }, " 户，合用两部电梯、一套水泵、"]} />
        <Line at={b(19.6)} out={b(22)} size={S2} parts={["一根根管道、一个屋顶。"]} />
      </At>
      <Pin cam={cam} at={b(19.4)} out={b(22)} p={[0, 66, 5]} lift={30} dx={120} side="right" text="两部电梯" color={K.lit} size={36} />
      <At x={960} y={96} align="center">
        <Line at={b(22.1)} out={b(24)} size={Q} serif weight={700} parts={["住在一起，有代价。"]} />
      </At>

      {/* ---------- secondary costs ---------- */}
      <At x={110} y={110}>
        <Line at={b(24.3)} out={b(28.4)} size={S} parts={["一户装修，"]} />
        <Line at={b(24.9)} out={b(28.4)} size={S} parts={["楼上楼下一起", { t: "“装修”", c: K.red }, "。"]} />
      </At>
      <NoiseRings cam={cam} at={b(24.3)} out={b(28.3)} i={NOISE_SRC} />
      <At x={110} y={860}>
        <Line at={b(26.2)} out={b(28.4)} size={44} weight={700} parts={["楼板撞击声的国家标准：过去 ", { t: "75", c: L }, " 分贝，2025 年起收紧到 ", { t: "65", c: L }, " 分贝。"]} />
      </At>
      <Note at={b(26.2)} out={b(28.4)}>《民用建筑隔声设计规范》GB 50118-2010；《住宅项目规范》GB 55038-2025（2025-05-01 实施）</Note>

      <At x={110} y={110}>
        <Line at={b(28.6)} out={b(32.2)} size={S} parts={["买 100 平方米，"]} />
        <Line at={b(29.1)} out={b(32.2)} size={S} parts={["到手往往", { t: "七十几平", c: G }, "。"]} />
      </At>
      <FloorPlan at={b(28.6)} out={b(32.2)} />
      <Note at={b(29)} out={b(32.2)}>中国新闻网 2022-08：深圳 40 层以上在售新房得房率普遍 71%–75%；多层、小高层一般在 80% 以上</Note>

      <At x={110} y={110}>
        <Line at={b(32.4)} out={b(36.6)} size={S} parts={["早高峰，", { t: "2 部电梯", c: L }, "。"]} />
        <Line at={b(33.2)} out={b(36.6)} size={S2} parts={["住得越高，等得越久。"]} />
      </At>
      <RushCounter at={b(32.4)} out={b(36.6)} />
      <Note at={b(32.6)} out={b(36.6)}>132 户 × 2.62 人，估算</Note>

      <At x={110} y={110}>
        <Line at={b(37.2)} out={b(40.4)} size={S} parts={["大多数城市的云梯，"]} />
        <Line at={b(37.7)} out={b(40.4)} size={S} parts={["只够到 ", { t: "50 米", c: K.red }, "左右。"]} />
        <Line at={b(38.6)} out={b(40.4)} size={S2} parts={["再往上，着火只能靠楼里自己的消防。"]} />
      </At>
      <Pin cam={cam} at={b(37.4)} out={b(40.4)} p={[45, 50, 40]} lift={0} dot={false} side="right" dx={12} text="50 米" color={K.red} size={42} />
      <Note at={b(37.2)} out={b(40.4)}>第一财经：云梯有高度限制，通常在 50 米左右</Note>

      {/* ---------- fifteen years ---------- */}
      <At x={960} y={110} align="center">
        <Line at={b(40.6)} out={b(43.8)} size={Q} serif weight={700} parts={["这些，都还只是小麻烦。"]} />
      </At>
      <At x={960} y={110} align="center">
        <Line at={b(44)} out={b(47.8)} size={Q} serif weight={700} parts={["真正的大问题，要等", { t: "十几年后", c: K.amber }, "。"]} />
      </At>
      <YearBadge at={b(41.6)} out={b(47.9)} keys={[[b(41.6), 2010], [b(47.5), 2025]]} />

      {/* ---------- the machine ---------- */}
      <At x={110} y={110}>
        <Line at={b(48.3)} out={b(50.4)} size={92} serif weight={700} parts={["一栋高楼，是一台"]} />
        <Line at={b(48.9)} out={b(50.4)} size={92} serif weight={700} parts={["要一直", { t: "喂钱", c: G }, "的机器。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(50.5)} out={b(53.2)} size={S2} parts={["电梯、水泵、管道、外墙、防水……"]} />
        <Line at={b(51.1)} out={b(53.2)} size={S} parts={["用到十五年，开始", { t: "一起老", c: K.amber }, "。"]} />
      </At>
      <Pin cam={cam} at={b(48.8)} out={b(50.6)} p={[-16, 3, -2]} lift={60} dx={-70} side="left" text="水泵" color={K.water} size={36} />
      <Pin cam={cam} at={b(49.3)} out={b(50.6)} p={[-14, 104, -2]} lift={40} dx={-70} side="left" text="楼顶水箱" color={K.water} size={36} />
      <Note at={b(51)} out={b(53.2)}>住房城乡建设部、财政部 2015 年通知：运行超过 15 年的老旧电梯，可以使用维修资金更新改造</Note>
      <At x={110} y={110}>
        <Line at={b(53.4)} out={b(56.4)} size={S} parts={["全国的电梯，四台里有三台，"]} />
        <Line at={b(53.9)} out={b(56.4)} size={S} parts={["是最近 12 年装的。"]} />
        <Line at={b(55)} out={b(56.4)} size={S} parts={["它们会", { t: "一起变老", c: K.amber }, "。"]} />
      </At>
      <LiftCount at={b(53.4)} out={b(56.4)} run={[b(53.6), b(54.9)]} />
      <Note at={b(53.4)} out={b(56.4)}>市场监管总局：2025 年底 1231.59 万台；质检总局：2013 年底 300.93 万台</Note>

      {/* ---------- the bill ---------- */}
      <At x={110} y={110}>
        <Line at={b(56.6)} out={b(60.2)} size={S} parts={["机器越老，", { t: "越费钱", c: K.red }, "。"]} />
      </At>
      <CostMeter at={b(56.6)} out={b(60.2)} />
      <Note at={b(56.8)} out={b(60.2)}>中国物业管理协会：房龄 5 年以下维护约占物业费 25%–35%，10–15 年约 45%–60%，15 年左右约 70%–100%（据智谷趋势 2026-07 转引）</Note>
      <At x={110} y={110}>
        <Line at={b(60.3)} out={b(64)} size={S} parts={["大修，靠买房时交的", { t: "维修资金", c: G }, "。"]} />
        <Line at={b(61)} out={b(64)} size={S2} parts={["南京高层每平方米 120 元：一套 100 平，1.2 万元。"]} />
      </At>
      <Pin cam={cam} at={b(61.5)} out={b(64)} p={[8.5, 18, 34]} lift={40} dx={80} side="right" text="132 户 × 约 1.2 万" color={G} size={38} />
      <Note at={b(61)} out={b(64)}>南京市住房保障和房产局 宁房物字〔2017〕159 号：高层商品住宅首期 120 元/平方米</Note>

      {/* ---------- together ---------- */}
      <At x={960} y={96} align="center">
        <Line at={b(64.3)} out={b(65.6)} size={Q} serif weight={700} parts={["钱，要 132 户", { t: "一起", c: G }, "出。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(65.7)} out={b(68.8)} size={S} parts={["“一起”这两个字，最难。"]} />
      </At>
      <Pin cam={cam} at={b(65.9)} out={b(68.8)} p={[-16.9, yf(1), 7]} lift={10} dx={-80} side="left" dot={false} text="2 楼：“我走楼梯。”" color={K.red} size={34} />
      <Pin cam={cam} at={b(66.5)} out={b(68.8)} p={[16.9, yf(4), 7]} lift={10} dx={80} side="right" dot={false} text="5 楼：“房子又不是我的。”" color="#cfe0ff" size={34} />
      <Pin cam={cam} at={b(67.1)} out={b(68.8)} p={[-16.9, yf(8), 7]} lift={10} dx={-80} side="left" dot={false} text="9 楼：“今年没了工作。”" color={K.amber} size={34} />
      <Pin cam={cam} at={b(67.7)} out={b(68.8)} p={[16.9, yf(14), 7]} lift={10} dx={80} side="right" dot={false} text="15 楼：空着，房东联系不上。" color={K.grey} size={34} />
      <Note at={b(65.7)} out={b(68.8)}>示意</Note>
      <At x={110} y={110}>
        <Line at={b(69)} out={b(72)} size={S2} parts={["动用维修资金，要过半业主同意；"]} />
        <Line at={b(69.6)} out={b(72)} size={S} parts={["再凑钱，要", { t: "四分之三", c: L }, "。"]} />
      </At>
      <Tally at={b(69)} out={b(72)} />
      <Note at={b(69)} out={b(72)}>《民法典》第 278 条：使用维修资金须经参与表决业主面积、人数双过半同意；筹集维修资金、改建重建须双四分之三以上同意</Note>

      {/* ---------- nobody pays ---------- */}
      <At x={110} y={110}>
        <Line at={b(72.2)} out={b(75)} size={S} parts={["物业费，也越来越难收："]} />
        <Line at={b(72.8)} out={b(75)} size={S2} parts={["2025 年，物业企业平均收缴率降到约 ", { t: "71%", c: K.red }, "。"]} />
      </At>
      <Note at={b(72.2)} out={b(75)}>克而瑞：2025 年物业服务企业（500 强）平均收缴率约 71%，连续四年下滑</Note>
      <At x={110} y={110}>
        <Line at={b(75.1)} out={b(77.3)} size={S} parts={["收不上钱，物业就", { t: "撤", c: K.red }, "。"]} />
        <Line at={b(75.6)} out={b(77.3)} size={S2} parts={["2025 年初到 2026 年 3 月，全国 212 个小区物业撤场。"]} />
      </At>
      <Note at={b(75.1)} out={b(77.3)}>中指研究院：2025 年初至 2026 年 3 月底，全国住宅物业撤场项目 212 个，超六成为企业主动离场</Note>
      <At x={110} y={110}>
        <Line at={b(77.4)} out={b(80.2)} size={S2} parts={["柳州一个小区，物业费每平米 8 毛都收不齐，电梯全停。"]} />
        <Line at={b(78)} out={b(80.2)} size={S2} parts={["11 楼一位要透析的老人，"]} />
        <Line at={b(78.5)} out={b(80.2)} size={S2} parts={["家里花 ", { t: "3000 元", c: G }, "买了爬楼轮椅。"]} />
      </At>
      <Pin cam={cam} at={b(77.6)} out={b(80.1)} p={[6.6, yf(10), 7]} lift={50} dx={90} side="right" text="11 楼" color={G} size={40} />
      <Note at={b(77.4)} out={b(80.2)}>南方周末（据智谷趋势 2026-07 转引）：柳州东悦佳苑，18–24 层，电梯全部关停</Note>

      {/* ---------- Florida ---------- */}
      <At x={110} y={110}>
        <Line at={b(80.4)} out={b(87.8)} size={S} parts={["拖下去，最坏会怎样？"]} />
        <Line at={b(80.9)} out={b(87.8)} size={S2} parts={["美国佛罗里达，一栋 12 层公寓。"]} />
      </At>
      <Timeline
        at={b(81.6)}
        out={b(87.8)}
        items={[
          { at: b(81.6), date: "2018.10", text: "工程师报告：结构严重损伤" },
          { at: b(83), date: "2021.04", text: "吵了两年多，终于决定凑 1500 万美元" },
          { at: b(85.8), date: "2021.06.24", text: "楼塌了，98 人遇难。", c: K.red },
        ]}
      />
      <Note at={b(81.6)} out={b(87.8)}>Champlain Towers South，Surfside：2018-10-08 Morabito Consultants 报告；2021-04 业主协会通过 1500 万美元特别摊派；倒塌 98 人遇难（NPR、WPTV、Miami-Dade）</Note>

      {/* ---------- no way back ---------- */}
      <At x={110} y={110}>
        <Line at={b(88.2)} out={b(92.2)} size={S} parts={["修不起，能不能拆了重盖？"]} />
        <Line at={b(88.9)} out={b(92.2)} size={S2} parts={["老小区可以：杭州浙工新村，6 层拆了盖 11 层，"]} />
        <Line at={b(89.5)} out={b(92.2)} size={S2} parts={["钱", { t: "八成多", c: G }, "还是业主自己出的。"]} />
      </At>
      <Pin cam={cam} at={b(88.4)} out={b(89.3)} p={[66, 18, 6]} lift={50} text="6 层老楼" color={K.fg} size={40} />
      <Pin cam={cam} at={b(91)} out={b(92.3)} p={[66, 33, 6]} lift={50} text="11 层" color={L} size={40} />
      <Note at={b(88.2)} out={b(92.2)}>浙工新村：1983 年建，13 幢 6 层 → 7 幢 11 层，548 户签约 547 户，业主出资占总资金 80% 以上（杭州日报、新华社、拱墅区住建局）</Note>
      <At x={110} y={110}>
        <Line at={b(92.3)} out={b(94.4)} size={S} parts={["33 层呢？已经", { t: "盖到头", c: K.red }, "。"]} />
        <Line at={b(92.9)} out={b(94.4)} size={S2} parts={["拆了重盖，还是 33 层，钱全得自己掏。"]} />
      </At>
      <Pin cam={cam} at={b(93.2)} out={b(94.4)} p={[0, 150, 7]} lift={0} dot={false} side="center" text="还是 33 层" color={K.fg} size={40} />
      <At x={960} y={110} align="center">
        <Line at={b(94.6)} out={b(96.6)} size={130} serif weight={900} stagger={0.06} parts={["高层，", { t: "没有退路", c: G }, "。"]} />
      </At>

      {/* ---------- passing it on ---------- */}
      <At x={110} y={110}>
        <Line at={b(96.8)} out={b(98.8)} size={S} parts={["那它会怎样老去？"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(98.9)} out={b(101.4)} size={S} parts={["先走的，是", { t: "走得起", c: L }, "的人。"]} />
        <Line at={b(99.6)} out={b(101.4)} size={S2} parts={["房子租出去，再隔成群租……"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(101.5)} out={b(104)} size={S2} parts={["一路往下传。留下的，"]} />
        <Line at={b(102.1)} out={b(104)} size={S} parts={["是最", { t: "付不起维修费", c: K.red }, "的人。"]} />
      </At>
      <PassLegend at={b(97.4)} out={b(104)} />

      {/* ---------- people grow old ---------- */}
      <At x={110} y={110}>
        <Line at={b(104.2)} out={b(107)} size={S} parts={["楼里的人，也在和楼", { t: "一起老", c: K.amber }, "。"]} />
        <Line at={b(104.9)} out={b(107)} size={S2} parts={["第一次买房，平均 29.5 岁；楼 40 岁那年，他们快 70 了。"]} />
      </At>
      <AgeCounter at={b(104.2)} out={b(107)} run={[b(104.6), b(106.6)]} />
      <Note at={b(104.2)} out={b(107)}>贝壳研究院 2018 年全国购房调查：购房者平均年龄 29.5 岁</Note>
      <At x={110} y={110}>
        <Line at={b(107.1)} out={b(110)} size={S} parts={["接下一棒的人呢？"]} />
        <Line at={b(107.6)} out={b(110)} size={S2} parts={["1990 年前后，每年出生约 2400 万人；"]} />
        <Line at={b(108.3)} out={b(110)} size={S2} parts={["2025 年，", { t: "792 万", c: K.red }, "。"]} />
      </At>
      <Births at={b(107.1)} out={b(110)} />
      <Note at={b(107.1)} out={b(110)}>《中国统计年鉴》：1990 年出生率 21.06‰（约 11.4 亿人，推算约 2400 万）；国家统计局：2025 年出生 792 万</Note>

      {/* ---------- the answer ---------- */}
      <At x={110} y={110}>
        <Line at={b(110.2)} out={b(112.6)} size={S} parts={["所以，会变成贫民窟吗？"]} />
        <Line at={b(110.8)} out={b(112.6)} size={S2} parts={["不会全变。人多、管得好的地方，它能活很久："]} />
        <Line at={b(111.4)} out={b(112.6)} size={S2} parts={["香港美孚新邨，快 60 年，仍是抢手货。"]} />
      </At>
      <Note at={b(110.2)} out={b(112.6)}>美孚新邨：1968–1978 年入伙，99 座；2025 年 9 月二手平均呎价 10,177 港元（星岛头条）</Note>
      <At x={960} y={110} align="center">
        <Line at={b(112.8)} out={b(116)} size={88} serif weight={700} parts={["人走、没人管的地方，"]} />
        <Line at={b(113.6)} out={b(116)} size={88} serif weight={700} parts={["它会", { t: "一层一层暗下去", c: K.grey }, "。"]} />
      </At>

      {/* ---------- lift ---------- */}
      <At x={960} y={150} align="center" gap={6}>
        <Line at={b(116.2)} out={b(119)} size={110} serif weight={900} stagger={0.07} parts={["盖一栋楼，三年。"]} />
        <Line at={b(117.2)} out={b(119)} size={110} serif weight={900} stagger={0.07} parts={["养一栋楼，", { t: "五十年", c: G }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={b(119.2)} out={b(121.9)} size={84} serif weight={900} parts={["人会走，楼走不了。"]} />
      </At>
      <At x={110} y={850}>
        <Line at={b(120)} out={b(121.9)} size={88} serif weight={900} parts={["你，就是其中", { t: "一户", c: G }, "。"]} />
      </At>
      <YouRing cam={cam} at={b(120.4)} out={b(121.9)} i={YOU} />

      <Sources at={b(121.9)} out={b(123.2)} />
      <EndCard at={b(122.9)} />
      <BrandMark o={1 - ramp(t, b(122.7), b(123))} />
    </AbsoluteFill>
  );
};

void OLDIE;
