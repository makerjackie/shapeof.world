// 《AI 的真实价格 · 第 1 集 · 文字 AI》 v23: v22 rebuilt as a chain of reversals after the user found it flat and slow
// ("冲击跟转折不够…不断的抛出一些反常识的结论"). Every section states a conclusion, at once challenges it, and lands a
// counterintuitive answer as its own small climax. One price chart is the hub: it re-sorts in place from 标价 to 按量
// to 包月用满, and the conclusions printed under it are struck through and corrected as the film goes. The formula,
// the trial-card and reseller section and the how-to-choose list are gone. Same editorial sheet and camera as v20/v22.
// Music: 千年之后 track bars 4–16, then 32 to the end (tools/music-edit23.sh), so its lift lands on 真的如此吗？ (film
// bar 4), the return after the breakdown on the plan reveal (28) and the peak on the token boom (44).
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { bf, sec } from "../v10/bars";
import { clamp01, Grain, useFonts } from "../v15/kit";
import { Chart, Draw, EIO, EO, FAINT, FONT, GOLD, INK, lerp, MONO, MUTE, P, ramp, RED, rgba, Row, Rule, SERIF, Stamp, Strike } from "../v20/kit";

const F = sec; // film bar → seconds
const LAST = 59.2;
export const FILM23_FRAMES = bf(LAST);

