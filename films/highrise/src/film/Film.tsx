// 《高层住宅，几十年后会变成贫民窟吗？》: one city, one 33-floor tower, a chain of questions (SCRIPT.md).
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { K } from "../theme";
import { EO, FILM_FRAMES, FPS, ramp, sa, sb, win } from "../timing";
import { World } from "../world/World";
import { ChinaMap, Fade, LiftBars, LiftCount, PhotoStage, QuestionCard, Spiral, StairLine, Tally, YearBadge, YouRing } from "./overlays";
import { worldAt } from "./state";
import { At, BrandMark, EndCard, Line, Note, Pin, Sources } from "./ui";

const G = K.gold;
const L = K.lit;
// type sizes: statement, second line, question
const S = 74;
const S2 = 64;
const Q = 118;

// Sounds from the brand library (music.shapeof.world), on the key actions.
const SFX: { id: string; t: number; vol: number }[] = [
  { id: "sfx-foley-02", t: sa(4.3), vol: 0.35 }, // question card
  ...Array.from({ length: 9 }, (_, i) => ({ id: "sfx-mechanical-01", t: sa(13.5) + i * 0.42, vol: 0.12 + (i % 3) * 0.03 })), // lights on
  { id: "sfx-transition-08", t: sa(20.4), vol: 0.3 }, // X-ray
  { id: "sfx-mechanical-08", t: sa(24.4), vol: 0.35 }, // pump
  { id: "sfx-water-12", t: sa(24.8), vol: 0.35 },
  { id: "sfx-mechanical-18", t: sa(28.6), vol: 0.3 }, // lift
  ...Array.from({ length: 11 }, (_, i) => ({ id: "sfx-mechanical-14", t: sa(33.2) + i * 1.02, vol: 0.12 })), // years tick
  { id: "sfx-scifi-17", t: sa(41.3), vol: 0.22 }, // lift flicker
  { id: "sfx-transition-05", t: sa(44.3), vol: 0.3 }, // pull back
  ...Array.from({ length: 12 }, (_, i) => ({ id: "sfx-impact-03", t: sa(49.9) + i * 0.24, vol: 0.12 + (i % 4) * 0.02 })), // coins
  ...Array.from({ length: 8 }, (_, i) => ({ id: "sfx-ui-13", t: sa(52.7) + i * 0.4, vol: 0.12 })), // votes
  { id: "sfx-water-10", t: sa(56.1), vol: 0.3 }, // fund drains
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-ui-13", t: sa(58.4) + i * 0.48, vol: 0.1 })),
  { id: "sfx-notification-18", t: sa(61.3), vol: 0.25 }, // short of 99
  { id: "sfx-impact-11", t: sa(66.1), vol: 0.35 }, // walk-up comes down
  { id: "sfx-transition-19", t: sa(67.0), vol: 0.3 }, // rises again
  { id: "sfx-transition-15", t: sa(72.4), vol: 0.3 }, // ghost wiped
  { id: "sfx-impact-16", t: sa(72.7), vol: 0.45 }, // no way back
  { id: "sfx-impact-16", t: sb(13.6), vol: 0.5 }, // Pruitt-Igoe
  { id: "sfx-impact-11", t: sb(13.9), vol: 0.4 },
  { id: "sfx-transition-18", t: sb(14.2), vol: 0.35 },
  { id: "sfx-transition-19", t: sb(24.1), vol: 0.3 }, // up to the map
  { id: "sfx-impact-19", t: sb(62.1), vol: 0.3 }, // the lift arrives
];

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = worldAt(t);
  const cam = s.cam;
  const offWorld = (t > sb(8.05) && t < sb(23.95)) || (t > sb(24.8) && t < sb(35.3));
  const musicVol = (f: number) => {
    const tt = f / FPS;
    return 0.9 * interpolate(tt, [0, 0.4], [0.5, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(tt, [sb(68.5), FILM_FRAMES / FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };
  // dips through black between places
  const dip = Math.max(win(t, sb(7.55), sb(8.45), 0.4), win(t, sb(15.6), sb(16.4), 0.35), win(t, sb(23.5), sb(24.3), 0.35));
  return (
    <AbsoluteFill style={{ background: "#040508", overflow: "hidden" }}>
      <Audio src={staticFile("music.wav")} volume={musicVol} />
      {SFX.map((x, i) => (
        <Sequence key={i} from={Math.round(x.t * FPS)} durationInFrames={90} layout="none">
          <Audio src={staticFile(`sfx/${x.id}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
      {!offWorld ? <World s={s} /> : null}
      <PhotoStage src="photos/pruitt-aerial.jpg" at={sb(8.1)} out={sb(13.6)} zoom={[1.02, 1.16]} focus={[48, 52]} darken={0.55 * ramp(t, sb(11.0), sb(12.4))} caption="Pruitt-Igoe（普鲁伊特-艾戈），美国圣路易斯" credit="航拍：美国地质调查局 · 公有领域" />
      <PhotoStage src="photos/pruitt-collapse.jpg" at={sb(13.5)} out={sb(15.9)} zoom={[1.0, 1.07]} focus={[60, 55]} flash caption="1972 年，第一批楼被炸掉" credit="照片：美国住房和城市发展部 · 公有领域" />
      <PhotoStage src="photos/meifoo-2021.jpg" at={sb(16.1)} out={sb(23.8)} zoom={[1.0, 1.14]} focus={[52, 62]} caption="美孚新邨，香港荔枝角，2021 年" credit="照片：Wpcpey · CC BY 4.0" />
      <ChinaMap at={sb(24)} out={sb(36.2)} />
      <Fade o={dip} />

      {/* ---------- hook ---------- */}
      <At x={110} y={110}>
        <Line at={sa(0.6)} out={sa(3.9)} size={92} parts={["中国有 ", { t: "100 多万栋", c: G }]} />
        <Line at={sa(1.4)} out={sa(3.9)} size={92} parts={["高层住宅。"]} />
      </At>
      <Note at={sa(0.8)} out={sa(3.9)}>约 102.3 万栋，截至 2023 年底（中国消防协会科普教育工作委员会委员许传升，据《中国新闻周刊》）</Note>
      <QuestionCard at={sa(4.1)} out={sa(9.1)} />

      <At x={110} y={860}>
        <Line at={sa(9.4)} out={sa(12.1)} size={S} parts={["这个问题，要从一栋楼说起。"]} />
      </At>

      {/* ---------- one tower ---------- */}
      <At x={110} y={110}>
        <Line at={sa(12.3)} out={sa(16.1)} size={S} parts={[{ t: "2010", c: L }, " 年，一座城市的新区里，"]} />
        <Line at={sa(13.0)} out={sa(16.1)} size={S} parts={["它盖好了。"]} />
      </At>
      <At x={110} y={880}>
        <Line at={sa(13.8)} out={sa(16.1)} size={S2} parts={[{ t: "33", c: L }, " 层，", { t: "2", c: L }, " 部电梯，", { t: "132", c: L }, " 户人家。"]} />
      </At>
      <Note at={sa(12.6)} out={sa(16.1)}>示意：一栋普通的 33 层住宅，一层 4 户</Note>

      <At x={960} y={96} align="center">
        <Line at={sa(16.2)} out={sa(17.7)} size={Q} serif weight={700} parts={["为什么偏偏是 ", { t: "33", c: L }, " 层？"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sa(17.8)} out={sa(20.3)} size={S} parts={["住宅超过 ", { t: "100 米", c: K.red }, "，"]} />
        <Line at={sa(18.2)} out={sa(20.3)} size={S} parts={["就要多建一层避难层。"]} />
      </At>
      <At x={110} y={880}>
        <Line at={sa(19.0)} out={sa(20.3)} size={S2} parts={["33 层，差不多就是 100 米。"]} />
      </At>
      <Pin cam={cam} at={sa(16.9)} out={sa(20.4)} p={[0, 100, -60]} lift={0} dot={false} side="right" dx={10} text="100 米" color={K.fg} size={40} />
      <Pin cam={cam} at={sa(18.1)} out={sa(20.0)} p={[0, 101.5, 7]} lift={70} dx={120} side="right" text="避难层" color={K.red} size={38} />
      <Note at={sa(17.8)} out={sa(20.3)}>《建筑设计防火规范》GB 50016：建筑高度大于 100 米的住宅建筑应设置避难层 · 33 层约 100 米按层高约 3 米估算</Note>

      {/* ---------- a machine ---------- */}
      <At x={110} y={110}>
        <Line at={sa(20.6)} out={sa(24.1)} size={S} parts={["可一栋高层，"]} />
        <Line at={sa(21.3)} out={sa(24.1)} size={S} parts={["不只是钢筋混凝土。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sa(24.2)} out={sa(28.1)} size={88} serif weight={700} parts={["它更像一台", { t: "机器", c: K.cyan }, "。"]} />
      </At>
      <At x={110} y={850}>
        <Line at={sa(25.0)} out={sa(28.1)} size={S2} parts={["自来水送不上 100 米，"]} />
        <Line at={sa(25.5)} out={sa(28.1)} size={S2} parts={["要靠", { t: "水泵", c: K.water }, "一层层压上去。"]} />
      </At>
      <Pin cam={cam} at={sa(24.4)} out={sa(28.1)} p={[-16, 3, -2]} lift={70} dx={-60} side="left" text="水泵" color={K.water} size={36} />
      <Pin cam={cam} at={sa(27.2)} out={sa(28.1)} p={[-14, 104, -2]} lift={40} dx={-60} side="left" text="楼顶水箱" color={K.water} size={36} />

      <At x={110} y={110}>
        <Line at={sa(28.3)} out={sa(32.4)} size={88} serif weight={700} parts={["人，靠", { t: "电梯", c: L }, "。"]} />
      </At>
      <At x={110} y={810}>
        <Line at={sa(29.4)} out={sa(32.4)} size={S2} parts={["电梯停一天，住 33 楼的人，"]} />
        <StairLine at={sa(29.6)} out={sa(32.4)} from={sa(29.6)} to={sa(31.8)} />
      </At>
      <Note at={sa(29.6)} out={sa(32.4)}>按每层约 18 级估算</Note>

      {/* ---------- ageing ---------- */}
      <At x={110} y={110}>
        <Line at={sa(32.5)} out={sa(36.1)} size={104} serif weight={700} parts={["机器，是会", { t: "老", c: K.amber }, "的。"]} />
      </At>
      <YearBadge at={sa(33)} out={sa(44.2)} keys={[[sa(33), 2010], [sa(43.8), 2025]]} age />
      <At x={110} y={110}>
        <Line at={sa(36.3)} out={sa(40.2)} size={S} parts={["混凝土的骨架，按 ", { t: "50 年", c: L }, "设计。"]} />
        <Line at={sa(37.0)} out={sa(40.2)} size={S} parts={["先老的，是那些", { t: "会动", c: K.amber }, "的东西："]} />
      </At>
      <Pin cam={cam} at={sa(37.6)} out={sa(40.2)} p={[1.7, 70, -3]} lift={30} dx={90} side="right" text="电梯" color={K.amber} size={36} />
      <Pin cam={cam} at={sa(37.9)} out={sa(40.2)} p={[-16, 3, -2]} lift={60} dx={-50} side="left" text="水泵" color={K.amber} size={36} />
      <Pin cam={cam} at={sa(38.2)} out={sa(40.2)} p={[-16, 55, -2]} lift={30} dx={-80} side="left" text="水管" color={K.amber} size={36} />
      <Pin cam={cam} at={sa(38.5)} out={sa(40.2)} p={[22, 64, 7]} lift={30} dx={80} side="right" text="外墙" color={K.amber} size={36} />
      <Pin cam={cam} at={sa(38.8)} out={sa(40.2)} p={[18, 99, 4]} lift={40} dx={60} side="right" text="屋顶防水" color={K.amber} size={36} />
      <Note at={sa(36.3)} out={sa(40.2)}>《建筑结构可靠性设计统一标准》GB 50068：普通房屋设计使用年限 50 年</Note>
      <At x={110} y={110}>
        <Line at={sa(40.4)} out={sa(44.1)} size={S} parts={[{ t: "2025", c: L }, " 年，它 15 岁了。"]} />
        <Line at={sa(41.2)} out={sa(44.1)} size={S2} parts={["电梯用满 15 年，就算", { t: "“老旧电梯”", c: K.amber }, "。"]} />
      </At>
      <Note at={sa(41.2)} out={sa(44.1)}>住房城乡建设部、财政部 2015 年通知：运行超过 15 年的老旧电梯，可以使用维修资金更新改造</Note>

      {/* ---------- every lift in the city ---------- */}
      <At x={110} y={110}>
        <Line at={sa(44.4)} out={sa(48.3)} size={S} parts={["全国的电梯，"]} />
        <Line at={sa(46.6)} out={sa(48.3)} size={S} parts={["它们，会", { t: "一起变老", c: K.amber }, "。"]} />
      </At>
      <LiftCount at={sa(44.4)} out={sa(48.3)} run={[sa(44.6), sa(46.4)]} />
      <Note at={sa(44.4)} out={sa(48.3)}>市场监管总局《2025 年全国特种设备安全状况》：1231.59 万台；质检总局：2013 年底 300.93 万台</Note>

      {/* ---------- who pays ---------- */}
      <At x={960} y={110} align="center">
        <Line at={sa(48.5)} out={sa(49.9)} size={Q} serif weight={700} parts={["坏了，谁来修？"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sa(50.0)} out={sa(52.4)} size={S} parts={["买房时，每户都交过一笔钱："]} />
        <Line at={sa(50.6)} out={sa(52.4)} size={S} parts={[{ t: "住宅专项维修资金", c: G }, "。"]} />
      </At>
      <Pin cam={cam} at={sa(51.0)} out={sa(56.0)} p={[8.5, 20, 34]} lift={40} dx={70} side="right" text="维修资金" color={G} size={36} />

      <At x={110} y={110}>
        <Line at={sa(52.5)} out={sa(56.1)} size={S} parts={["可要动用它，得业主", { t: "投票", c: L }, "。"]} />
      </At>
      <Pin cam={cam} at={sa(53.3)} out={sa(56.1)} p={[-22, 4.5, 7]} lift={10} dx={-90} side="left" dot={false} text="一楼：“我又不坐电梯。”" color={K.red} size={38} />
      <Pin cam={cam} at={sa(54.4)} out={sa(56.1)} p={[22, 97.5, 7]} lift={10} dx={90} side="right" dot={false} text="33 楼：“我天天坐。”" color={K.green} size={38} />
      <Note at={sa(52.5)} out={sa(56.1)}>《民法典》第 278 条：使用维修资金，须经参与表决的业主面积、人数双过半同意（示意）</Note>

      <At x={960} y={110} align="center">
        <Line at={sa(56.2)} out={sa(58.2)} size={Q} serif weight={700} parts={["修了几回，钱", { t: "花完了", c: K.red }, "。"]} />
      </At>

      <At x={110} y={110}>
        <Line at={sa(58.3)} out={sa(61.3)} size={S} parts={["再凑钱，要", { t: "四分之三", c: L }, "的人点头。"]} />
      </At>
      <Tally at={sa(58.3)} out={sa(61.3)} />
      <Note at={sa(58.3)} out={sa(61.3)}>《民法典》第 278 条：筹集维修资金，须经参与表决的业主面积、人数双四分之三以上同意（示意）</Note>
      <At x={110} y={110}>
        <Line at={sa(61.4)} out={sa(64.1)} size={S} parts={["国家也在补：已帮着换了 ", { t: "36 万台", c: G }, "老电梯。"]} />
        <Line at={sa(62.4)} out={sa(64.1)} size={S} parts={["可全国，有 ", { t: "1231 万台", c: K.cyan }, "。"]} />
      </At>
      <LiftBars at={sa(61.4)} out={sa(64.1)} />
      <Note at={sa(61.4)} out={sa(64.1)}>住房城乡建设部：截至 2026 年 5 月，超长期特别国债约 554 亿元，支持更新住宅老旧电梯超过 36 万台</Note>

      {/* ---------- pull it down and rebuild? ---------- */}
      <At x={960} y={110} align="center">
        <Line at={sa(64.2)} out={sa(65.7)} size={Q} serif weight={700} parts={["修不起，能不能", { t: "拆了重盖", c: L }, "？"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sa(65.7)} out={sa(68.0)} size={S} parts={["老小区可以：杭州浙工新村，"]} />
        <Line at={sa(66.2)} out={sa(68.0)} size={S} parts={[{ t: "6 层", c: K.grey }, "拆了，盖成 ", { t: "11 层", c: L }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sa(68.1)} out={sa(70.3)} size={S} parts={["可就算这样，钱", { t: "八成多", c: G }, "是业主自己掏的。"]} />
      </At>
      <Pin cam={cam} at={sa(65.9)} out={sa(66.9)} p={[66, 18, 6]} lift={50} text="6 层老楼" color={K.fg} size={40} />
      <Pin cam={cam} at={sa(68.6)} out={sa(70.3)} p={[66, 33, 6]} lift={50} text="11 层" color={L} size={40} />
      <Pin cam={cam} at={sa(71.2)} out={sa(72.7)} p={[0, 150, 7]} lift={0} dot={false} dx={0} side="center" text="拆了重盖，还是 33 层" color={K.fg} size={40} />
      <Pin cam={cam} at={sa(73.6)} out={sa(78.2)} p={[0, 99, 0]} lift={70} text="它" color={G} size={42} />
      <Note at={sa(65.8)} out={sa(70.2)}>浙工新村：1983 年建，13 幢 6 层 → 7 幢 11 层，548 户签约 547 户，业主出资占总资金 80% 以上（杭州日报、新华社、拱墅区住建局）</Note>

      <At x={110} y={110}>
        <Line at={sa(70.4)} out={sa(72.6)} size={S} parts={["33 层呢？已经", { t: "盖到头", c: K.red }, "了。"]} />
        <Line at={sa(71.2)} out={sa(72.6)} size={S} parts={["钱，全得 ", { t: "132 户", c: L }, "自己出。"]} />
      </At>
      <Note at={sa(70.4)} out={sa(72.6)}>《民法典》第 278 条：改建、重建建筑物，须经参与表决的业主双四分之三以上同意</Note>
      <At x={960} y={110} align="center">
        <Line at={sa(72.7)} out={sa(74.6)} size={130} serif weight={900} parts={["高层，", { t: "没有退路", c: G }, "。"]} stagger={0.06} />
      </At>
      <At x={960} y={110} align="center">
        <Line at={sa(74.7)} out={sa(76.5)} size={96} serif weight={700} parts={["它只能，一直", { t: "修", c: L }, "下去。"]} />
      </At>
      <At x={960} y={110} align="center">
        <Line at={sa(76.5)} out={sb(0.2)} size={Q} serif weight={700} parts={["那它，什么时候会变成", { t: "贫民窟", c: K.red }, "？"]} />
      </At>

      {/* ---------- the spiral ---------- */}
      <At x={110} y={110}>
        <Line at={sb(0.3)} out={sb(3.9)} size={S} parts={["不是在它", { t: "变老", c: K.amber }, "的时候。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(4.0)} out={sb(7.7)} size={S} parts={["是在", { t: "人开始离开", c: K.red }, "的时候。"]} />
      </At>
      <Spiral cam={cam} at={sb(4.2)} out={sb(7.7)} />
      <Note at={sb(5.4)} out={sb(7.7)}>物业费也越来越难收：百强物业住宅物业费收缴率，2025 年 82.3%，2020 年前后约 93%（中物智库）</Note>

      {/* ---------- Pruitt-Igoe ---------- */}
      <At x={110} y={110}>
        <Line at={sb(8.3)} out={sb(10.95)} size={S} parts={["美国见过。", { t: "1954", c: L }, " 年，圣路易斯，"]} />
        <Line at={sb(8.9)} out={sb(10.95)} size={S} parts={["33 栋公寓楼，住满了人。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(11.0)} out={sb(13.4)} size={S} parts={["不到 20 年，", { t: "三分之二", c: K.red }, "空了。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(13.5)} out={sb(15.7)} size={92} serif weight={900} parts={[{ t: "1972", c: K.red }, " 年，开始炸。"]} />
      </At>
      <Note at={sb(8.4)} out={sb(15.7)}>Pruitt-Igoe 是政府建的公共住房，和中国业主自有的房子不同 · 1954 年入住，2,870 套；1970 年空置超过三分之二（HUD）</Note>

      {/* ---------- 美孚新邨 ---------- */}
      <At x={110} y={110}>
        <Line at={sb(16.4)} out={sb(19.1)} size={S} parts={["同样是高楼，香港的", { t: "美孚新邨", c: L }, "，"]} />
        <Line at={sb(17.0)} out={sb(19.1)} size={S2} parts={["1968 年入伙，99 栋。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(19.2)} out={sb(21.6)} size={S} parts={["快 60 年了，每平方英尺"]} />
        <Line at={sb(19.7)} out={sb(21.6)} size={S} parts={["还要卖 ", { t: "1 万港元", c: G }, "。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(21.7)} out={sb(23.6)} size={S} parts={["差的不是楼有多高，"]} />
        <Line at={sb(22.3)} out={sb(23.6)} size={S} parts={["是有没有", { t: "人", c: G }, "想住进来。"]} />
      </At>
      <Note at={sb(16.4)} out={sb(21.6)}>美孚新邨：1968–1978 年分 8 期入伙，99 座，13,149 个单位 · 2025 年 9 月二手平均呎价 10,177 港元（星岛头条）</Note>

      {/* ---------- China ---------- */}
      <At x={110} y={110}>
        <Line at={sb(24.4)} out={sb(26.0)} size={S} parts={["那中国的楼，会走向哪一边？"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(26.1)} out={sb(28.6)} size={S} parts={["2025 年，中国人口", { t: "连续第四年", c: K.red }, "减少，"]} />
        <Line at={sb(26.7)} out={sb(28.6)} size={S2} parts={["出生 ", { t: "792 万", c: L }, "，1949 年以来最少。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(28.7)} out={sb(32.8)} size={S} parts={["2010 到 2020 年，"]} />
        <Line at={sb(29.2)} out={sb(32.8)} size={S2} parts={["31 个省份里，6 个人口变少。"]} />
        <Line at={sb(30.8)} out={sb(32.8)} size={S2} parts={["人，在往", { t: "少数地方", c: L }, "走。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(32.9)} out={sb(35.6)} size={S} parts={["联合国预测：2100 年，"]} />
        <Line at={sb(33.5)} out={sb(35.6)} size={S} parts={["中国约 ", { t: "6.3 亿", c: K.red }, "人，不到今天一半。"]} />
      </At>
      <Note at={sb(26.1)} out={sb(35.6)}>国家统计局 2026-01：2025 年末 14.05 亿人，出生 792 万 · 第七次全国人口普查公报（第三号）· 联合国《世界人口展望 2024》中方案</Note>

      {/* ---------- back over the city ---------- */}
      <At x={110} y={110}>
        <Line at={sb(36.4)} out={sb(39.9)} size={S} parts={["人会越来越少。"]} />
        <Line at={sb(37.4)} out={sb(39.9)} size={S} parts={["可楼，", { t: "一栋也不会少", c: L }, "。"]} />
      </At>
      <At x={960} y={110} align="center">
        <Line at={sb(40.0)} out={sb(43.9)} size={Q} serif weight={700} parts={["所以，高层会变成贫民窟吗？"]} />
        <Line at={sb(41.8)} out={sb(43.9)} size={S} parts={["不会全变，也不会都不变。"]} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(44.0)} out={sb(47.9)} size={S} parts={["人多的地方，它会被", { t: "一直修下去", c: L }, "；"]} />
        <Line at={sb(45.2)} out={sb(47.9)} size={S} parts={["人走的地方，它会", { t: "一层一层暗下去", c: K.grey }, "。"]} />
      </At>

      {/* ---------- 升华 ---------- */}
      <At x={960} y={120} align="center" gap={6}>
        <Line at={sb(48.3)} out={sb(55.9)} size={132} serif weight={900} parts={["人会走。"]} stagger={0.08} />
        <Line at={sb(50.0)} out={sb(55.9)} size={132} serif weight={900} parts={["楼，", { t: "走不了", c: G }, "。"]} stagger={0.08} />
      </At>
      <At x={110} y={110}>
        <Line at={sb(56.2)} out={sb(63.8)} size={S} parts={["一栋楼能活多久，"]} />
        <Line at={sb(57.2)} out={sb(63.8)} size={S} parts={["看的是留下来的人，"]} />
        <Line at={sb(58.2)} out={sb(63.8)} size={S} parts={["愿不愿意", { t: "一起修它", c: G }, "。"]} />
      </At>
      <At x={110} y={850}>
        <Line at={sb(60.6)} out={sb(63.8)} size={88} serif weight={900} parts={["你，就是其中", { t: "一户", c: G }, "。"]} />
      </At>
      <YouRing cam={cam} at={sb(61.6)} out={sb(63.8)} p={[-22 + 11 + 3.5, 20 * 3 + 1.5, 7.2]} />

      <Sources at={sb(64)} out={sb(68.2)} />
      <EndCard at={sb(67.6)} />
      <BrandMark o={1 - ramp(t, sb(67.4), sb(67.7))} />
    </AbsoluteFill>
  );
};

export const FILM_LEN = FILM_FRAMES;
void EO;
