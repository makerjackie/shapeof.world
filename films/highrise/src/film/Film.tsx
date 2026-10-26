// 《高层住宅，几十年后会变成“贫民窟”吗？》v9. One main line (SCRIPT.md): a high-rise is a machine that a hundred-odd
// households must keep paying for together; it ages all at once, the money design is weak, every flat has its own
// owner; those who can leave do, the machine stops, and the tower goes dark from the top down.
import React from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame } from "remotion";
import { K } from "../theme";
import { FILM_FRAMES, FPS, lerp, ramp, sf as b } from "../timing";
import { World } from "../world/World";
import { AgeCounter, Archive, BillRibbon, Births, Budget, Crack, ExodusGrid, Japan, JapanFund, LiftCount, Loop, NoiseRings, PassLegend, Quote, RushCounter, ShanghaiDots, Tally, YearBadge, YouRing } from "./overlays";
import { BILLS, billT, NOISE_SRC, T, worldAt, YOU, yf } from "./state";
import { At, BrandMark, EndCard, Line, Note, Pin, Scrim, Sources } from "./ui";

const G = K.gold;
const L = K.lit;
const R = K.red;
const S = 70;
const S2 = 58;
const H = 104;

// one click per floor as the lights go out from the top (same curve as state.ts fromTop)
const darkClicks = (f0: number, f1: number, vol: number) => {
  const t0 = b(f0);
  const t1 = b(f1);
  const out: { id: string; t: number; vol: number }[] = [];
  for (let idx = 0; idx < 26; idx++) {
    // n(x) = 26 * x * (0.75 + 0.25x) = idx  →  x
    const a = 0.25 * 26;
    const c = -idx;
    const x = (-0.75 * 26 + Math.sqrt(0.75 * 26 * 0.75 * 26 - 4 * a * c)) / (2 * a);
    out.push({ id: "sfx-mechanical-14", t: lerp(t0, t1, x), vol: vol * (0.75 + 0.25 * ((idx * 0.618) % 1)) });
  }
  return out;
};