// ---------- numbers (2026-10-30, SCRIPT.md; yuan at 6.72; per task = AA Intelligence Index v5 Cost per Task) ----------
const BOOK: Row[] = [
  { key: "deepseek", name: "DeepSeek", model: "V4.1 Flash", value: 8, label: "¥8", hi: "gold" },
  { key: "glm", name: "智谱", model: "GLM-5.3", value: 30, label: "¥30" },
  { key: "kimi", name: "Kimi", model: "K3.1 Pro", value: 68, label: "¥68" },
  { key: "claude", name: "Claude", model: "Opus 5.5", value: 134, label: "¥134" },
  { key: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", value: 336, label: "¥336", hi: "gold" },
];
const TASK: Row[] = [
  { key: "deepseek", name: "DeepSeek", model: "V4.1 Flash", value: 4.05, label: "¥4.05", hi: "gold" },
  { key: "kimi", name: "Kimi", model: "K3.1 Pro", value: 24.7, label: "¥24.7" },
  { key: "glm", name: "智谱", model: "GLM-5.3", value: 33.7, label: "¥33.7" },
  { key: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", value: 42.0, label: "¥42.0" },
  { key: "claude", name: "Claude", model: "Opus 5.5", value: 67.4, label: "¥67.4", hi: "gold" },
];
const PLAN: Row[] = [
  { key: "claude", name: "Claude", model: "包月用满 · 59 倍", value: 1.14, label: "¥1.14", hi: "gold" },
  { key: "glm", name: "智谱", model: "包月用满 · 13 倍", value: 2.59, label: "¥2.59" },
  { key: "chatgpt", name: "ChatGPT", model: "包月用满 · 15 倍", value: 2.8, label: "¥2.80" },
  { key: "deepseek", name: "DeepSeek", model: "没有包月 · 按量", value: 4.05, label: "¥4.05", hi: "gold" },
  { key: "kimi", name: "Kimi", model: "包月用满 · 约 2.8 倍", value: 8.84, label: "¥8.84" },
];
// the same exam's scores (Intelligence Index v5, out of 100), highest first
const IQ: Row[] = [
  { key: "gemini", name: "Gemini", model: "4 Carbon · 尚未公开发售", value: 59, label: "59", hi: "dim" },
  { key: "claude", name: "Claude", model: "Opus 5.5", value: 58, label: "58", hi: "gold" },
  { key: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", value: 57, label: "57" },
  { key: "kimi", name: "Kimi", model: "K3.1 Pro", value: 46, label: "46" },
  { key: "deepseek", name: "DeepSeek", model: "V4.1 Flash", value: 32, label: "32", hi: "gold" },
  { key: "glm", name: "智谱", model: "GLM-5.3", value: 32, label: "32" },
];

// ---------- beats (seconds) ----------
const q1 = F(-0.14);
const DS = F(1.3);
const BIG = F(2.1);
const GAP = F(2.9);
const ASK = F(4.0); // 真的如此吗？ on the music's lift
const TITLE = F(4.95);
const STRIKE = F(5.3);
const SWAP = F(5.55);
const SUB = F(5.85);
const R1 = { a: F(6.65), b: F(7.1), morph: F(7.75), st: F(8.95), c: F(9.4), note: F(9.9) };
const R2 = { q: F(12.1), sub: F(12.6), head: F(13.1), chart: F(13.3), smart: F(15.2), old: F(16.0), strike: F(16.75), nw: F(16.9), twelve: F(17.2), note: F(17.7) };
const R3 = { a: F(19.4), box: F(19.85), who: F(20.0), price: F(20.2), use: F(21.0), count: F(21.4), x59: F(22.2), table: F(23.0), tnote: F(24.3), setup: F(25.6), morph: F(26.6), strike: F(27.5), reveal: F(28.0), note: F(28.7), tail: F(29.15) };
const R4 = { q: F(30.45), grid: F(30.9), five: F(31.4), pct: F(32.25), slam: F(32.75), note: F(33.2) };
const R5 = { a: F(34.15), caret: F(34.45), sub: F(34.85), head: F(35.45), bills: F(35.9), b: F(37.75), slam: F(38.15), note: F(38.7) };
const R6 = { a: F(39.95), sub: F(40.35), rows: F(40.7), line: F(42.25), note: F(42.6), boom: F(43.15), bsub: F(43.35), b1000: F(43.45), bstrike: F(43.78), b140: F(44.0), grew: F(44.5), bnote: F(44.8), h1: F(46.8), h2: F(47.15), hour: F(48.0) };
const END = { e1: F(50.0), e2: F(52.0), card: F(54.1), brand: F(56.3) };

// ---------- the camera: [time, cx, cy, scale, rotateX, rotateZ]; sheet point (cx, cy) at screen centre ----------
type K = [number, number, number, number, number, number];
const CAM: K[] = [
  // the question, then the price chart with a push onto DeepSeek's ¥8
  [0.0, 1050, 780, 1.2, 26, -9],
  [F(1.05), 1150, 840, 1.05, 24, -8],
  [F(1.4), 2420, 640, 1.75, 22, -6],
  [F(1.95), 2470, 655, 1.65, 22, -6],
  [F(2.35), 3020, 900, 0.9, 26, -9],
  [F(3.75), 3050, 890, 0.93, 26, -9],
  // 真的如此吗？, then the title
  [ASK + 0.1, 5450, 600, 1.05, 24, -7],
  [F(4.75), 5470, 620, 1.08, 24, -7],
  [F(5.0), 5500, 1000, 0.95, 24, -7],
  [F(6.3), 5520, 1020, 0.98, 24, -7],
  // reversal 1: the same chart, per task
  [F(6.65), 3000, 560, 0.85, 24, -7],
  [F(7.6), 3010, 580, 0.86, 24, -7],
  [F(7.95), 3020, 830, 0.84, 24, -7],
  [F(9.25), 3030, 850, 0.86, 24, -7],
  [F(9.55), 3020, 960, 0.84, 24, -7],
  [F(11.8), 3040, 980, 0.87, 24, -7],
  // reversal 2: how much smarter
  [F(12.15), 5000, 1560, 1.0, 24, -7],
  [F(13.0), 5020, 1600, 1.0, 24, -7],
  [F(13.55), 5060, 2100, 0.86, 24, -7],
  [F(15.8), 5080, 2140, 0.88, 24, -7],
  [F(16.1), 5000, 2420, 0.92, 24, -8],
  [F(18.95), 5020, 2440, 0.95, 24, -8],
  // reversal 3: plans, then back to the chart for the reveal on the music's return
  [F(19.3), 1150, 1700, 0.9, 22, -6],
  [F(19.8), 1150, 1720, 0.9, 22, -6],
  [F(20.3), 1150, 1880, 0.88, 22, -6],
  [F(22.8), 1170, 1900, 0.9, 22, -6],
  [F(23.15), 1150, 2830, 0.9, 22, -6],
  [F(25.0), 1170, 2850, 0.93, 22, -6],
  [F(25.4), 2980, 1100, 0.72, 24, -7],
  [F(28.9), 2990, 1150, 0.75, 24, -7],
  [F(29.2), 3000, 1450, 0.78, 24, -7],
  [F(30.1), 3010, 1480, 0.8, 24, -7],
  // reversal 4: does the AI company lose money?
  [F(30.45), 3050, 2580, 0.88, 22, -6],
  [F(33.8), 3070, 2600, 0.92, 22, -6],
  // reversal 5: your time
  [F(34.15), 5150, 3400, 0.9, 22, -6],
  [F(35.2), 5160, 3420, 0.9, 22, -6],
  [F(35.6), 5150, 3640, 0.85, 22, -6],
  [F(39.55), 5170, 3660, 0.9, 22, -6],
  // reversal 6: zoom out
  [F(39.95), 7300, 1800, 0.9, 22, -6],
  [F(42.9), 7320, 1820, 0.93, 22, -6],
  [F(43.25), 7300, 2780, 0.85, 22, -6],
  [F(46.3), 7320, 2800, 0.9, 22, -6],
  [F(46.7), 7200, 3650, 0.9, 20, -5],
  [F(49.6), 7220, 3700, 0.98, 20, -5],
  // the ending
  [F(49.95), 7300, 4180, 0.9, 20, -5],
  [F(51.6), 7310, 4200, 0.92, 20, -5],
  [F(51.95), 7250, 4330, 1.0, 20, -5],
  [F(53.9), 7260, 4350, 1.04, 20, -5],
  [F(54.3), 1300, 4050, 0.95, 22, -6],
  [F(55.9), 1300, 4070, 0.97, 22, -6],
  [F(56.3), 2200, 5040, 0.95, 22, -6],
  [F(LAST), 2200, 5040, 1.0, 22, -6],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const u = EIO(clamp01((t - a[0]) / (b[0] - a[0])));
  return { cx: lerp(a[1], b[1], u), cy: lerp(a[2], b[2], u), s: lerp(a[3], b[3], u), rx: lerp(a[4], b[4], u), rz: lerp(a[5], b[5], u) };
};

// stamps and slams knock the camera
const KNOCKS = [q1 + 2.0, GAP + 0.35, ASK + 0.05, SWAP, R1.st, R2.twelve, R3.x59, R3.reveal + 0.25, R4.slam, R5.slam, R6.b140];
const shake = (t: number) => {
  let x = 0;
  let y = 0;
  for (const a of KNOCKS) {
    if (t < a) continue;
    const k = Math.exp(-(t - a) * 16);
    x += 7 * k * Math.sin((t - a) * 95);
    y += 5 * k * Math.cos((t - a) * 83);
  }
  return { x, y };
};

const win = (t: number, a: number, b: number, fi = 0.6, fo = 0.6) => ramp(t, a, a + fi) * (1 - ramp(t, b - fo, b));

const CUES: [string, number, number][] = [
  ["thump", q1 + 0.25, 0.35],
  ["keypress", q1 + 0.9, 0.2],
  ["keypress", q1 + 1.15, 0.2],
  ["keypress", q1 + 1.4, 0.2],
  ["punch", q1 + 2.0, 0.55],
  ["swipe", F(1.05) + 0.05, 0.28],
  ["data", DS + 0.1, 0.14],
  ["swipe", F(1.95) + 0.05, 0.18],
  ["data", BIG, 0.14],
  ["punch", GAP + 0.35, 0.6],
  ["swipe", F(3.75) + 0.05, 0.28],
  ["thump", ASK, 0.5],
  ["punch", ASK + 0.05, 0.45],
  ["swipe", F(4.75) + 0.05, 0.2],
  ["thump", TITLE + 0.05, 0.4],
  ["brush", STRIKE, 0.6],
  ["punch", SWAP, 0.55],
  ["keypress", SUB, 0.2],
  ["swipe", F(6.3) + 0.05, 0.26],
  ["swipe", F(7.6) + 0.05, 0.18],
  ["data", R1.morph, 0.22],
  ["punch", R1.st, 0.55],
  ["swipe", F(11.8) + 0.05, 0.28],
  ["data", R2.chart, 0.14],
  ["brush", R2.strike, 0.4],
  ["punch", R2.twelve, 0.55],
  ["swipe", F(18.95) + 0.05, 0.3],
  ["thump", R3.price, 0.4],
  ["thump", R3.count, 0.45],
  ["punch", R3.x59, 0.6],
  ["swipe", F(22.8) + 0.05, 0.22],
  ["keypress", R3.table + 0.2, 0.16],
  ["swipe", F(25.0) + 0.05, 0.3],
  ["data", R3.morph, 0.22],
  ["brush", R3.strike, 0.45],
  ["thump", R3.reveal, 0.55],
  ["punch", R3.reveal + 0.25, 0.6],
  ["swipe", F(30.1) + 0.05, 0.24],
  ["punch", R4.slam, 0.45],
  ["swipe", F(33.8) + 0.05, 0.24],
  ["brush", R5.caret, 0.4],
  ["data", R5.bills, 0.14],
  ["punch", R5.slam, 0.5],
  ["swipe", F(39.55) + 0.05, 0.3],
  ["swipe", F(42.9) + 0.05, 0.24],
  ["thump", R6.b1000, 0.4],
  ["brush", R6.bstrike, 0.45],
  ["thump", R6.b140, 0.5],
  ["punch", R6.b140 + 0.02, 0.4],
  ["swipe", F(46.3) + 0.05, 0.24],
  ["thump", R6.hour, 0.5],
  ["swipe", F(49.6) + 0.05, 0.22],
  ["swipe", F(51.6) + 0.05, 0.2],
  ["swipe", F(53.9) + 0.05, 0.35],
  ["swipe", F(55.9) + 0.05, 0.24],
];

const TXT =
  "让 AI 写一整套《三体》要多少钱？第一部 三体第二部 黑暗森林第三部 死神永生88 万字各家最强的模型 · 写一整套《三体》大约多少钱 · 单位：元差 42 倍真的如此吗？" +
  "AI 的标价真实价格第 1 集 · 文字 AI一整套《三体》约 88 万字，按约 100 万 token 估算（各家分词不同）价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月" +
  "可 AI 干活，按事算同一道难题，有的 AI 想得久、写得长，花得就多做一道难题实际花多少按量付钱差 17 倍按量付钱，Claude 反而成了最贵的" +
  "按量付钱：开发者和 AI 工具调用模型的价格；聊天 App 另算 · 花费：Artificial Analysis 智能指数 v5 实测，各模型开到最强档" +
  "贵 17 倍，聪明多少？AI 智力榜刚换了新考卷：六成考题从没公开过真实智力排行 · 满分 100Gemini4 Carbon尚未公开发售贵的，确实更聪明旧考卷上，最强的开源模型只落后第一名 3 分换上新考卷：12 分" +
  "Artificial Analysis 智能指数 v5（2026-10-27 发布，数据取 10-30）· Gemini 4 Carbon 10-28 登顶，尚未公开发售" +
  "可天天用 AI 干活的人，大多是包月的Claude 最贵的包月$200 / 月每周都用到上限，能用掉$11,700 的量59 倍其他几家，也这么算 · 包月最多能用掉几倍同样 $200最多 13 倍约 2.8 倍网友实测没有包月" +
  "Claude、ChatGPT：SemiAnalysis 同一方法测算；智谱：官方档位折算；Kimi：科技博主实测（2026-10-24）包月用满 · 做一道难题花多少包月用满 ＝ 按量花费 ÷ 包月最多能用掉的倍数；DeepSeek 没有包月，按量算 · 2026 年 10 月的价格，排名每个月都在变" +
  "又贵又聪明的 Claude，用满包月反而比 DeepSeek 还便宜最便宜难怪有人每个月花 $200，还说这是最便宜的 AI" +
  "AI 公司不亏吗？会碰到每周上限的人，不到 5%要是一个月只用了上限的 1.7%，包月就比按量付钱还贵Anthropic，2025 年 7 月宣布每周上限时的说明；1.7% ＝ 1 ÷ 59" +
  "账单上，还漏了一行AI 做完，你要检查；做错了，返工做对一道难题，一共花多少？（每次检查 5 分钟，时薪按全国平均 ¥62 算）DeepSeek · 按量付钱（32 分，平均要试 3.1 次才做对）Claude · 包月用满（58 分，平均试 1.7 次）AI 费你检查分钟约" +
  "两张账单上，最贵的一行，都是你的时间做对比例按智力分估算（满分 100）；时薪：国家统计局 2025 年城镇非私营单位平均工资" +
  "把时间拉回三年前GPT-4 水平的 AI，写一整套《三体》（当年最强的 GPT-4）同样水平的 AI，每年便宜约 13 倍Epoch AI，2026-09；GPT-4 2023 年输出价每百万 token $60" +
  "可全世界用得更多了中国每天用掉的 token1,000 亿140 万亿两年涨了 1,000 多倍国家数据局：2024 年初 → 2026 年 3 月可有一样东西，不会每年便宜 13 倍你的一小时" +
  "AI 越便宜，账单上越贵的，是你那你的一小时，值多少？AI 的真实价格 · 第 1 集 完下一集：一张 AI 图，到底多少钱？信息来源世界的形状看见世界如何运行 MakerJackie" +
  "价格：OpenAI、Anthropic、Moonshot、智谱、DeepSeek 官网（2026 年 10 月）智力分、做一道难题的花费：包月额度：SemiAnalysis（2026-10-05）；Kimi 为科技博主实测；智谱为官方档位折算" +
  "每周上限：Anthropic（2025-07-28）价格趋势：Epoch AI《The plunging price of thought》（2026-09-22）token 用量：国家数据局（2026-03-24 国新办发布会）时薪：人民币按 6.72 折算" +
  "智谱DeepSeekClaudeChatGPTKimiV4.1 FlashGLM-5.3K3.1 ProOpus 5.5GPT-6 Astra¥$0123456789.,%—·（）：；→∧";

export const Film23: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  useFonts([`700 300px ${SERIF}`, `900 90px ${FONT}`, `700 40px ${FONT}`, `700 60px ${MONO}`, `500 24px ${FONT}`], TXT);

  const c = camAt(t);
  const p = camAt(Math.max(0, t - 1 / 30));
  const sh = shake(t);
  const vx = Math.abs(c.cx - p.cx) * c.s;
  const vy = Math.abs(c.cy - p.cy) * c.s * 0.8;
  const bx = Math.min(36, vx * 0.42);
  const by = Math.min(28, vy * 0.42);
  const blurOn = bx + by > 0.6;
  // the light narrows on the challenge, the climax and the last question
  const spot = Math.max(win(t, ASK - 0.15, F(6.3)), win(t, R6.hour - 0.3, F(49.9)), win(t, END.e2 - 0.2, F(54.0)));
  const fadeOut = ramp(t, F(LAST - 0.6), F(LAST));

  // only print what the camera can reach; the paper is a window that follows the camera
  const hw = 3600 / c.s;
  const hh = 2700 / c.s;
  const near = (x: number, y: number) => Math.abs(x - c.cx) < hw && Math.abs(y - c.cy) < hh;
  const px0 = Math.floor((c.cx - hw) / 1024) * 1024;
  const py0 = Math.floor((c.cy - hh) / 1024) * 1024;

  return (
    <AbsoluteFill style={{ background: "#05070c", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1-v23.wav")} volume={0.7} />
      {CUES.map(([s, at, v], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(at * 30))} layout="none">
          <Audio src={staticFile(`sfx/${s}.wav`)} volume={v} />
        </Sequence>
      ))}

      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="mblur23" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>

      <AbsoluteFill style={{ filter: blurOn ? "url(#mblur23)" : undefined, opacity: 1 - fadeOut }}>
        <AbsoluteFill style={{ perspective: 1700 }}>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1,
              height: 1,
              transformOrigin: "0 0",
              transform: `translate(${960 + sh.x}px, ${540 + sh.y}px) rotateX(${c.rx}deg) rotateZ(${c.rz}deg) scale(${c.s}) translate(${-c.cx}px, ${-c.cy}px)`,
            }}
          >
            <div style={{ position: "absolute", left: px0, top: py0, width: 2 * hw + 2048, height: 2 * hh + 2048, backgroundImage: `url(${staticFile("paper19.png")})`, backgroundSize: "1024px 1024px" }} />
            {near(1200, 850) && <Block1 t={t} />}
            {near(3000, 1100) && <HubBlock t={t} />}
            {near(5500, 850) && <Ask t={t} />}
            {near(5000, 2200) && <Smart t={t} />}
            {near(1100, 2300) && <Plans t={t} />}
            {near(3000, 2600) && <Catch t={t} />}
            {near(5150, 3600) && <YourTime t={t} />}
            {near(7300, 2600) && <ZoomOut t={t} />}
            {near(7300, 4200) && <Ending t={t} />}
            {near(1300, 4050) && <EndCard t={t} />}
            {near(2200, 5040) && <Brand t={t} />}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 45% 40%, rgba(255,226,180,0.10), rgba(0,0,0,0) 70%)", mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse ${lerp(140, 52, spot)}% ${lerp(130, 48, spot)}% at 50% 50%, rgba(0,0,0,0) 40%, rgba(2,3,6,${0.55 + 0.4 * spot}) 100%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, backdropFilter: "blur(5px)", WebkitMaskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260, backdropFilter: "blur(4px)", WebkitMaskImage: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 46, top: 38, display: "flex", alignItems: "center", gap: 14, opacity: 0.85 * (1 - ramp(t, F(55.9), F(56.3))) }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 46, height: 46 }} />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 27, color: INK, letterSpacing: "0.06em" }}>世界的形状</span>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />
      <Grain frame={frame} amount={0.05} />
    </AbsoluteFill>
  );
};

const H = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: FONT, fontWeight: 900, fontSize: size, ...extra });
const Mono = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, ...extra });
const Note: React.FC<{ t: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ t, at, x, y, children }) => (
  <P t={t} at={at} x={x} y={y} dur={0.6} style={Mono(22, { color: FAINT })}>
    {children}
  </P>
);
/** lifts what was printed off the sheet when it is superseded */
const Until: React.FC<{ t: number; out: number; children: React.ReactNode }> = ({ t, out, children }) => {
  const o = 1 - ramp(t, out, out + 0.3);
  return o <= 0 ? null : <div style={{ position: "absolute", left: 0, top: 0, opacity: o }}>{children}</div>;
};

// ---------- the opening question ----------

const Block1: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={q1} x={560} y={540} style={H(66)}>让 AI 写一整套</P>
    <P t={t} at={q1 + 0.25} x={510} y={610} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 310, lineHeight: "350px" }}>《三体》</P>
    {["第一部 三体", "第二部 黑暗森林", "第三部 死神永生"].map((l, i) => (
      <P key={l} t={t} at={q1 + 0.9 + i * 0.25} x={1650} y={690 + i * 56} dur={0.3} style={Mono(32, { color: MUTE })}>
        {l}
      </P>
    ))}
    <P t={t} at={q1 + 1.25} x={560} y={1000} style={H(96, { color: GOLD })}>要多少钱？</P>
    <Stamp t={t} at={q1 + 2.0} x={1640} y={930} rot={-8} size={74}>88 万字</Stamp>
    <Note t={t} at={q1 + 2.3} x={560} y={1150}>一整套《三体》约 88 万字，按约 100 万 token 估算（各家分词不同）</Note>
  </>
);