const SFX: { id: string; t: number; vol: number }[] = [
  ...darkClicks(T.hookDark[0], T.hookDark[1], 0.12),
  { id: "sfx-scifi-17", t: b(T.hookX), vol: 0.28 },
  { id: "sfx-transition-07", t: b(T.hookOut) + 0.2, vol: 0.34 },
  { id: "sfx-transition-16", t: b(T.machine + 0.3), vol: 0.26 },
  { id: "sfx-transition-19", t: b(T.walkup), vol: 0.2 },
  { id: "sfx-scifi-17", t: b(T.cutPower), vol: 0.24 },
  { id: "sfx-transition-16", t: b(T.village), vol: 0.3 },
  ...Array.from({ length: 6 }, (_, i) => ({ id: "sfx-mechanical-16", t: b(T.noise) + i * 0.55, vol: 0.18 })),
  { id: "sfx-mechanical-18", t: b(T.rush + 0.2), vol: 0.24 },
  { id: "sfx-impact-11", t: b(T.crack + 0.5), vol: 0.26 },
  { id: "sfx-impact-20", t: b(T.fire), vol: 0.32 },
  { id: "sfx-transition-18", t: b(T.nanjing + 0.3), vol: 0.22 },
  { id: "sfx-mechanical-08", t: b(T.ladder + 0.3), vol: 0.22 },
  ...Array.from({ length: 8 }, (_, i) => ({ id: "sfx-ui-13", t: b(T.alarmsAge + 0.5) + i * 0.22, vol: 0.06 })),
  { id: "sfx-impact-16", t: b(T.quote + 0.6), vol: 0.22 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-mechanical-14", t: b(T.ageing + 0.2) + i * 0.48, vol: 0.08 })),
  { id: "sfx-transition-05", t: b(T.lifts + 0.2), vol: 0.24 },
  { id: "sfx-impact-20", t: b(T.money), vol: 0.32 },
  ...Array.from({ length: 12 }, (_, i) => ({ id: "sfx-impact-03", t: b(T.fund + 0.25) + i * 0.22, vol: 0.09 + (i % 4) * 0.02 })),
  { id: "sfx-water-10", t: b(T.drain + 0.2), vol: 0.24 },
  { id: "sfx-water-10", t: b(T.drain + 0.9), vol: 0.2 },
  { id: "sfx-transition-08", t: b(T.archive), vol: 0.22 },
  { id: "sfx-impact-20", t: b(T.owners + 0.4), vol: 0.3 },
  ...Array.from({ length: 10 }, (_, i) => ({ id: "sfx-ui-13", t: b(T.vote + 0.6) + i * 0.4, vol: 0.09 })),
  { id: "sfx-notification-18", t: b(T.vote + 2.8), vol: 0.2 },
  { id: "sfx-scifi-17", t: b(T.stop + 0.3), vol: 0.28 },
  { id: "sfx-transition-15", t: b(T.leave), vol: 0.2 },
  ...darkClicks(T.dark[0], T.dark[1], 0.1),
  { id: "sfx-transition-16", t: b(T.climax + 0.2), vol: 0.22 },
  { id: "sfx-transition-16", t: b(T.goodLoop), vol: 0.2 },
  { id: "sfx-mechanical-08", t: b(T.build), vol: 0.26 },
  ...BILLS.map((e) => ({ id: e.k === "all" ? "sfx-impact-19" : "sfx-ui-13", t: billT(e.y), vol: e.k === "all" ? 0.3 : 0.12 })),
  { id: "sfx-transition-07", t: b(T.city2), vol: 0.3 },
  { id: "sfx-impact-20", t: b(T.you + 0.3), vol: 0.26 },
];

export const Film: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const s = worldAt(t);
  const cam = s.cam;
  const musicVol = (f: number) => {
    const tt = f / FPS;
    return 0.92 * interpolate(tt, [b(T.end - 0.2), FILM_FRAMES / FPS], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  };
  const x0 = 120;
  const y0 = 112;
  return (
    <AbsoluteFill style={{ background: "#040508", overflow: "hidden" }}>
      <Audio src={staticFile("music.wav")} volume={musicVol} />
      {SFX.map((x, i) => (
        <Sequence key={i} from={Math.max(0, Math.round(x.t * FPS))} durationInFrames={90} layout="none">
          <Audio src={staticFile(`sfx/${x.id}.wav`)} volume={x.vol} />
        </Sequence>
      ))}
      <World s={s} />

      {/* ---------- 0 hook: the lights go out from the top ---------- */}
      <Scrim at={0} out={b(T.hookX)} kind="tl" k={0.5} />
      <At x={x0} y={y0}>
        <Line at={0.2} out={b(T.hookX + 0.1)} size={98} serif weight={900} stagger={0.03} parts={["高层住宅，几十年后"]} />
        <Line at={0.6} out={b(T.hookX + 0.1)} size={98} serif weight={900} stagger={0.03} parts={["会变成", { t: "“贫民窟”", c: R }, "吗？"]} />
      </At>
      <Note at={0.4} out={b(T.hookX)}>示意：一栋普通的 33 层住宅</Note>
      <Scrim at={b(T.hookX + 0.2)} out={b(T.hookOut)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.hookX + 0.2)} out={b(T.hookOut)} size={S2} parts={["去年 3 月，四川广安，一个高层小区。"]} />
        <Line at={b(T.hookX + 0.9)} out={b(T.hookOut)} size={S2} parts={["物业费每平米 ", { t: "8 毛", c: G }, "，只收上来四成。"]} />
        <Line at={b(T.hookX + 1.7)} out={b(T.hookOut)} size={S2} parts={["物业走了，电梯没人维保，", { t: "被责令停用", c: R }, "。"]} />
        <Line at={b(T.hookX + 2.6)} out={b(T.hookOut)} size={S} parts={[{ t: "20 到 30 楼", c: L }, "的人，每天爬楼。"]} />
      </At>
      <Note at={b(T.hookX + 0.2)} out={b(T.hookOut)}>极目新闻 2025-03-20：四川广安市广安区北辰街道一高层小区，物业费每月每平方米 0.8 元，收缴率约 40%</Note>
      <Scrim at={b(T.hookOut + 0.3)} out={b(T.machine + 0.2)} kind="tl" k={0.5} />
      <At x={x0} y={y0}>
        <Line at={b(T.hookOut + 0.3)} out={b(T.machine + 0.1)} size={S} parts={["中国有 ", { t: "102 万栋", c: G }, "高层住宅。"]} />
        <Line at={b(T.hookOut + 0.9)} out={b(T.machine + 0.1)} size={S} parts={["一栋高楼，靠什么活着？"]} />
      </At>
      <Note at={b(T.hookOut + 0.3)} out={b(T.machine)}>约 102.3 万栋，截至 2023 年底（中国消防协会科普教育工作委员会委员许传升，据《中国新闻周刊》）</Note>

      {/* ---------- 1 the machine ---------- */}
      <Scrim at={b(T.machine + 0.3)} out={b(T.walkup)} kind="tc" />
      <At x={960} y={96} align="center">
        <Line at={b(T.machine + 0.4)} out={b(T.machine + 2.0)} size={H} serif weight={800} parts={["剖开看，它是一台", { t: "机器", c: K.cyan }, "。"]} />
        <Line at={b(T.machine + 2.1)} out={b(T.walkup)} size={S2} parts={["电梯送人，水泵送水，消防管网守着整栋楼。"]} />
      </At>
      <Pin cam={cam} at={b(T.machine + 1.0)} out={b(T.walkup - 0.1)} p={[-0.72, 70, 3.4]} lift={26} dx={-120} side="left" text="两部电梯" color={K.cyan} size={36} />
      <Pin cam={cam} at={b(T.machine + 1.4)} out={b(T.walkup - 0.1)} p={[-16, 2.5, -2]} lift={60} dx={-90} side="left" text="水泵房" color={K.water} size={36} />
      <Pin cam={cam} at={b(T.machine + 1.7)} out={b(T.walkup - 0.1)} p={[-14, 103, -2]} lift={30} dx={-90} side="left" text="楼顶水箱" color={K.water} size={36} />
      <Pin cam={cam} at={b(T.machine + 2.0)} out={b(T.walkup - 0.1)} p={[16, 60, -2]} lift={30} dx={110} side="right" text="消防管网" color={R} size={36} />
      <Scrim at={b(T.cutPower)} out={b(T.village - 0.2)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.cutPower + 0.1)} out={b(T.cutPower + 2.0)} size={S} parts={[{ t: "6 层", c: L }, "的楼，电梯停了，"]} />
        <Line at={b(T.cutPower + 0.4)} out={b(T.cutPower + 2.0)} size={S} parts={["还能爬。"]} />
        <Line at={b(T.cutPower + 0.8)} out={b(T.cutPower + 2.0)} size={S} parts={[{ t: "33 层", c: L }, "的楼，电梯一停，"]} />
        <Line at={b(T.cutPower + 1.3)} out={b(T.cutPower + 2.0)} size={S} parts={["高处的家就", { t: "回不去了", c: R }, "。"]} />
        <Line at={b(T.cutPower + 2.1)} out={b(T.village - 0.2)} size={H * 0.86} serif weight={800} parts={["楼越高，"]} />
        <Line at={b(T.cutPower + 2.4)} out={b(T.village - 0.2)} size={H * 0.86} serif weight={800} parts={["人越离不开这台", { t: "机器", c: K.cyan }, "。"]} />
      </At>

      {/* ---------- 2 a village stood on end ---------- */}
      <Scrim at={b(T.village + 0.4)} out={b(T.noise)} kind="tc" />
      <At x={960} y={96} align="center">
        <Line at={b(T.village + 0.5)} out={b(T.noise - 0.1)} size={H} serif weight={800} parts={["它也是一座", { t: "竖起来的村子", c: L }, "。"]} />
        <Line at={b(T.village + 1.3)} out={b(T.noise - 0.1)} size={S2} parts={["一百多户，共用电梯、水管、墙和楼板。"]} />
      </At>
      <Scrim at={b(T.noise)} out={b(T.crack)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.noise + 0.1)} out={b(T.rush - 0.1)} size={S} parts={["一户装修，"]} />
        <Line at={b(T.noise + 0.4)} out={b(T.rush - 0.1)} size={S} parts={[{ t: "整栋楼", c: R }, "都听得见。"]} />
        <Line at={b(T.rush + 0.1)} out={b(T.crack - 0.1)} size={S2} parts={["早高峰，三百多人，"]} />
        <Line at={b(T.rush + 0.5)} out={b(T.crack - 0.1)} size={S2} parts={["等 ", { t: "2 部电梯", c: K.cyan }, "。"]} />
      </At>
      <NoiseRings cam={cam} at={b(T.noise)} out={b(T.rush - 0.1)} i={NOISE_SRC} />
      <RushCounter at={b(T.rush + 0.2)} out={b(T.crack - 0.1)} />
      <Note at={b(T.rush + 0.2)} out={b(T.crack - 0.1)}>示意：128 户 × 2.62 人（第七次全国人口普查家庭户规模）</Note>
      <Scrim at={b(T.crack + 0.1)} out={b(T.fire)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.crack + 0.2)} out={b(T.fire)} size={S2} parts={["2023 年 4 月，哈尔滨，"]} />
        <Line at={b(T.crack + 0.5)} out={b(T.fire)} size={S2} parts={["一栋 31 层的楼："]} />
        <Line at={b(T.crack + 0.8)} out={b(T.fire)} size={S2} parts={["3 楼一户私拆", { t: "承重墙", c: R }, "，"]} />
        <Line at={b(T.crack + 1.3)} out={b(T.fire)} size={S2} parts={["裂缝一直爬到 21 楼，"]} />
        <Line at={b(T.crack + 1.8)} out={b(T.fire)} size={S} parts={[{ t: "200 多户", c: R }, "连夜撤离。"]} />
      </At>
      <Crack cam={cam} at={b(T.crack + 0.7)} out={b(T.fire)} from={3} to={21} run={[b(T.crack + 0.8), b(T.crack + 1.8)]} />
      <Note at={b(T.crack + 0.2)} out={b(T.fire)}>中新网 2023-05-07：哈尔滨松北区利民学苑小区 B 栋 · 示意</Note>

      {/* ---------- 3 fire ---------- */}
      <Scrim at={b(T.fire + 0.1)} out={b(T.nanjing)} kind="tc" k={0.7} />
      <At x={960} y={110} align="center">
        <Line at={b(T.fire + 0.2)} out={b(T.nanjing - 0.1)} size={H * 1.06} serif weight={900} parts={["高楼最怕的，是", { t: "火", c: R }, "。"]} />
        <Line at={b(T.hk)} out={b(T.nanjing - 0.1)} size={S2} parts={["2025 年 11 月，香港宏福苑大火，", { t: "168 人", c: R }, "遇难。"]} />
      </At>
      <Note at={b(T.hk)} out={b(T.nanjing - 0.1)}>香港特区政府保安局 2026-01-15：遇难者 168 人</Note>
      <Scrim at={b(T.nanjing)} out={b(T.ladder)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.nanjing + 0.1)} out={b(T.ladder - 0.1)} size={S} parts={["火和烟，都往", { t: "上", c: R }, "走。"]} />
        <Line at={b(T.nanjing + 0.9)} out={b(T.ladder - 0.1)} size={S2} parts={["2024 年 2 月，南京明尚西苑："]} />
        <Line at={b(T.nanjing + 1.4)} out={b(T.ladder - 0.1)} size={S2} parts={["架空层一辆电动车起火，"]} />
        <Line at={b(T.nanjing + 1.9)} out={b(T.ladder - 0.1)} size={S2} parts={["火和烟顺着天井往上窜，"]} />
        <Line at={b(T.nanjing + 2.3)} out={b(T.ladder - 0.1)} size={S} parts={[{ t: "15 人", c: R }, "遇难。"]} />
      </At>
      <Note at={b(T.nanjing + 0.9)} out={b(T.ladder - 0.1)}>南京“2·23”火灾调查报告：违规改装电动自行车锂电池热失控起火，烟囱效应下火焰和烟气突破天井内住户外窗 · 示意</Note>
      <Scrim at={b(T.ladder)} out={b(T.fireSys)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.ladder + 0.2)} out={b(T.fireSys - 0.1)} size={S} parts={["大多数城市的云梯，"]} />
        <Line at={b(T.ladder + 0.6)} out={b(T.fireSys - 0.1)} size={S} parts={["只够到 ", { t: "50 米", c: R }, "左右，十六七层。"]} />
        <Line at={b(T.ladder + 1.3)} out={b(T.fireSys - 0.1)} size={S2} parts={["再往上，只能靠楼自己的消防。"]} />
      </At>
      <Pin cam={cam} at={b(T.ladder + 1.0)} out={b(T.fireSys)} p={[-15, 50, 8.5]} lift={0} dot={false} side="right" dx={14} text="50 米" color={R} size={42} />
      <Note at={b(T.ladder + 0.2)} out={b(T.fireSys - 0.1)}>第一财经：消防云梯有高度限制，通常在 50 米左右</Note>
      <Scrim at={b(T.fireSys)} out={b(T.shanghai)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.fireSys + 0.1)} out={b(T.alarmsAge - 0.1)} size={S2} parts={["报警器、消火栓、"]} />
        <Line at={b(T.fireSys + 0.3)} out={b(T.alarmsAge - 0.1)} size={S2} parts={["消防水泵、防烟楼梯……"]} />
        <Line at={b(T.fireSys + 0.8)} out={b(T.alarmsAge - 0.1)} size={S} parts={["平时用不上，"]} />
        <Line at={b(T.fireSys + 1.1)} out={b(T.alarmsAge - 0.1)} size={S} parts={["关键时刻一样都不能坏。"]} />
        <Line at={b(T.alarmsAge)} out={b(T.shanghai - 0.1)} size={S} parts={["可它们也会老："]} />
        <Line at={b(T.alarmsAge + 0.5)} out={b(T.shanghai - 0.1)} size={S} parts={["火灾报警器，"]} />
        <Line at={b(T.alarmsAge + 0.8)} out={b(T.shanghai - 0.1)} size={S} parts={["一般用不过 ", { t: "12 年", c: K.amber }, "。"]} />
      </At>
      <Pin cam={cam} at={b(T.fireSys + 0.3)} out={b(T.alarmsAge)} p={[16, 2.5, -2]} lift={50} dx={110} side="right" text="消防水泵" color={R} size={36} />
      <Note at={b(T.alarmsAge + 0.4)} out={b(T.shanghai - 0.1)}>《火灾探测报警产品的维修保养与报废》GB 29837—2013 第 6.1.1 条（据上海市应急管理局 沪应急函〔2024〕38 号）</Note>
      <At x={960} y={170} align="center">
        <Line at={b(T.shanghai + 0.1)} out={b(T.quote - 0.1)} size={S} parts={["2022 年，上海把全市小区查了一遍："]} />
      </At>
      <ShanghaiDots at={b(T.shanghai + 0.2)} out={b(T.quote - 0.1)} />
      <Note at={b(T.shanghai + 0.2)} out={b(T.quote - 0.1)}>上海市应急管理局 沪应急函〔2024〕38 号：跟踪督改 578 个存在建筑消防设施无法正常启动、自动报警系统无法接收报警信号等较为严重的高层住宅小区</Note>
      <Quote at={b(T.quote)} out={b(T.ageing - 0.1)} lead="修这些设备，卡在哪？上海市应急管理局写道：" parts={["多方沟通难", "维修资金不足", "补缴难"]} src="上海市应急管理局 沪应急函〔2024〕38 号（原文：业主、业委会、物业公司多方主体沟通难度大，专项维修资金不足、补缴难）" />

      {/* ---------- 4 ageing together ---------- */}
      <Scrim at={b(T.ageing)} out={b(T.lifts)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.ageing + 0.1)} out={b(T.lifts - 0.1)} size={S2} parts={["电梯、水泵、管道、外墙、报警器，"]} />
        <Line at={b(T.ageing + 0.7)} out={b(T.lifts - 0.1)} size={S} parts={["用到十几年，"]} />
        <Line at={b(T.ageing + 1.0)} out={b(T.lifts - 0.1)} size={S} parts={["开始一个个", { t: "到期", c: K.amber }, "。"]} />
        <Line at={b(T.ageing + 2.4)} out={b(T.lifts - 0.1)} size={S2} parts={["就连楼本身，"]} />
        <Line at={b(T.ageing + 2.7)} out={b(T.lifts - 0.1)} size={S2} parts={["设计使用年限也是 50 年。"]} />
      </At>
      <YearBadge at={b(T.ageing + 0.2)} out={b(T.lifts - 0.1)} keys={[[b(T.ageing + 0.3), 2010], [b(T.ageing + 3.6), 2030]]} />
      <Note at={b(T.ageing + 2.4)} out={b(T.lifts - 0.1)}>《民用建筑设计统一标准》GB 50352：普通房屋设计使用年限 50 年</Note>
      <Scrim at={b(T.lifts + 0.2)} out={b(T.japan)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.lifts + 0.3)} out={b(T.japan - 0.1)} size={S} parts={["全国的电梯，四台里有三台，"]} />
        <Line at={b(T.lifts + 0.8)} out={b(T.japan - 0.1)} size={S} parts={["是 2014 年以后装的。"]} />
        <Line at={b(T.lifts + 1.5)} out={b(T.japan - 0.1)} size={S} parts={["同一代楼，会", { t: "一起到期", c: K.amber }, "。"]} />
      </At>
      <LiftCount at={b(T.lifts + 0.3)} out={b(T.japan - 0.1)} run={[b(T.lifts + 0.5), b(T.lifts + 1.6)]} />
      <Note at={b(T.lifts + 0.3)} out={b(T.japan - 0.1)}>市场监管总局：2025 年底电梯 1231.59 万台；质检总局：2013 年底 300.93 万台</Note>
      <Japan at={b(T.japan)} out={b(T.money - 0.1)} />
      <Note at={b(T.japan + 0.5)} out={b(T.money - 0.1)}>国土交通省：築 40 年以上の分譲マンション 2023 年末 136.9 万戸，2043 年末推计 463.8 万戸；令和 5 年度マンション総合調査</Note>

      {/* ---------- 5 money ---------- */}
      <Scrim at={b(T.money)} out={b(T.fees)} kind="tc" />
      <At x={960} y={110} align="center">
        <Line at={b(T.money + 0.1)} out={b(T.fees)} size={H} serif weight={800} parts={["养这台机器，钱从", { t: "两个口袋", c: G }, "来。"]} />
      </At>
      <Scrim at={b(T.fees)} out={b(T.unpaid)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.fees + 0.1)} out={b(T.feeCut - 0.1)} size={S} parts={["日常的钱：", { t: "物业费", c: G }, "。"]} />
        <Line at={b(T.feeCut)} out={b(T.unpaid - 0.1)} size={S2} parts={["交房时就定了，很难涨，"]} />
        <Line at={b(T.feeCut + 0.4)} out={b(T.unpaid - 0.1)} size={S2} parts={["这两年还在", { t: "降", c: R }, "："]} />
        <Line at={b(T.feeCut + 0.9)} out={b(T.unpaid - 0.1)} size={S2} parts={["2024 年下半年以来，"]} />
        <Line at={b(T.feeCut + 1.2)} out={b(T.unpaid - 0.1)} size={S2} parts={["光武汉就有近百个小区下调。"]} />
      </At>
      <Budget at={b(T.fees + 0.3)} out={b(T.unpaid - 0.1)} />
      <Note at={b(T.fees + 0.3)} out={b(T.feeCut)}>估算：128 户 × 100 平方米 × 1 元 × 12 个月；南方都市报 2025-04：20 年梯龄的高层电梯年均维保约 3 万元</Note>
      <Note at={b(T.feeCut + 0.9)} out={b(T.unpaid - 0.1)}>界面新闻 2025-03-06：重庆、武汉、南昌、银川等多个城市均有项目物业费下调</Note>
      <Scrim at={b(T.unpaid)} out={b(T.fund)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.unpaid + 0.2)} out={b(T.fund - 0.1)} size={S2} parts={["就算是百强物业，2025 年，"]} />
        <Line at={b(T.unpaid + 0.7)} out={b(T.fund - 0.1)} size={S} parts={["平均", { t: "每 8 户", c: R }, "里，"]} />
        <Line at={b(T.unpaid + 1.0)} out={b(T.fund - 0.1)} size={S} parts={["也有 1 户没交。"]} />
      </At>
      <Note at={b(T.unpaid + 0.2)} out={b(T.fund - 0.1)}>中指研究院《2026 中国物业服务百强企业研究》：2025 年百强企业平均物业费收缴率 87.32% · 示意</Note>
      <Scrim at={b(T.fund)} out={b(T.why)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.fund + 0.1)} out={b(T.drain - 0.1)} size={S} parts={["大修的钱：", { t: "维修资金", c: G }, "，"]} />
        <Line at={b(T.fund + 0.4)} out={b(T.drain - 0.1)} size={S} parts={["买房时交一次。"]} />
        <Line at={b(T.fund + 0.8)} out={b(T.drain - 0.1)} size={S2} parts={["南京的高层，每平米 120 元；"]} />
        <Line at={b(T.fund + 1.3)} out={b(T.drain - 0.1)} size={S2} parts={["一栋楼约 150 万，要管几十年。"]} />
        <Line at={b(T.drain)} out={b(T.jpFund - 0.1)} size={S} parts={["换一部电梯，就要", { t: "几十万", c: R }, "；"]} />
        <Line at={b(T.drain + 0.6)} out={b(T.jpFund - 0.1)} size={S2} parts={["外墙、水管、消防，排着队。"]} />
        <Line at={b(T.refill)} out={b(T.why - 0.1)} size={S} parts={["余额不足三成，"]} />
        <Line at={b(T.refill + 0.3)} out={b(T.why - 0.1)} size={S} parts={["按规定要续交。"]} />
        <Line at={b(T.refill + 0.7)} out={b(T.why - 0.1)} size={S} parts={["续交，要大家", { t: "重新点头", c: G }, "。"]} />
      </At>
      <Pin cam={cam} at={b(T.fund + 0.5)} out={b(T.jpFund)} p={[8.5, 18, 34]} lift={40} dx={90} side="right" text="维修资金" color={G} size={38} />
      <Note at={b(T.fund + 0.8)} out={b(T.drain - 0.1)}>估算：128 户 × 100 平方米 × 120 元（南京高层首期标准，宁房物字〔2017〕159 号）</Note>
      <Note at={b(T.drain)} out={b(T.jpFund - 0.1)}>南方都市报 2025-04：30 层电梯安装约 10–30 万元，梯价另计</Note>
      <JapanFund at={b(T.jpFund)} out={b(T.refill - 0.1)} />
      <Note at={b(T.jpFund + 0.4)} out={b(T.refill - 0.1)}>国土交通省《マンションの修繕積立金に関するガイドライン》（2021 年修订）：20 层以上计划期平均 338 日元/平方米·月，按 1 日元≈0.047 元折算；令和 5 年度マンション総合調査：36.6% 的管理组合积立金低于计划</Note>
      <Note at={b(T.refill)} out={b(T.why - 0.1)}>各地住宅专项维修资金管理办法：分户账余额不足首期交存额 30% 时，应当及时续交</Note>

      {/* ---------- 6 how many owners ---------- */}
      <At x={960} y={430} align="center">
        <Line at={b(T.why + 0.1)} out={b(T.archive - 0.1)} size={H * 0.92} serif weight={800} parts={["同样是老高楼，"]} />
        <Line at={b(T.why + 0.5)} out={b(T.archive - 0.1)} size={H * 0.92} serif weight={800} parts={["为什么有的", { t: "修得动", c: G }, "，有的修不动？"]} />
      </At>
      <Archive at={b(T.archive)} out={b(T.owners)} />
      <Note at={b(T.archive + 0.5)} out={b(T.owners)}>新京报 2025-01-05、01-06：《北京三大老高层住宅“探梯”》《探访北京“现役最老”高层电梯》；朝阳区亚运村街道 2024-12 公开回复</Note>
      <Scrim at={b(T.owners)} out={b(T.vote)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.owners + 0.2)} out={b(T.vote - 0.1)} size={S2} parts={["1998 年房改以后，"]} />
        <Line at={b(T.owners + 0.5)} out={b(T.vote - 0.1)} size={S2} parts={["房子一套套卖给了个人。"]} />
        <Line at={b(T.owners + 1.0)} out={b(T.vote - 0.1)} size={S} parts={["一栋 33 层的楼，"]} />
        <Line at={b(T.owners + 1.3)} out={b(T.vote - 0.1)} size={S} parts={["有", { t: "一百多个主人", c: G }, "。"]} />
      </At>
      <Scrim at={b(T.vote)} out={b(T.stop)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.vote + 0.1)} out={b(T.stop - 0.1)} size={S2} parts={["要再凑钱，"]} />
        <Line at={b(T.vote + 0.3)} out={b(T.stop - 0.1)} size={S2} parts={["参与表决的人里，"]} />
        <Line at={b(T.vote + 0.6)} out={b(T.stop - 0.1)} size={S2} parts={["得", { t: "四分之三", c: G }, "点头。"]} />
        <Line at={b(T.vote + 3.0)} out={b(T.stop - 0.1)} size={S2} parts={["只要四分之一多一点的人"]} />
        <Line at={b(T.vote + 3.3)} out={b(T.stop - 0.1)} size={S2} parts={["摇头，钱就", { t: "凑不起来", c: R }, "。"]} />
      </At>
      <Pin cam={cam} at={b(T.vote + 0.7)} out={b(T.vote + 2.9)} p={[-16.9, yf(1), 7]} lift={10} dx={-80} side="left" dot={false} text="2 楼：“我走楼梯。”" color={R} size={34} />
      <Pin cam={cam} at={b(T.vote + 1.1)} out={b(T.vote + 2.9)} p={[16.9, yf(5), 7]} lift={10} dx={80} side="right" dot={false} text="6 楼：“房子租出去了。”" color="#cfe0ff" size={34} />
      <Pin cam={cam} at={b(T.vote + 1.5)} out={b(T.vote + 2.9)} p={[-16.9, yf(9), 7]} lift={10} dx={-80} side="left" dot={false} text="10 楼：“今年没了工作。”" color={K.amber} size={34} />
      <Pin cam={cam} at={b(T.vote + 1.9)} out={b(T.vote + 2.9)} p={[16.9, yf(27), 7]} lift={10} dx={80} side="right" dot={false} text="28 楼：“反正要卖了。”" color={K.grey} size={34} />
      <Tally at={b(T.vote + 0.6)} out={b(T.stop - 0.1)} />
      <Note at={b(T.vote + 0.1)} out={b(T.stop - 0.1)}>《民法典》第 278 条：筹集维修资金，须经参与表决的专有部分面积、人数均四分之三以上的业主同意 · 住户理由为示意</Note>
      <Scrim at={b(T.stop)} out={b(T.exodus)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.stop + 0.1)} out={b(T.exodus - 0.1)} size={S} parts={["钱凑不齐，物业撤场；"]} />
        <Line at={b(T.stop + 0.6)} out={b(T.exodus - 0.1)} size={S} parts={["电梯没人维保，就得", { t: "停", c: R }, "。"]} />
        <Line at={b(T.stop + 1.4)} out={b(T.exodus - 0.1)} size={S2} parts={["广安的电梯，就是这样停的。"]} />
      </At>
      <Scrim at={b(T.exodus)} out={b(T.leave)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.exodus + 0.1)} out={b(T.leave - 0.1)} size={S} parts={["这不只发生在老楼。"]} />
      </At>
      <ExodusGrid at={b(T.exodus + 0.2)} out={b(T.leave - 0.1)} />
      <Note at={b(T.exodus + 0.2)} out={b(T.leave - 0.1)}>中指研究院《2026 中国物业服务百强企业研究报告》（据第一财经 2026-04-28）：监测到住宅物业撤场 212 个，楼龄 5 年以内占 35%</Note>

      {/* ---------- 7 who leaves, and the dark ---------- */}
      <Scrim at={b(T.leave)} out={b(T.ageOwners)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.leave + 0.1)} out={b(T.leave + 2.6)} size={S} parts={["先离开的，"]} />
        <Line at={b(T.leave + 0.4)} out={b(T.leave + 2.6)} size={S} parts={["是", { t: "走得起", c: L }, "的人。"]} />
        <Line at={b(T.leave + 1.0)} out={b(T.leave + 2.6)} size={S2} parts={["房子租出去，再隔成群租。"]} />
        <Line at={b(T.leave + 2.7)} out={b(T.ageOwners - 0.1)} size={S2} parts={["每走一户，"]} />
        <Line at={b(T.leave + 3.0)} out={b(T.ageOwners - 0.1)} size={S2} parts={["楼里就少一个愿意掏钱的人。"]} />
        <Line at={b(T.leave + 3.7)} out={b(T.ageOwners - 0.1)} size={S2} parts={["留下的，往往最", { t: "掏不起钱", c: R }, "。"]} />
      </At>
      <PassLegend at={b(T.leave + 0.3)} out={b(T.ageOwners - 0.1)} />
      <Scrim at={b(T.ageOwners)} out={b(T.births)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.ageOwners + 0.1)} out={b(T.births - 0.1)} size={S} parts={["人也在和楼", { t: "一起老", c: K.amber }, "："]} />
        <Line at={b(T.ageOwners + 0.7)} out={b(T.births - 0.1)} size={S2} parts={["第一次买房，平均 29.5 岁；"]} />
        <Line at={b(T.ageOwners + 1.2)} out={b(T.births - 0.1)} size={S2} parts={["楼 40 岁那年，他们快 70 了。"]} />
      </At>
      <AgeCounter at={b(T.ageOwners + 0.2)} out={b(T.births - 0.1)} run={[b(T.ageOwners + 0.6), b(T.ageOwners + 2.8)]} />
      <Note at={b(T.ageOwners + 0.2)} out={b(T.births - 0.1)}>贝壳研究院 2018 年全国购房调查：购房者平均年龄 29.5 岁</Note>
      <At x={300} y={300}>
        <Line at={b(T.births + 0.1)} out={b(T.climax - 0.1)} size={H * 0.9} serif weight={800} parts={["接下一棒的人呢？"]} />
      </At>
      <Births at={b(T.births + 0.3)} out={b(T.climax - 0.1)} />
      <Note at={b(T.births + 0.3)} out={b(T.climax - 0.1)}>《中国统计年鉴》：1990 年出生率 21.06‰（约 11.4 亿人，推算约 2400 万）；国家统计局：2025 年出生 792 万</Note>
      {/* ---------- 7b the circle: the tower spins down ---------- */}
      <At x={x0} y={y0}>
        <Line at={b(T.climax + 0.2)} out={b(T.darkLines - 0.1)} size={S} parts={["钱越来越少，机器越来越老，"]} />
        <Line at={b(T.climax + 0.6)} out={b(T.darkLines - 0.1)} size={S} parts={["楼掉进一个", { t: "越转越快", c: R }, "的循环："]} />
      </At>
      <Loop at={b(T.climax + 0.4)} out={b(T.darkLines)} cx={560} cy={650} r={235} color={R} center="越转越快" nodes={["账单来了", "钱凑不齐", "修不好", "能走的先走", "掏钱的人更少"]} turns={2.4} size={36} />
      <Scrim at={b(T.darkLines)} out={b(T.answer)} kind="tl" />
      <At x={x0} y={y0}>
        <Line at={b(T.darkLines + 0.1)} out={b(T.answer - 0.1)} size={S} parts={["电梯一停，"]} />
        <Line at={b(T.darkLines + 0.5)} out={b(T.answer - 0.1)} size={S} parts={["高处的家，", { t: "一层一层空下去", c: K.grey }, "，"]} />
        <Line at={b(T.darkLines + 1.9)} out={b(T.answer - 0.1)} size={S} parts={["最后只剩下，"]} />
        <Line at={b(T.darkLines + 2.2)} out={b(T.answer - 0.1)} size={S} parts={[{ t: "爬得动的那几层", c: L }, "。"]} />
      </At>

      {/* ---------- 7c the answer ---------- */}
      <Scrim at={b(T.answer)} out={b(T.build)} kind="tc" />
      <At x={960} y={110} align="center">
        <Line at={b(T.answer + 0.2)} out={b(T.goodLoop - 0.1)} size={H} serif weight={800} parts={["所以，会变成“贫民窟”吗？"]} />
        <Line at={b(T.goodLoop + 0.1)} out={b(T.emptyLine - 0.1)} size={S2} parts={["钱够、人齐的楼，同一个循环会", { t: "反过来转", c: G }, "："]} />
        <Line at={b(T.emptyLine)} out={b(T.build - 0.1)} size={S} parts={["人一直在走的地方，"]} />
        <Line at={b(T.emptyLine + 0.4)} out={b(T.build - 0.1)} size={S} parts={["楼会", { t: "一层一层空下去", c: K.grey }, "。"]} />
      </At>
      <Loop at={b(T.goodLoop + 0.2)} out={b(T.emptyLine)} cx={960} cy={585} r={245} color={G} center="反过来转" nodes={["钱凑得齐", "修得好", "住得舒服", "人愿意留下", "愿意掏钱的人多"]} turns={1.6} size={38} />
      <At x={960} y={890} align="center">
        <Line at={b(T.goodLoop + 1.2)} out={b(T.emptyLine - 0.1)} size={44} parts={["北京前三门的高楼快 50 岁，电梯还在换新。"]} />
      </At>
      <Note at={b(T.goodLoop + 1.2)} out={b(T.emptyLine - 0.1)}>新京报 2025-01-06：前三门住宅楼 2023 年完成 11 部电梯的更换和大修，费用由公共维修资金和产权方首开集团承担</Note>
      <Note at={b(T.emptyLine)} out={b(T.build - 0.1)}>城市为示意</Note>

      {/* ---------- 8 three years to build, fifty to keep ---------- */}
      <Scrim at={b(T.build)} out={b(T.city2)} kind="tc" k={0.55} />
      <At x={960} y={96} align="center">
        <Line at={b(T.build + 0.1)} out={b(T.city2 - 0.1)} size={96} serif weight={900} stagger={0.06} parts={["盖一栋楼，三年。"]} />
      </At>
      <At x={960} y={214} align="center">
        <Line at={b(T.keep)} out={b(T.city2 - 0.1)} size={96} serif weight={900} stagger={0.06} parts={["养一栋楼，", { t: "五十年", c: G }, "。"]} />
      </At>
      <YearBadge at={b(T.keep)} out={b(T.city2)} base={2013} keys={[[b(T.years[0]), 2013], [b(T.years[1]), 2063]]} style={{ bottom: undefined, top: 400 }} />
      <BillRibbon at={b(T.years[0] - 0.2)} out={b(T.city2 + 0.2)} bills={BILLS} yearAt={(tt) => lerp(2013, 2063, ramp(tt, b(T.years[0]), b(T.years[1]), (x) => x))} />
      <Note at={b(T.years[0])} out={b(T.city2)}>示意：电梯约 15 年一轮（住房城乡建设部、财政部 2015）；火灾报警器一般不超过 12 年（GB 29837—2013）；屋面防水设计工作年限不低于 20 年（GB 55030—2022）；设计使用年限 50 年（GB 50352）</Note>
      <Scrim at={b(T.city2 + 0.3)} out={b(T.hundred)} kind="tc" />
      <At x={960} y={130} align="center">
        <Line at={b(T.city2 + 0.4)} out={b(T.hundred - 0.1)} size={S} parts={["全国 ", { t: "102 万栋", c: G }, "高层住宅，"]} />
        <Line at={b(T.city2 + 0.9)} out={b(T.hundred - 0.1)} size={S} parts={["每一栋，都要这样养五十年。"]} />
      </At>
      <At x={960} y={130} align="center" gap={12}>
        <Line at={b(T.hundred + 0.1)} out={b(T.you - 0.1)} size={76} serif weight={800} parts={["楼能不能老得体面，"]} />
        <Line at={b(T.hundred + 0.7)} out={b(T.you - 0.1)} size={76} serif weight={800} parts={["看楼里的一百多户，能不能", { t: "一起付下去", c: G }, "。"]} />
      </At>
      <Scrim at={b(T.you + 0.2)} out={b(T.sources)} kind="tc" />
      <At x={960} y={110} align="center">
        <Line at={b(T.you + 0.3)} out={b(T.sources)} size={100} serif weight={900} parts={["你，就是其中", { t: "一户", c: G }, "。"]} />
      </At>
      <YouRing cam={cam} at={b(T.you + 0.8)} out={b(T.sources)} i={YOU} />

      <Sources at={b(T.sources)} out={b(T.end + 0.1)} />
      <EndCard at={b(T.end)} />
      <BrandMark o={1 - ramp(t, b(T.end - 0.2), b(T.end + 0.1))} />
    </AbsoluteFill>
  );
};