// ---------- the hub: one price chart that re-sorts in place ----------

const HX = 2150;
const HY = 625;
const PITCH = 130;
const LEN = 1300;
type State = { at: number; dur: number; rows: Row[]; max: number };
const STATES: State[] = [
  { at: 0, dur: 0, rows: BOOK, max: 336 },
  { at: R1.morph, dur: 1.5, rows: TASK, max: 67.4 },
  { at: R3.morph, dur: 1.8, rows: PLAN, max: 8.84 },
];
const fmt = (v: number, label: string) => {
  const m = /^([^\d]*)([\d.]+)(.*)$/.exec(label);
  if (!m) return label;
  const dec = (m[2].split(".")[1] ?? "").length;
  return m[1] + v.toFixed(dec) + m[3];
};
const mix = (a: string, b: string, u: number) => {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(ch(a, i), ch(b, i), u))).join(",")})`;
};
const TEXT: React.CSSProperties = { position: "absolute", whiteSpace: "nowrap", color: INK, textShadow: "0 0 1px rgba(239,230,212,0.35)" };

const HubChart: React.FC<{ t: number }> = ({ t }) => {
  if (t < STATES[1].at) return <Chart nameDy={-26} t={t} at={BIG} first={DS} x={HX} y={HY} rows={BOOK} max={336} />;
  let s = 1;
  while (s < STATES.length - 1 && t >= STATES[s + 1].at) s++;
  const A = STATES[s - 1];
  const Z = STATES[s];
  // first the values change in place on the old scale, then the scale settles and the rows re-sort
  const u = ramp(t, Z.at, Z.at + Z.dur, (v) => v);
  const uv = EIO(clamp01(u / 0.42));
  const ur = EIO(clamp01((u - 0.42) / 0.58));
  const max = lerp(A.max, Z.max, ur);
  // the rows that travel furthest are drawn on top
  const order = Z.rows.map((rz, iz) => ({ rz, iz, ia: A.rows.findIndex((r) => r.key === rz.key) })).sort((p, q) => Math.abs(p.iz - p.ia) - Math.abs(q.iz - q.ia));
  return (
    <>
      {order.map(({ rz, iz, ia }) => {
        const ra = A.rows[ia];
        // the rows re-sort in a cascade from the top, so the one that lands first leads the eye
        const ry = HY + lerp(ia, iz, EIO(clamp01((u - 0.42 - iz * 0.05) / 0.38))) * PITCH;
        const v = lerp(ra.value, rz.value, uv);
        const w = Math.max(16, (v / max) * LEN);
        const g = lerp(ra.hi === "gold" ? 1 : 0, rz.hi === "gold" ? 1 : 0, uv);
        const label = u >= 1 ? rz.label : fmt(v, rz.label);
        const swapModel = ra.model !== rz.model;
        return (
          <React.Fragment key={rz.key}>
            <div style={{ ...TEXT, left: HX, top: ry - 30, fontFamily: /[一-鿿]/.test(rz.name) ? FONT : MONO, fontWeight: 900, fontSize: 38 }}>{rz.name}</div>
            <div style={{ ...TEXT, left: HX, top: ry + 18, fontFamily: MONO, fontWeight: 700, fontSize: 20, color: FAINT, opacity: swapModel ? 1 - ramp(u, 0, 0.45) : 1 }}>{ra.model}</div>
            {swapModel && <div style={{ ...TEXT, left: HX, top: ry + 18, fontFamily: MONO, fontWeight: 700, fontSize: 20, color: g > 0.5 ? rgba(GOLD, 0.8) : FAINT, opacity: ramp(u, 0.55, 1) }}>{rz.model}</div>}
            <div style={{ position: "absolute", left: HX + 270, top: ry, width: w, height: 66, background: "rgba(239,230,212,0.5)" }} />
            <div style={{ position: "absolute", left: HX + 270, top: ry, width: w, height: 66, background: GOLD, opacity: g, boxShadow: `0 0 30px ${rgba(GOLD, 0.25 * g)}` }} />
            <div style={{ ...TEXT, left: HX + 270 + w + 26, top: ry - 6, fontFamily: MONO, fontWeight: 700, fontSize: 66, color: mix(INK, GOLD, g) }}>{label}</div>
          </React.Fragment>
        );
      })}
    </>
  );
};

const HEAD = Mono(30, { color: MUTE, letterSpacing: "0.04em" });
const HubBlock: React.FC<{ t: number }> = ({ t }) => (
  <>
    {/* reversal 1's question sits above the chart */}
    <P t={t} at={R1.a} x={HX} y={180} style={H(96)}>可 AI 干活，按事算</P>
    <P t={t} at={R1.b} x={HX} y={305} style={H(54, { color: MUTE })}>同一道难题，有的 AI 想得久、写得长，花得就多</P>

    <Until t={t} out={R1.morph}>
      <P t={t} at={DS - 0.25} x={HX} y={520} style={HEAD}>各家最强的模型 · 写一整套《三体》大约多少钱 · 单位：元</P>
      <Note t={t} at={BIG + 1.2} x={HX} y={1235}>价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月</Note>
    </Until>
    <Until t={t} out={R3.morph}>
      <P t={t} at={R1.morph + 0.1} x={HX} y={520} style={HEAD}>各家最强的模型 · 做一道难题实际花多少 · 按量付钱 · 单位：元</P>
      <Note t={t} at={R1.note} x={HX} y={1235}>按量付钱：开发者和 AI 工具调用模型的价格；聊天 App 另算 · 花费：Artificial Analysis 智能指数 v5 实测，各模型开到最强档</Note>
    </Until>
    <P t={t} at={R3.morph + 0.1} x={HX} y={520} style={HEAD}>包月用满 · 做一道难题花多少 · 单位：元</P>
    <Note t={t} at={R3.note} x={HX} y={1235}>包月用满 ＝ 按量花费 ÷ 包月最多能用掉的倍数；DeepSeek 没有包月，按量算 · 2026 年 10 月的价格，排名每个月都在变</Note>
    <Rule t={t} at={DS - 0.2} x={HX} y={575} w={1700} />

    <HubChart t={t} />

    <Until t={t} out={R1.st - 0.08}>
      <Stamp t={t} at={GAP + 0.35} x={3330} y={470} rot={-10} size={124}>差 42 倍</Stamp>
    </Until>
    <Until t={t} out={R3.morph}>
      <Stamp t={t} at={R1.st} x={3330} y={470} rot={-10} size={124}>差 17 倍</Stamp>
    </Until>

    {/* the conclusions under the chart, corrected as the film goes */}
    <P t={t} at={R1.c} x={HX} y={1295} style={H(72)}>
      按量付钱，<span style={{ color: GOLD }}>Claude 反而成了最贵的</span>
    </P>
    <Strike t={t} at={R3.strike} x={HX + 350} y={1338} w={810} h={18} rot={-1} />
    <P t={t} at={R3.setup} x={HX} y={1440} style={H(76)}>又贵又聪明的 Claude，用满包月</P>
    <P t={t} at={R3.reveal} x={HX - 10} y={1540} slam style={H(150, { color: GOLD, lineHeight: "180px", textShadow: `0 0 40px ${rgba(GOLD, 0.25)}` })}>反而比 DeepSeek 还便宜</P>
    <Stamp t={t} at={R3.reveal + 0.25} x={3000} y={590} rot={-8} size={96}>最便宜</Stamp>
    <P t={t} at={R3.tail} x={HX} y={1765} style={H(64)}>
      难怪有人每个月花 <span style={{ color: GOLD }}>$200</span>，还说这是最便宜的 AI
    </P>
  </>
);

// ---------- 真的如此吗？ and the title ----------

const TCX = 5500;
const TY = 900;
const TFS = 180;
const Ask: React.FC<{ t: number }> = ({ t }) => {
  const p = ramp(t, TITLE, TITLE + 0.22, EO);
  const strike = ramp(t, STRIKE, STRIKE + 0.3, EIO);
  const st = ramp(t, SWAP, SWAP + 0.13, EO);
  const sub = ramp(t, SUB, SUB + 0.6, EO);
  return (
    <>
      <P t={t} at={ASK} x={4850} y={470} slam style={H(200, { lineHeight: "240px" })}>
        真的<span style={{ color: GOLD }}>如此吗？</span>
      </P>
      {t >= TITLE - 0.05 && (
        <>
          <div style={{ position: "absolute", left: TCX - 1700, top: TY, width: 3400, display: "flex", justifyContent: "center", alignItems: "center", whiteSpace: "nowrap", ...H(TFS, { lineHeight: `${TFS * 1.2}px`, color: INK }) }}>
            <span style={{ display: "inline-flex", opacity: Math.min(1, p * 2), transform: `scale(${lerp(1.22, 1, p)})`, filter: p < 0.98 ? `blur(${(1 - p) * 8}px)` : undefined }}>
              <span>AI 的</span>
              <span style={{ position: "relative" }}>
                标价
                <span style={{ position: "absolute", left: "-7%", width: "114%", top: "47%", height: TFS * 0.12, borderRadius: TFS * 0.06, background: RED, opacity: 0.94, transform: `rotate(-2.5deg) scaleX(${strike})`, transformOrigin: "left center", boxShadow: `0 0 ${TFS * 0.12}px ${rgba(RED, 0.35)}` }} />
              </span>
            </span>
            <span style={{ display: "inline-block", marginLeft: TFS * 0.3, opacity: Math.min(1, st * 1.6) * 0.95, transform: `rotate(${-3 + (1 - st) * 7}deg) scale(${lerp(1.75, 1, st)})`, border: `${TFS * 0.075}px solid ${GOLD}`, borderRadius: TFS * 0.08, padding: `${TFS * 0.02}px ${TFS * 0.22}px`, color: GOLD, boxShadow: `0 0 ${TFS * 0.4}px ${rgba(GOLD, 0.18)}` }}>
              真实价格
            </span>
          </div>
          <div style={{ position: "absolute", left: TCX - 1700, width: 3400, top: TY + TFS * 1.5, textAlign: "center", ...Mono(54, { color: MUTE, letterSpacing: "0.12em" }), clipPath: `inset(-20% ${(1 - sub) * 100}% -20% 0)` }}>
            第 1 集 · 文字 AI
          </div>
        </>
      )}
    </>
  );
};

// ---------- reversal 2: the real intelligence ranking ----------

// The same exam that measured the per-task costs also scores the models. v5 (2026-10-27) moved 60% of it onto
// questions that were never published, and the best open model fell from 3 points behind the leader to 12.
const IX = 4250;
const Smart: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={R2.q} x={IX} y={1500} style={H(96)}>
      贵 17 倍，<span style={{ color: GOLD }}>聪明多少？</span>
    </P>
    <P t={t} at={R2.sub} x={IX} y={1630} style={H(54, { color: MUTE })}>AI 智力榜刚换了新考卷：六成考题从没公开过</P>
    <P t={t} at={R2.head} x={IX} y={1740} style={HEAD}>真实智力排行 · 各家最强的模型 · 满分 100</P>
    <Rule t={t} at={R2.head} x={IX} y={1795} w={1700} />
    <Chart nameDy={-38} t={t} at={R2.chart} x={IX} y={1845} rows={IQ} max={100} pitch={125} stagger={0.2} />
    <P t={t} at={R2.smart} x={IX} y={2590} style={H(72)}>
      贵的，确实<span style={{ color: GOLD }}>更聪明</span>
    </P>
    <P t={t} at={R2.old} x={IX} y={2705} style={H(54, { color: MUTE })}>旧考卷上，最强的开源模型只落后第一名</P>
    <P t={t} at={R2.old + 0.3} x={IX + 1045} y={2694} style={Mono(60, { color: MUTE })}>3 分</P>
    <Strike t={t} at={R2.strike} x={IX + 1030} y={2724} w={165} h={18} />
    <P t={t} at={R2.nw} x={IX} y={2810} style={H(54)}>换上新考卷：</P>
    <P t={t} at={R2.twelve} x={IX + 340} y={2772} slam style={Mono(110, { color: RED, lineHeight: "130px" })}>12 分</P>
    <Note t={t} at={R2.note} x={IX} y={2948}>Artificial Analysis 智能指数 v5（2026-10-27 发布，数据取 10-30）· Gemini 4 Carbon 10-28 登顶，尚未公开发售</Note>
  </>
);

// ---------- reversal 3: plans ----------

const TABLE: [string, string, string][] = [
  ["Claude", "59 倍", ""],
  ["ChatGPT", "15 倍", "同样 $200"],
  ["智谱", "最多 13 倍", ""],
  ["Kimi", "约 2.8 倍", "网友实测"],
  ["DeepSeek", "没有包月", ""],
];
const Plans: React.FC<{ t: number }> = ({ t }) => {
  const count = ramp(t, R3.count, R3.count + 1.1, EO);
  const n = Math.round(lerp(200, 11700, count));
  return (
    <>
      <P t={t} at={R3.a} x={300} y={1420} style={H(70)}>可天天用 AI 干活的人，大多是包月的</P>
      <div style={{ position: "absolute", left: 300, top: 1560, width: 1500, height: 880, border: "3px solid rgba(239,230,212,0.35)", borderRadius: 24, clipPath: `inset(0 ${(1 - ramp(t, R3.box, R3.box + 0.5, EO)) * 100}% 0 0)` }} />
      <P t={t} at={R3.who} x={380} y={1610} style={H(56, { color: MUTE })}>Claude 最贵的包月</P>
      <P t={t} at={R3.price} x={360} y={1680} slam style={Mono(220, { lineHeight: "240px", color: GOLD })}>
        $200<span style={H(90, { color: GOLD })}> / 月</span>
      </P>
      <P t={t} at={R3.use} x={380} y={1960} style={H(56, { color: MUTE })}>每周都用到上限，能用掉</P>
      {t >= R3.count && (
        <div style={{ position: "absolute", left: 360, top: 2030, whiteSpace: "nowrap", ...Mono(210, { lineHeight: "240px", color: INK }), opacity: Math.min(1, count * 3) }}>
          ${n.toLocaleString("en-US")}
          <span style={H(70, { color: MUTE })}> 的量</span>
        </div>
      )}
      <Stamp t={t} at={R3.x59} x={1250} y={1640} rot={-10} size={150}>59 倍</Stamp>

      <P t={t} at={R3.table} x={300} y={2560} style={Mono(34, { color: MUTE, letterSpacing: "0.04em" })}>其他几家，也这么算 · 包月最多能用掉几倍</P>
      <Rule t={t} at={R3.table} x={300} y={2615} w={1500} />
      {TABLE.map(([name, mult, note], i) => (
        <React.Fragment key={name}>
          <P t={t} at={R3.table + 0.2 + i * 0.25} x={300} y={2650 + i * 92} dur={0.3} style={{ fontFamily: /[一-鿿]/.test(name) ? FONT : MONO, fontWeight: 900, fontSize: 52 }}>{name}</P>
          <P t={t} at={R3.table + 0.3 + i * 0.25} x={920} y={2650 + i * 92} dur={0.3} style={H(56, { color: i === 0 ? GOLD : INK })}>{mult}</P>
          {note && <P t={t} at={R3.table + 0.4 + i * 0.25} x={1420} y={2662 + i * 92} dur={0.3} style={Mono(32, { color: FAINT })}>（{note}）</P>}
        </React.Fragment>
      ))}
      <Note t={t} at={R3.tnote} x={300} y={3120}>Claude、ChatGPT：SemiAnalysis 同一方法测算；智谱：官方档位折算；Kimi：科技博主实测（2026-10-24）</Note>
    </>
  );
};

// ---------- reversal 4: does the AI company lose money? ----------

const Catch: React.FC<{ t: number }> = ({ t }) => {
  const grid = ramp(t, R4.grid, R4.grid + 0.6, (v) => v);
  return (
    <>
      <P t={t} at={R4.q} x={2150} y={2250} style={H(96)}>
        59 倍，<span style={{ color: GOLD }}>AI 公司不亏吗？</span>
      </P>
      {Array.from({ length: 100 }, (_, k) => {
        const on = k / 100 < grid;
        const lit = [7, 23, 48, 66, 91].includes(k) && t > R4.five;
        return on ? (
          <div key={k} style={{ position: "absolute", left: 2150 + (k % 10) * 48, top: 2400 + Math.floor(k / 10) * 48, width: 38, height: 38, borderRadius: 4, background: lit ? GOLD : "rgba(239,230,212,0.16)", boxShadow: lit ? `0 0 16px ${rgba(GOLD, 0.5)}` : undefined }} />
        ) : null;
      })}
      <P t={t} at={R4.five} x={2750} y={2420} style={H(58)}>会碰到每周上限的人，</P>
      <P t={t} at={R4.five + 0.25} x={2750} y={2500} style={H(58)}>
        不到 <span style={{ color: GOLD }}>5%</span>
      </P>
      <P t={t} at={R4.pct} x={2750} y={2640} style={H(58)}>
        要是一个月只用了上限的 <span style={{ color: RED }}>1.7%</span>，
      </P>
      <P t={t} at={R4.slam} x={2740} y={2715} slam style={H(76, { lineHeight: "96px" })}>
        包月就比按量付钱<span style={{ color: RED }}>还贵</span>
      </P>
      <Note t={t} at={R4.note} x={2150} y={2930}>Anthropic，2025 年 7 月宣布每周上限时的说明；1.7% ＝ 1 ÷ 59</Note>
    </>
  );
};

// ---------- reversal 5: your time ----------

const BILLS = [
  { who: "DeepSeek · 按量付钱（32 分，平均要试 3.1 次才做对）", token: 12.6, mins: 15.6, time: 16.1, total: "约 ¥28.8" },
  { who: "Claude · 包月用满（58 分，平均试 1.7 次）", token: 2.0, mins: 8.6, time: 8.9, total: "约 ¥10.9" },
];
const YX = 4250;
const YY = 3150;
const YourTime: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={R5.a} x={YX} y={YY} style={H(96)}>账单上，还漏了一行</P>
    <Draw t={t} at={R5.caret} x={YX + 890} y={YY + 100} w={120} h={70} d="M 10 60 L 60 8 L 110 60" stroke={12} />
    <P t={t} at={R5.sub} x={YX} y={YY + 130} style={H(56, { color: MUTE })}>AI 做完，你要检查；做错了，返工</P>
    <P t={t} at={R5.head} x={YX} y={YY + 240} style={Mono(32, { color: MUTE })}>做对一道难题，一共花多少？（每次检查 5 分钟，时薪按全国平均 ¥62 算）</P>
    {BILLS.map((b, i) => {
      const at = R5.bills + i * 0.6;
      const y = YY + 320 + i * 170;
      const k = 1500 / 28.8;
      const g1 = ramp(t, at + 0.2, at + 0.7, EO);
      const g2 = ramp(t, at + 0.7, at + 1.5, EO);
      return (
        <React.Fragment key={b.who}>
          <P t={t} at={at} x={YX} y={y} dur={0.4} style={H(34)}>{b.who}</P>
          {g1 > 0 && <div style={{ position: "absolute", left: YX, top: y + 50, width: b.token * k * g1, height: 70, background: GOLD }} />}
          {g2 > 0 && <div style={{ position: "absolute", left: YX + b.token * k + 6, top: y + 50, width: b.time * k * g2, height: 70, background: rgba("#e5322d", 0.85) }} />}
          <P t={t} at={at + 0.6} x={YX + 10} y={y + 128} dur={0.3} style={Mono(26, { color: GOLD })}>AI 费 ¥{b.token.toFixed(1)}</P>
          <P t={t} at={at + 1.3} x={YX + Math.max(b.token * k + 20, 230)} y={y + 128} dur={0.3} style={Mono(26, { color: "#ff7a72" })}>你检查 {b.mins} 分钟 ¥{b.time.toFixed(1)}</P>
          <P t={t} at={at + 1.5} x={YX + (b.token + b.time) * k + 30} y={y + 52} dur={0.25} style={Mono(60, { color: INK })}>{b.total}</P>
        </React.Fragment>
      );
    })}
    <P t={t} at={R5.b} x={YX} y={YY + 690} style={H(62)}>两张账单上，最贵的一行，</P>
    <P t={t} at={R5.slam} x={YX} y={YY + 775} slam style={H(110, { lineHeight: "130px" })}>
      都是<span style={{ color: RED }}>你的时间</span>
    </P>
    <Note t={t} at={R5.note} x={YX} y={YY + 920}>做对比例按智力分估算（满分 100）；时薪：国家统计局 2025 年城镇非私营单位平均工资</Note>
  </>
);

// ---------- reversal 6: zoom out ----------

const YEARS: [string, number, string][] = [
  ["2023", 403, "¥403"],
  ["2024", 31, "¥31"],
  ["2025", 2.4, "¥2.4"],
  ["2026", 0.18, "¥0.18"],
];
const ZX = 6500;
const ZoomOut: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={R6.a} x={ZX} y={1450} style={H(96)}>把时间拉回三年前</P>
    <P t={t} at={R6.sub} x={ZX} y={1575} style={Mono(30, { color: MUTE })}>GPT-4 水平的 AI，写一整套《三体》</P>
    {YEARS.map(([y, v, txt], i) => {
      const at = R6.rows + i * 0.35;
      const g = ramp(t, at + 0.1, at + 0.6, EO);
      const full = Math.max(8, (v / 403) * 1300);
      return (
        <React.Fragment key={y}>
          <P t={t} at={at} x={ZX} y={1665 + i * 100} dur={0.3} style={Mono(46, { color: i === 0 ? INK : MUTE })}>{y}</P>
          {g > 0 && <div style={{ position: "absolute", left: ZX + 180, top: 1671 + i * 100, width: full * g, height: 56, background: i === 0 ? "rgba(239,230,212,0.55)" : GOLD }} />}
          <P t={t} at={at + 0.5} x={ZX + 180 + full + 22} y={1659 + i * 100} dur={0.25} style={Mono(52, { color: i === 0 ? INK : GOLD })}>
            {txt}
            {i === 0 && <span style={Mono(26, { color: FAINT })}>（当年最强的 GPT-4）</span>}
          </P>
        </React.Fragment>
      );
    })}
    <P t={t} at={R6.line} x={ZX} y={2080} style={H(72)}>
      同样水平的 AI，每年便宜约 <span style={{ color: GOLD }}>13 倍</span>
    </P>
    <Note t={t} at={R6.note} x={ZX} y={2185}>Epoch AI，2026-09；GPT-4 2023 年输出价每百万 token $60</Note>

    <P t={t} at={R6.boom} x={ZX} y={2400} style={H(86)}>可全世界用得更多了</P>
    <P t={t} at={R6.bsub} x={ZX} y={2520} style={Mono(34, { color: MUTE })}>中国每天用掉的 token</P>
    <P t={t} at={R6.b1000} x={ZX - 10} y={2580} slam style={Mono(190, { lineHeight: "210px", color: MUTE })}>1,000 亿</P>
    <Strike t={t} at={R6.bstrike} x={ZX - 20} y={2675} w={900} h={22} />
    <P t={t} at={R6.b140} x={ZX - 10} y={2800} slam style={Mono(250, { lineHeight: "270px", color: GOLD, textShadow: `0 0 40px ${rgba(GOLD, 0.25)}` })}>140 万亿</P>
    <P t={t} at={R6.grew} x={ZX} y={3090} style={H(66)}>
      两年涨了 <span style={{ color: GOLD }}>1,000 多倍</span>
    </P>
    <Note t={t} at={R6.bnote} x={ZX} y={3190}>国家数据局：2024 年初 → 2026 年 3 月</Note>

    <P t={t} at={R6.h1} x={ZX} y={3400} style={H(84)}>可有一样东西，</P>
    <P t={t} at={R6.h2} x={ZX} y={3510} style={H(84)}>不会每年便宜 13 倍</P>
    <P t={t} at={R6.hour} x={ZX - 20} y={3650} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 280, lineHeight: "320px", color: GOLD, textShadow: `0 0 50px ${rgba(GOLD, 0.25)}` }}>你的一小时</P>
  </>
);

// ---------- the ending ----------

const Ending: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={END.e1} x={ZX} y={4120} slam style={H(116, { lineHeight: "140px" })}>
      AI 越便宜，账单上越贵的，是<span style={{ color: GOLD }}>你</span>
    </P>
    <P t={t} at={END.e2} x={ZX - 20} y={4330} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 150, lineHeight: "180px" }}>那你的一小时，值多少？</P>
  </>
);

const SOURCES = [
  "价格：OpenAI、Anthropic、Moonshot、智谱、DeepSeek 官网（2026 年 10 月）",
  "智力分、做一道难题的花费：Artificial Analysis 智能指数 v5（2026-10-27 发布，数据取 2026-10-30）",
  "包月额度：SemiAnalysis（2026-10-05）；Kimi 为科技博主实测（2026-10-24）；智谱为官方档位折算",
  "每周上限：Anthropic（2025-07-28）",
  "价格趋势：Epoch AI《The plunging price of thought》（2026-09-22）",
  "token 用量：国家数据局（2026-03-24 国新办发布会）",
  "时薪：国家统计局 2025 年城镇非私营单位平均工资",
  "人民币按 6.72 折算",
];
const EndCard: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={END.card} x={500} y={3750} style={H(84)}>AI 的真实价格 · 第 1 集 完</P>
    <P t={t} at={END.card + 0.35} x={500} y={3870} style={H(66, { color: GOLD })}>下一集：一张 AI 图，到底多少钱？</P>
    <P t={t} at={END.card + 0.75} x={500} y={4010} style={Mono(28, { color: MUTE })}>信息来源</P>
    {SOURCES.map((s, i) => (
      <P key={s} t={t} at={END.card + 0.85 + i * 0.08} x={500} y={4060 + i * 40} dur={0.4} style={Mono(24, { color: FAINT })}>
        {s}
      </P>
    ))}
  </>
);

const Brand: React.FC<{ t: number }> = ({ t }) => {
  if (t < END.brand) return null;
  const o = ramp(t, END.brand, END.brand + 0.6, EO);
  return (
    <div style={{ position: "absolute", left: 1200, top: 4800, width: 2000, textAlign: "center", opacity: o, transform: `scale(${lerp(1.06, 1, o)})` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 36 }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 190, height: 190 }} />
        <span style={H(150, { color: INK, whiteSpace: "nowrap" })}>世界的形状</span>
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 54, color: MUTE, marginTop: 24, whiteSpace: "nowrap", letterSpacing: "0.12em" }}>看见世界如何运行</div>
      <div style={{ ...Mono(40, { color: FAINT }), marginTop: 150, whiteSpace: "nowrap" }}>MakerJackie</div>
    </div>
  );
};
