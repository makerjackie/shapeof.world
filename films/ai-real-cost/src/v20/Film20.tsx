// 《AI 的真实价格 · 第 1 集 · 文字 AI》 v20, the full film (SCRIPT.md v16) in the editorial-sheet look the user
// picked: one large dark sheet of paper laid in perspective, everything printed on it, one camera that never cuts.
// Type is printed (press wipe) or slammed in, conclusions are stamped, corrections are made in red marker like a
// proofreader's. Every comparison is a printed bar chart (图 1 标价, 图 2 按量, 图 3 包月用满), so length always shows
// who is cheap. Money is in yuan throughout (plans are quoted as sold, in dollars). Timed in film bars on the 千年之后
// edit: the plan reveal lands on the music's return (bar 38), the zoom-out on its peak (bar 62).
import React from "react";
import { AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame } from "remotion";
import { bf, sec } from "../v10/bars";
import { clamp01, Grain, useFonts } from "../v15/kit";
import { Chart, Draw, EIO, EO, FAINT, FONT, GOLD, INK, lerp, MONO, MUTE, P, ramp, RED, rgba, Row, Rule, SERIF, Stamp, Strike } from "./kit";

export const FILM20_FRAMES = bf(82.6);
const B = sec; // film bar → seconds

// ---------- numbers (2026-10, SCRIPT.md; yuan at 6.72) ----------
const BOOK: Row[] = [
  { key: "deepseek", name: "DeepSeek", model: "V4.1 Flash", value: 8, label: "¥8", hi: "gold" },
  { key: "glm", name: "智谱", model: "GLM-5.3", value: 30, label: "¥30" },
  { key: "kimi", name: "Kimi", model: "K3.1 Pro", value: 68, label: "¥68" },
  { key: "claude", name: "Claude", model: "Opus 5.5", value: 134, label: "¥134" },
  { key: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", value: 336, label: "¥336", hi: "gold" },
];
const TASK: Row[] = [
  { key: "deepseek", name: "DeepSeek", model: "V4.1 Flash", value: 1.75, label: "¥1.75", hi: "gold" },
  { key: "glm", name: "智谱", model: "GLM-5.3", value: 13.5, label: "¥13.5" },
  { key: "kimi", name: "Kimi", model: "K3.1 Pro", value: 14.2, label: "¥14.2" },
  { key: "chatgpt", name: "ChatGPT", model: "GPT-6 Astra", value: 21.9, label: "¥21.9" },
  { key: "claude", name: "Claude", model: "Opus 5.5", value: 40.2, label: "¥40.2", hi: "gold" },
];
const PLAN: Row[] = [
  { key: "claude", name: "Claude", model: "包月用满 · 59 倍", value: 0.68, label: "¥0.68", hi: "gold" },
  { key: "glm", name: "智谱", model: "包月用满 · 13 倍", value: 1.04, label: "¥1.04" },
  { key: "chatgpt", name: "ChatGPT", model: "包月用满 · 15 倍", value: 1.46, label: "¥1.46" },
  { key: "deepseek", name: "DeepSeek", model: "没有包月 · 按量", value: 1.75, label: "¥1.75", hi: "gold" },
  { key: "kimi", name: "Kimi", model: "包月用满 · 约 2.8 倍", value: 5.07, label: "¥5.07" },
];

// ---------- the camera: [time, cx, cy, scale, rotateX, rotateZ]; sheet point (cx, cy) at screen centre ----------
type K = [number, number, number, number, number, number];
const CAM: K[] = [
  // opening
  [0.0, 1050, 780, 1.2, 26, -9],
  [3.6, 1200, 850, 1.0, 24, -8],
  [4.25, 2420, 640, 1.75, 22, -6],
  [6.3, 2470, 655, 1.65, 22, -6],
  [7.2, 3020, 900, 0.9, 26, -9],
  [9.0, 3050, 890, 0.93, 26, -9],
  [9.7, 3080, 800, 1.0, 25, -10],
  [11.55, 3100, 830, 0.97, 25, -9],
  [12.25, 4850, 960, 1.0, 22, -7],
  [B(6.35), 4900, 1000, 1.06, 22, -7],
  [B(6.75), 3950, 1020, 0.6, 24, -8],
  [B(7.45), 3980, 1030, 0.62, 24, -8],
  [B(7.75), 4940, 1680, 1.1, 18, -5],
  [B(8.5), 4950, 1690, 1.18, 18, -5],
  [B(8.85), 6300, 3090, 0.66, 18, -4],
  [B(10.7), 6300, 3090, 0.7, 18, -4],
  // 二 the formula
  [B(11.05), 9330, 3060, 0.6, 20, -5],
  [B(13.2), 9350, 3090, 0.64, 20, -5],
  // 三 usage, figure 2
  [B(13.75), 8950, 4240, 0.8, 24, -7],
  [B(17.8), 8970, 4250, 0.84, 24, -7],
  [B(18.3), 8900, 4280, 0.9, 24, -8],
  [B(21.6), 8920, 4300, 0.86, 24, -7],
  // 四 plans
  [B(22.1), 11550, 4180, 0.85, 22, -6],
  [B(26.0), 11600, 4200, 0.92, 22, -6],
  [B(27.4), 11620, 4220, 0.9, 22, -6],
  [B(27.9), 11480, 5280, 0.9, 22, -6],
  [B(30.6), 11500, 5300, 0.94, 22, -6],
  [B(31.1), 8950, 5520, 0.85, 24, -7],
  [B(33.3), 8970, 5540, 0.88, 24, -7],
  [B(33.9), 9000, 4950, 0.42, 26, -8],
  [B(35.2), 9000, 4980, 0.44, 26, -8],
  [B(35.8), 8950, 5700, 0.8, 24, -7],
  [B(37.6), 8950, 5740, 0.84, 24, -7],
  [B(38.0), 8900, 5840, 0.95, 22, -6],
  [B(40.2), 8920, 5860, 0.98, 22, -6],
  // 五 the catch
  [B(40.7), 6600, 5340, 0.85, 22, -6],
  [B(44.2), 6620, 5360, 0.9, 22, -6],
  // 六 trial cards and resellers
  [B(44.7), 6600, 6560, 0.85, 22, -6],
  [B(49.2), 6620, 6580, 0.9, 22, -6],
  // 七 your time
  [B(49.7), 8850, 7080, 0.85, 22, -6],
  [B(56.2), 8870, 7110, 0.9, 22, -6],
  // 七½ how to choose
  [B(56.7), 11300, 6560, 0.9, 22, -6],
  [B(61.0), 11320, 6580, 0.95, 22, -6],
  // 八 zoom out
  [B(61.6), 11300, 8700, 0.85, 22, -6],
  [B(65.0), 11320, 8720, 0.9, 22, -6],
  [B(65.5), 8900, 8720, 0.85, 22, -6],
  [B(67.9), 8920, 8740, 0.9, 22, -6],
  [B(68.4), 6300, 8700, 0.9, 20, -5],
  [B(70.3), 6320, 8750, 1.0, 20, -5],
  // 九 the ending
  [B(70.8), 5850, 9570, 0.85, 20, -5],
  [B(72.4), 5870, 9590, 0.9, 20, -5],
  [B(73.3), 4950, 1760, 0.8, 20, -6],
  [B(76.0), 4960, 1850, 0.86, 20, -6],
  [B(76.4), 4950, 2060, 0.95, 20, -6],
  [B(78.4), 4960, 2080, 1.0, 20, -6],
  [B(78.9), 2600, 2720, 0.8, 22, -6],
  [B(80.8), 2600, 2850, 0.82, 22, -6],
  [B(81.2), 2400, 4430, 0.95, 22, -6],
  [B(83.0), 2400, 4430, 1.0, 22, -6],
];
const camAt = (t: number) => {
  let i = 0;
  while (i < CAM.length - 2 && t > CAM[i + 1][0]) i++;
  const a = CAM[i];
  const b = CAM[i + 1];
  const u = EIO(clamp01((t - a[0]) / (b[0] - a[0])));
  return { cx: lerp(a[1], b[1], u), cy: lerp(a[2], b[2], u), s: lerp(a[3], b[3], u), rx: lerp(a[4], b[4], u), rz: lerp(a[5], b[5], u) };
};

// ---------- the opening's beats (seconds) ----------
const O = { q1: B(-0.14), ds: B(1.65), big: B(2.8), gap: B(4.0), plan: B(5.2), said: B(6.35), ask: B(7.6), title: B(8.6), strike: B(9.0), swap: B(9.3), sub: B(9.7) };

// stamps knock the camera
const KNOCKS = [O.q1 + 2.0, O.gap + 0.35, B(7.25), O.swap, B(18.0), B(26.5), B(38.25), B(45.3), B(48.5), B(73.6)];
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
  ["thump", O.q1 + 0.25, 0.35],
  ["keypress", O.q1 + 0.9, 0.2],
  ["keypress", O.q1 + 1.15, 0.2],
  ["keypress", O.q1 + 1.4, 0.2],
  ["punch", O.q1 + 2.0, 0.55],
  ["swipe", 3.65, 0.28],
  ["data", O.ds + 0.1, 0.14],
  ["swipe", 6.4, 0.18],
  ["data", O.big, 0.14],
  ["punch", O.gap + 0.35, 0.6],
  ["swipe", 11.6, 0.28],
  ["thump", O.plan + 0.6, 0.4],
  ["swipe", B(6.4), 0.2],
  ["brush", B(6.85), 0.5],
  ["brush", B(7.05), 0.4],
  ["punch", B(7.25), 0.55],
  ["swipe", B(7.5), 0.22],
  ["swipe", B(8.6) - 0.15, 0.3],
  ["thump", O.title + 0.05, 0.4],
  ["brush", O.strike, 0.6],
  ["punch", O.swap, 0.55],
  ["keypress", O.sub, 0.2],
  ["swipe", B(10.85), 0.26],
  ["keypress", B(11.15), 0.16],
  ["brush", B(12.0), 0.4],
  ["brush", B(13.1), 0.4],
  ["swipe", B(13.55), 0.22],
  ["data", B(16.0), 0.14],
  ["punch", B(18.0), 0.55],
  ["swipe", B(21.85), 0.26],
  ["thump", B(23.6), 0.4],
  ["thump", B(25.1), 0.45],
  ["punch", B(26.5), 0.6],
  ["swipe", B(27.6), 0.2],
  ["keypress", B(28.1), 0.16],
  ["swipe", B(30.8), 0.24],
  ["data", B(31.4), 0.14],
  ["swipe", B(33.6), 0.22],
  ["brush", B(34.4), 0.45],
  ["thump", B(38.0), 0.55],
  ["punch", B(38.25), 0.6],
  ["swipe", B(40.45), 0.24],
  ["swipe", B(44.45), 0.24],
  ["punch", B(45.3), 0.45],
  ["punch", B(48.5), 0.5],
  ["swipe", B(49.45), 0.24],
  ["brush", B(50.1), 0.4],
  ["data", B(52.0), 0.14],
  ["brush", B(55.2), 0.4],
  ["swipe", B(56.45), 0.24],
  ["brush", B(57.6), 0.35],
  ["brush", B(58.4), 0.35],
  ["brush", B(59.2), 0.35],
  ["swipe", B(61.35), 0.3],
  ["swipe", B(65.25), 0.24],
  ["thump", B(66.0), 0.4],
  ["brush", B(66.6), 0.45],
  ["thump", B(66.9), 0.5],
  ["swipe", B(68.15), 0.24],
  ["thump", B(69.3), 0.5],
  ["swipe", B(70.55), 0.22],
  ["swipe", B(72.6), 0.35],
  ["punch", B(73.6), 0.6],
  ["swipe", B(78.65), 0.24],
];

const TXT =
  "让 AI 写一整套《三体》要多少钱？第一部 三体第二部 黑暗森林第三部 死神永生88 万字各家最强的模型 · 写一整套《三体》的价格 · 单位：元差 42 倍可就是这些贵的 AI，有人每个月花约 1,344 元" +
  "“这是最便宜的 AI。”—— 他说最便宜？他算错了吗？AI 的标价真实价格第 1 集 · 文字 AI/ 月图 1 一整套《三体》约 88 万字，按 1 个 token 约 1 个字估算价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月" +
  "真实价格＝单价×用量÷包月倍数＋你的时间标价，只是第一项可 AI 干活，按事算同一道难题，有的 AI 想得久、写得长，用掉的 token 多各家最强的模型 · 做一道难题实际花多少 · 单位：元差 23 倍按量付钱，差距拉大到 23 倍" +
  "按量付钱：开发者和 AI 工具调用模型的价格；聊天 App 另算 · 花费：Artificial Analysis 评测实测可天天用 AI 干活的人，大多是包月的Claude 最贵的包月每周都用到上限，能用掉$11,700 的量59 倍其他几家，也这么算 · 包月最多能用掉几倍" +
  "同样 $200没有包月最多约网友实测包月用满，做一道难题花多少做一道题最贵的 Claude，用满包月反而比 DeepSeek 还便宜第一2026 年 10 月的价格，排名每个月都在变凭什么给因为大多数人用不满会碰到每周上限的人，不到 5%用不到上限的 1.7%，包月反而比按量付钱贵" +
  "各家送的免费额度，是体验卡限量、限速，先让你进门体验卡有人专门办卡、刷满，拆开转卖：中转站官方按量价自己办卡用满可能封号、掺水账单上，还漏了一行AI 做完，你要检查；做错了，返工做对一道难题，一共花多少？DeepSeek · 按量付钱（平均做 2.9 次才对）Claude · 包月用满（平均做 1.7 次）你检查分钟差出来的，不是几毛钱 token，是你的 7 分钟" +
  "算完这笔账偶尔问问：免费的就够天天用它干活：包月，用得越满越划算偶尔调用、接进自己的程序：按量付钱把时间拉回三年前最好的同样聪明的 AI，每年便宜约 13 倍可全世界用得更多了中国每天用掉的亿万两年涨了多倍可有一样东西，不会每年便宜 13 倍你的一小时" +
  "AI 越便宜，账单上越贵的，是你没算错那个每个月花 200 美元的人，没有算错对他来说，这确实是最便宜的 AI那你的一小时，值多少？完下一集：一张 AI 图，到底多少钱？信息来源世界的形状看见世界如何运行 MakerJackie" +
  "OpenAIAnthropicMoonshot官网SemiAnalysisEpoch国家数据局统计局工资Terminal-Bench" +
  "智谱DeepSeekClaudeChatGPTKimiV4.1 FlashGLM-5.3K3.1 ProOpus 5.5GPT-6 Astra¥$0123456789.,%—·（）：；";

export const Film20: React.FC = () => {
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
  // the light narrows on the questions, then opens again
  const spot = Math.max(win(t, O.ask - 0.2, O.title + 0.3), win(t, B(69.0), B(70.6)), win(t, B(76.3), B(78.6)));
  const fadeOut = ramp(t, B(82.0), B(82.6));

  // only print what the camera can reach; the paper is a window that follows the camera
  const hw = 3600 / c.s;
  const hh = 2700 / c.s;
  const near = (x: number, y: number) => Math.abs(x - c.cx) < hw && Math.abs(y - c.cy) < hh;
  const px0 = Math.floor((c.cx - hw) / 1024) * 1024;
  const py0 = Math.floor((c.cy - hh) / 1024) * 1024;

  return (
    <AbsoluteFill style={{ background: "#05070c", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.7} />
      {CUES.map(([s, at, v], i) => (
        <Sequence key={i} from={Math.max(0, Math.round(at * 30))} layout="none">
          <Audio src={staticFile(`sfx/${s}.wav`)} volume={v} />
        </Sequence>
      ))}

      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="mblur20" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </defs>
      </svg>

      <AbsoluteFill style={{ filter: blurOn ? "url(#mblur20)" : undefined, opacity: 1 - fadeOut }}>
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
            {near(3000, 900) && <Fig1 t={t} />}
            {near(4800, 1300) && <Block200 t={t} />}
            {near(6300, 3100) && <Title t={t} />}
            {near(9300, 3100) && <Formula t={t} />}
            {near(8950, 4270) && <Fig2 t={t} />}
            {near(11550, 4200) && <PlanCard t={t} />}
            {near(11400, 5300) && <PlanTable t={t} />}
            {near(8950, 5600) && <Fig3 t={t} />}
            {near(8950, 4950) && <Flip t={t} />}
            {near(6600, 5420) && <Catch t={t} />}
            {near(6600, 6640) && <Resell t={t} />}
            {near(8850, 7300) && <Shift y={650}><YourTime t={t} /></Shift>}
            {near(11300, 6560) && <Choose t={t} />}
            {near(11300, 8700) && <Shift y={800}><Years t={t} /></Shift>}
            {near(8900, 8720) && <Shift y={800}><Boom t={t} /></Shift>}
            {near(6300, 8700) && <Shift y={800}><Hour t={t} /></Shift>}
            {near(5850, 9580) && <Shift y={800}><Ending t={t} /></Shift>}
            {near(4950, 1900) && <Callback t={t} />}
            {near(2500, 3000) && <EndCard t={t} />}
            {near(2400, 4430) && <Brand t={t} />}
          </div>
        </AbsoluteFill>
      </AbsoluteFill>

      <AbsoluteFill style={{ background: "radial-gradient(ellipse 60% 55% at 45% 40%, rgba(255,226,180,0.10), rgba(0,0,0,0) 70%)", mixBlendMode: "screen" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse ${lerp(140, 52, spot)}% ${lerp(130, 48, spot)}% at 50% 50%, rgba(0,0,0,0) 40%, rgba(2,3,6,${0.55 + 0.4 * spot}) 100%)` }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: 300, backdropFilter: "blur(5px)", WebkitMaskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(180deg, #000 0%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 260, backdropFilter: "blur(4px)", WebkitMaskImage: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%)", maskImage: "linear-gradient(0deg, #000 0%, rgba(0,0,0,0) 100%)" }} />
      <div style={{ position: "absolute", left: 46, top: 38, display: "flex", alignItems: "center", gap: 14, opacity: 0.85 * (1 - ramp(t, B(80.9), B(81.3))) }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 46, height: 46 }} />
        <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 27, color: INK, letterSpacing: "0.06em" }}>世界的形状</span>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: fadeOut }} />
      <Grain frame={frame} amount={0.05} />
    </AbsoluteFill>
  );
};

/** moves a block on the sheet without retyping its coordinates */
const Shift: React.FC<{ y: number; children: React.ReactNode }> = ({ y, children }) => <div style={{ position: "absolute", left: 0, top: y }}>{children}</div>;

const H = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: FONT, fontWeight: 900, fontSize: size, ...extra });
const Mono = (size: number, extra: React.CSSProperties = {}): React.CSSProperties => ({ fontFamily: MONO, fontWeight: 700, fontSize: size, ...extra });
const Note: React.FC<{ t: number; at: number; x: number; y: number; children: React.ReactNode }> = ({ t, at, x, y, children }) => (
  <P t={t} at={at} x={x} y={y} dur={0.6} style={Mono(22, { color: FAINT })}>
    {children}
  </P>
);

// ---------- 一 the opening ----------

const Block1: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={O.q1} x={560} y={540} style={H(66)}>让 AI 写一整套</P>
    <P t={t} at={O.q1 + 0.25} x={510} y={610} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 310, lineHeight: "350px" }}>《三体》</P>
    {["第一部 三体", "第二部 黑暗森林", "第三部 死神永生"].map((l, i) => (
      <P key={l} t={t} at={O.q1 + 0.9 + i * 0.25} x={1650} y={690 + i * 56} dur={0.3} style={Mono(32, { color: MUTE })}>
        {l}
      </P>
    ))}
    <P t={t} at={O.q1 + 1.25} x={560} y={1000} style={H(96, { color: GOLD })}>要多少钱？</P>
    <Stamp t={t} at={O.q1 + 2.0} x={1640} y={930} rot={-8} size={74}>88 万字</Stamp>
    <Note t={t} at={O.q1 + 2.3} x={560} y={1150}>图 1 —— 一整套《三体》约 88 万字，按约 100 万 token 估算（各家分词不同）</Note>
  </>
);

const Fig1: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={O.ds - 0.25} x={2150} y={520} style={Mono(30, { color: MUTE, letterSpacing: "0.04em" })}>各家最强的模型 · 写一整套《三体》大约多少钱 · 单位：元</P>
    <Rule t={t} at={O.ds - 0.2} x={2150} y={575} w={1700} />
    <Chart t={t} at={O.big} first={O.ds} x={2150} y={625} rows={BOOK} max={336} />
    <Stamp t={t} at={O.gap + 0.35} x={3330} y={470} rot={-10} size={124}>差 42 倍</Stamp>
    <Note t={t} at={O.big + 1.2} x={2150} y={1300}>价格：各家官方 API 输出价，人民币按 6.72 折算 · 2026 年 10 月</Note>
  </>
);

// the $200 block, the claim, and the red line from the claim back to Claude's bar in figure 1
const Block200: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={O.plan} x={4250} y={620} style={H(64)}>可就是这些贵的 AI，</P>
    <P t={t} at={O.plan + 0.3} x={4250} y={705} style={H(64)}>有人每个月花</P>
    <P t={t} at={O.plan + 0.6} x={4225} y={770} slam style={Mono(370, { lineHeight: "400px", color: GOLD, textShadow: `0 0 40px ${rgba(GOLD, 0.25)}` })}>$200</P>
    <P t={t} at={O.plan + 0.8} x={5130} y={1000} style={H(110, { color: GOLD })}>/ 月</P>
    <P t={t} at={O.plan + 1.05} x={4255} y={1170} style={{ fontFamily: FONT, fontWeight: 700, fontSize: 44, color: MUTE }}>约 1,344 元</P>
    <P t={t} at={O.said} x={4240} y={1240} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 104, lineHeight: "130px" }}>
      <span style={{ color: GOLD }}>“</span>这是最便宜的 AI。<span style={{ color: GOLD }}>”</span>
    </P>
    <P t={t} at={O.said + 0.35} x={5200} y={1385} style={Mono(30, { color: MUTE })}>—— 他说</P>
    {/* a circle around Claude's ¥134 in figure 1, and the line back to the claim */}
    <Draw t={t} at={B(6.85)} x={2620} y={960} w={720} h={170} d="M 380 12 C 640 10, 712 60, 690 105 C 660 160, 260 168, 80 140 C -10 120, 10 40, 120 22 C 220 6, 330 8, 420 16" />
    <Draw t={t} at={B(7.05)} x={3330} y={1050} w={920} h={290} d="M 900 270 C 700 250, 420 180, 18 40" head stroke={12} />
    <Stamp t={t} at={B(7.25)} x={5420} y={1225} rot={-11} size={92}>最便宜？</Stamp>
    <P t={t} at={O.ask + 0.2} x={4300} y={1560} slam style={H(214, { lineHeight: "250px" })}>他算错了吗？</P>
  </>
);

const TCX = 6300;
const TY = 2950;
const TFS = 250;
const Title: React.FC<{ t: number }> = ({ t }) => {
  if (t < O.title - 0.05) return null;
  const p = ramp(t, O.title, O.title + 0.22, EO);
  const strike = ramp(t, O.strike, O.strike + 0.3, EIO);
  const st = ramp(t, O.swap, O.swap + 0.13, EO);
  const sub = ramp(t, O.sub, O.sub + 0.6, EO);
  return (
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
      <div style={{ position: "absolute", left: TCX - 1700, width: 3400, top: TY + TFS * 1.5, textAlign: "center", ...Mono(60, { color: MUTE, letterSpacing: "0.12em" }), clipPath: `inset(-20% ${(1 - sub) * 100}% -20% 0)` }}>
        第 1 集 · 文字 AI
      </div>
    </>
  );
};

// ---------- 二 the formula ----------

const TERMS = ["真实价格", "＝", "单价", "×", "用量", "÷", "包月倍数", "＋", "你的时间"];
const Formula: React.FC<{ t: number }> = ({ t }) => {
  let x = 7960;
  return (
    <>
      {TERMS.map((term, i) => {
        const op = i % 2 === 1;
        const w = op ? 150 : term.length * 128 + 30;
        const el = (
          <P key={i} t={t} at={B(11.15) + i * 0.12} x={x} y={2960} slam={!op} style={H(128, { color: op ? MUTE : i === 0 ? GOLD : INK, fontWeight: op ? 500 : 900 })}>
            {term}
          </P>
        );
        x += w;
        return el;
      })}
      {/* 单价 is done: a red tick; 用量 is next: a red circle */}
      <Draw t={t} at={B(12.0)} x={8660} y={2860} w={260} h={120} d="M 10 60 L 90 110 L 250 10" stroke={16} />
      <P t={t} at={B(12.2)} x={7980} y={3170} style={H(84)}>标价，只是第一项</P>
      <Draw t={t} at={B(13.1)} x={9060} y={2930} w={320} h={200} d="M 170 12 C 290 14, 318 80, 300 120 C 270 186, 60 190, 20 130 C -10 80, 40 18, 190 16" stroke={12} />
    </>
  );
};

// ---------- 三 usage: figure 2 ----------

const Fig2: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(14.0)} x={8000} y={3640} style={H(96)}>可 AI 干活，按事算</P>
    <P t={t} at={B(14.8)} x={8000} y={3770} style={H(54, { color: MUTE })}>同一道难题，有的 AI 想得久、写得长，花得就多</P>
    <P t={t} at={B(15.6)} x={8000} y={3880} style={Mono(30, { color: MUTE, letterSpacing: "0.04em" })}>图 2 · 各家最强的模型 · 做一道难题实际花多少 · 单位：元</P>
    <Rule t={t} at={B(15.6)} x={8000} y={3935} w={1800} />
    <Chart t={t} at={B(16.0)} x={8000} y={3985} rows={TASK} max={40.2} />
    <Stamp t={t} at={B(18.0)} x={9480} y={3820} rot={-9} size={120}>差 23 倍</Stamp>
    <P t={t} at={B(18.5)} x={8000} y={4660} style={H(72)}>
      按量付钱，<span style={{ color: GOLD }}>Claude 反而成了最贵的</span>
    </P>
    <Note t={t} at={B(19.2)} x={8000} y={4770}>按量付钱：开发者和 AI 工具调用模型的价格；聊天 App 另算 · 花费：Artificial Analysis 评测实测</Note>
  </>
);

// ---------- 四 plans ----------

const PlanCard: React.FC<{ t: number }> = ({ t }) => {
  const count = ramp(t, B(25.1), B(25.1) + 0.9, EO);
  const n = Math.round(lerp(200, 11700, count));
  return (
    <>
      <P t={t} at={B(22.3)} x={10500} y={3620} style={H(70)}>可天天用 AI 干活的人，大多是包月的</P>
      <div style={{ position: "absolute", left: 10500, top: 3760, width: 2100, height: 980, border: "3px solid rgba(239,230,212,0.35)", borderRadius: 24, clipPath: `inset(0 ${(1 - ramp(t, B(23.3), B(23.3) + 0.5, EO)) * 100}% 0 0)` }} />
      <P t={t} at={B(23.5)} x={10580} y={3810} style={H(56, { color: MUTE })}>Claude 最贵的包月</P>
      <P t={t} at={B(23.7)} x={10560} y={3880} slam style={Mono(220, { lineHeight: "240px", color: GOLD })}>
        $200<span style={H(90, { color: GOLD })}> / 月</span>
      </P>
      <P t={t} at={B(24.6)} x={10580} y={4170} style={H(56, { color: MUTE })}>每周都用到上限，能用掉</P>
      {t >= B(25.1) && (
        <div style={{ position: "absolute", left: 10560, top: 4240, whiteSpace: "nowrap", ...Mono(210, { lineHeight: "240px", color: INK }), opacity: Math.min(1, count * 3) }}>
          ${n.toLocaleString("en-US")}
          <span style={H(70, { color: MUTE })}> 的量</span>
        </div>
      )}
      <Stamp t={t} at={B(26.5)} x={11950} y={3880} rot={-10} size={150}>59 倍</Stamp>
    </>
  );
};

const TABLE: [string, string, string][] = [
  ["Claude", "59 倍", ""],
  ["ChatGPT", "15 倍", "同样 $200"],
  ["智谱", "最多 13 倍", ""],
  ["Kimi", "约 2.8 倍", "网友实测"],
  ["DeepSeek", "没有包月", ""],
];
const PlanTable: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(28.0)} x={10500} y={4950} style={Mono(34, { color: MUTE, letterSpacing: "0.04em" })}>其他几家，也这么算 · 包月最多能用掉几倍</P>
    <Rule t={t} at={B(28.0)} x={10500} y={5005} w={1900} />
    {TABLE.map(([name, mult, note], i) => (
      <React.Fragment key={name}>
        <P t={t} at={B(28.3) + i * 0.3} x={10500} y={5040 + i * 92} dur={0.3} style={{ fontFamily: /[一-鿿]/.test(name) ? FONT : MONO, fontWeight: 900, fontSize: 52 }}>{name}</P>
        <P t={t} at={B(28.3) + i * 0.3 + 0.1} x={11120} y={5040 + i * 92} dur={0.3} style={H(56, { color: i === 0 ? GOLD : INK })}>{mult}</P>
        {note && <P t={t} at={B(28.3) + i * 0.3 + 0.2} x={11620} y={5052 + i * 92} dur={0.3} style={Mono(32, { color: FAINT })}>（{note}）</P>}
      </React.Fragment>
    ))}
    <Note t={t} at={B(30.0)} x={10500} y={5520}>Claude、ChatGPT：SemiAnalysis 同一方法测算；智谱：官方档位折算；Kimi：科技博主实测（2026-10-24）</Note>
  </>
);

const Fig3: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(31.2)} x={8000} y={5150} style={Mono(30, { color: MUTE, letterSpacing: "0.04em" })}>图 3 · 包月用满，做一道难题花多少 · 单位：元</P>
    <Rule t={t} at={B(31.2)} x={8000} y={5205} w={1800} />
    <Chart t={t} at={B(31.5)} x={8000} y={5255} rows={PLAN} max={5.07} stagger={0.15} />
    <P t={t} at={B(35.9)} x={8000} y={5930} style={H(76)}>做一道题最贵的 Claude，用满包月</P>
    <P t={t} at={B(38.0)} x={7990} y={6030} slam style={H(150, { color: GOLD, lineHeight: "180px", textShadow: `0 0 40px ${rgba(GOLD, 0.25)}` })}>反而比 DeepSeek 还便宜</P>
    <Stamp t={t} at={B(38.25)} x={9500} y={5170} rot={-8} size={110}>第一</Stamp>
    <Note t={t} at={B(39.2)} x={8000} y={6230}>2026 年 10 月的价格，排名每个月都在变</Note>
  </>
);

// the pull-back over figures 2 and 3: Claude goes from the bottom to the top
const Flip: React.FC<{ t: number }> = ({ t }) => (
  <Draw t={t} at={B(34.4)} x={9900} y={4600} w={600} h={720} d="M 40 10 C 520 120, 520 560, 60 690" head stroke={16} dur={0.5} />
);

// ---------- 五 the catch ----------

const Catch: React.FC<{ t: number }> = ({ t }) => {
  const grid = ramp(t, B(41.6), B(41.6) + 0.8, (v) => v);
  return (
    <>
      <P t={t} at={B(40.8)} x={5600} y={5000} style={H(96)}>凭什么给 59 倍？</P>
      <P t={t} at={B(41.2)} x={5600} y={5130} style={H(70, { color: GOLD })}>因为大多数人用不满</P>
      {Array.from({ length: 100 }, (_, k) => {
        const on = k / 100 < grid;
        const lit = [7, 23, 48, 66, 91].includes(k) && t > B(42.2);
        return on ? (
          <div key={k} style={{ position: "absolute", left: 5600 + (k % 10) * 48, top: 5260 + Math.floor(k / 10) * 48, width: 38, height: 38, borderRadius: 4, background: lit ? GOLD : "rgba(239,230,212,0.16)", boxShadow: lit ? `0 0 16px ${rgba(GOLD, 0.5)}` : undefined }} />
        ) : null;
      })}
      <P t={t} at={B(42.2)} x={6180} y={5300} style={H(58)}>会碰到每周上限的人，</P>
      <P t={t} at={B(42.5)} x={6180} y={5380} style={H(58)}>
        不到 <span style={{ color: GOLD }}>5%</span>
      </P>
      <P t={t} at={B(43.1)} x={6180} y={5520} style={H(58)}>
        要是一个月只用了上限的 <span style={{ color: RED }}>1.7%</span>，
      </P>
      <P t={t} at={B(43.4)} x={6180} y={5600} style={H(58)}>包月就比按量付钱还贵</P>
      <Note t={t} at={B(43.8)} x={5600} y={5760}>Anthropic，2025 年 7 月宣布每周上限时的说明；1.7% ＝ 1 ÷ 59</Note>
    </>
  );
};

// ---------- 六 trial cards and resellers ----------

const Resell: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(44.9)} x={5600} y={6240} style={H(76)}>各家送的免费额度，是体验卡</P>
    <P t={t} at={B(45.0) + 0.3} x={5600} y={6345} style={H(50, { color: MUTE })}>限量、限速，先让你进门</P>
    <Stamp t={t} at={B(45.3)} x={7330} y={6215} rot={-7} size={74} color={GOLD} dashed>体验卡</Stamp>
    <P t={t} at={B(46.3)} x={5600} y={6470} style={H(62)}>有人专门办卡、刷满，拆开转卖：中转站</P>
    <P t={t} at={B(46.8)} x={5600} y={6560} style={Mono(30, { color: MUTE })}>同一道难题，Claude 做一次：</P>
    {[
      ["官方按量", 40.2, "¥40.2"],
      ["中转站", 8.8, "约 ¥8.8"],
      ["自己办卡用满", 0.68, "¥0.68"],
    ].map(([label, v, txt], i) => {
      const at = B(47.0) + i * 0.25;
      const g = ramp(t, at + 0.1, at + 0.8, EO);
      const full = Math.max(14, ((v as number) / 40.2) * 1050);
      return (
        <React.Fragment key={label as string}>
          <P t={t} at={at} x={5600} y={6620 + i * 96} dur={0.3} style={H(46)}>{label as string}</P>
          {g > 0 && <div style={{ position: "absolute", left: 5950, top: 6620 + i * 96, width: full * g, height: 56, background: i === 2 ? GOLD : "rgba(239,230,212,0.5)" }} />}
          <P t={t} at={at + 0.7} x={5950 + full + 22} y={6610 + i * 96} dur={0.25} style={Mono(52, { color: i === 2 ? GOLD : INK })}>{txt as string}</P>
        </React.Fragment>
      );
    })}
    <Stamp t={t} at={B(48.5)} x={6950} y={6720} rot={-9} size={64}>可能封号、掺水</Stamp>
  </>
);

// ---------- 七 your time ----------

const BILLS = [
  { who: "DeepSeek · 按量付钱（平均要试 2.9 次才做对）", token: 5.1, mins: 14.5, time: 15.0, total: "约 ¥20.1" },
  { who: "Claude · 包月用满（平均试 1.7 次）", token: 1.2, mins: 8.5, time: 8.8, total: "约 ¥10.0" },
];
const YourTime: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(49.9)} x={8000} y={6200} style={H(96)}>账单上，还漏了一行</P>
    <Draw t={t} at={B(50.2)} x={8890} y={6300} w={120} h={70} d="M 10 60 L 60 8 L 110 60" stroke={12} />
    <P t={t} at={B(50.8)} x={8000} y={6330} style={H(56, { color: MUTE })}>AI 做完，你要检查；做错了，返工</P>
    <P t={t} at={B(51.5)} x={8000} y={6440} style={Mono(32, { color: MUTE })}>做对一道难题，一共花多少？（每次检查 5 分钟，时薪按全国平均 ¥62 算）</P>
    {BILLS.map((b, i) => {
      const at = B(52.0) + i * 0.6;
      const y = 6520 + i * 170;
      const k = 1500 / 20.1;
      const g1 = ramp(t, at + 0.2, at + 0.7, EO);
      const g2 = ramp(t, at + 0.7, at + 1.5, EO);
      return (
        <React.Fragment key={b.who}>
          <P t={t} at={at} x={8000} y={y} dur={0.4} style={H(34)}>{b.who}</P>
          {g1 > 0 && <div style={{ position: "absolute", left: 8000, top: y + 50, width: b.token * k * g1, height: 70, background: GOLD }} />}
          {g2 > 0 && <div style={{ position: "absolute", left: 8000 + b.token * k + 6, top: y + 50, width: b.time * k * g2, height: 70, background: rgba("#e5322d", 0.85) }} />}
          <P t={t} at={at + 0.6} x={8000 + 10} y={y + 128} dur={0.3} style={Mono(26, { color: GOLD })}>AI 费 ¥{b.token.toFixed(1)}</P>
          <P t={t} at={at + 1.3} x={8000 + b.token * k + 20} y={y + 128} dur={0.3} style={Mono(26, { color: "#ff7a72" })}>你检查 {b.mins} 分钟 ¥{b.time.toFixed(1)}</P>
          <P t={t} at={at + 1.5} x={8000 + (b.token + b.time) * k + 30} y={y + 52} dur={0.25} style={Mono(60, { color: INK })}>{b.total}</P>
        </React.Fragment>
      );
    })}
    <P t={t} at={B(54.6)} x={8000} y={6890} style={H(62)}>差出来的，不是几块钱 AI 费，</P>
    <P t={t} at={B(55.0)} x={8000} y={6975} slam style={H(110, { lineHeight: "130px" })}>
      是你的 <span style={{ color: RED }}>6 分钟</span>
    </P>
    <Note t={t} at={B(55.6)} x={8000} y={7120}>做对比例：Terminal-Bench 4.0（34%、60%）；时薪：国家统计局 2025 年城镇非私营单位平均工资</Note>
  </>
);

// ---------- 七½ how to choose ----------

const Choose: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(56.9)} x={10500} y={6200} style={H(96)}>算完这笔账</P>
    {["偶尔问问：免费的就够", "天天用它干活：包月，用得越满越划算"].map((l, i) => (
      <React.Fragment key={l}>
        <div style={{ position: "absolute", left: 10500, top: 6370 + i * 120, width: 56, height: 56, border: "4px solid rgba(239,230,212,0.6)", borderRadius: 6, opacity: ramp(t, B(57.3) + i * 0.8, B(57.3) + i * 0.8 + 0.2) }} />
        <Draw t={t} at={B(57.6) + i * 0.8} x={10500} y={6352 + i * 120} w={90} h={80} d="M 8 44 L 30 70 L 84 6" stroke={12} />
        <P t={t} at={B(57.3) + i * 0.8} x={10600} y={6360 + i * 120} style={H(60)}>{l}</P>
      </React.Fragment>
    ))}
  </>
);

// ---------- 八 zoom out ----------

const YEARS: [string, number, string][] = [
  ["2023", 403, "¥403"],
  ["2024", 31, "¥31"],
  ["2025", 2.4, "¥2.4"],
  ["2026", 0.18, "¥0.18"],
];
const Years: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(61.7)} x={10500} y={7500} style={H(96)}>把时间拉回三年前</P>
    <P t={t} at={B(62.2)} x={10500} y={7625} style={Mono(30, { color: MUTE })}>GPT-4 水平的 AI，写一整套《三体》</P>
    {YEARS.map(([y, v, txt], i) => {
      const at = B(62.6) + i * 0.45;
      const g = ramp(t, at + 0.1, at + 0.6, EO);
      const full = Math.max(8, (v / 403) * 1300);
      return (
        <React.Fragment key={y}>
          <P t={t} at={at} x={10500} y={7690 + i * 100} dur={0.3} style={Mono(46, { color: i === 0 ? INK : MUTE })}>{y}</P>
          {g > 0 && <div style={{ position: "absolute", left: 10680, top: 7696 + i * 100, width: full * g, height: 56, background: i === 0 ? "rgba(239,230,212,0.55)" : GOLD }} />}
          <P t={t} at={at + 0.5} x={10680 + full + 22} y={7684 + i * 100} dur={0.25} style={Mono(52, { color: i === 0 ? INK : GOLD })}>
            {txt}
            {i === 0 && <span style={Mono(26, { color: FAINT })}>（当年最强的 GPT-4）</span>}
          </P>
        </React.Fragment>
      );
    })}
    <P t={t} at={B(64.4)} x={10500} y={8110} style={H(72)}>
      同样水平的 AI，每年便宜约 <span style={{ color: GOLD }}>13 倍</span>
    </P>
    <Note t={t} at={B(64.8)} x={10500} y={8215}>Epoch AI，2026-09；GPT-4 2023 年输出价每百万 token $60</Note>
  </>
);

const Boom: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(65.6)} x={8000} y={7460} style={H(86)}>可全世界用得更多了</P>
    <P t={t} at={B(65.9)} x={8000} y={7580} style={Mono(34, { color: MUTE })}>中国每天用掉的 token</P>
    <P t={t} at={B(66.0)} x={7990} y={7640} slam style={Mono(190, { lineHeight: "210px", color: MUTE })}>1,000 亿</P>
    <Strike t={t} at={B(66.6)} x={7980} y={7735} w={900} h={22} />
    <P t={t} at={B(66.9)} x={7990} y={7860} slam style={Mono(250, { lineHeight: "270px", color: GOLD, textShadow: `0 0 40px ${rgba(GOLD, 0.25)}` })}>140 万亿</P>
    <P t={t} at={B(67.3)} x={8000} y={8150} style={H(66)}>
      两年涨了 <span style={{ color: GOLD }}>1,000 多倍</span>
    </P>
    <Note t={t} at={B(67.5)} x={8000} y={8250}>国家数据局：2024 年初 → 2026 年 3 月</Note>
  </>
);

const Hour: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(68.5)} x={5600} y={7520} style={H(84)}>可有一样东西，</P>
    <P t={t} at={B(68.8)} x={5600} y={7630} style={H(84)}>不会每年便宜 13 倍</P>
    <P t={t} at={B(69.3)} x={5580} y={7770} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 280, lineHeight: "320px", color: GOLD, textShadow: `0 0 50px ${rgba(GOLD, 0.25)}` }}>你的一小时</P>
  </>
);

// ---------- 九 the ending ----------

const Ending: React.FC<{ t: number }> = ({ t }) => (
  <P t={t} at={B(70.9)} x={5000} y={8700} slam style={H(116, { lineHeight: "140px" })}>
    AI 越便宜，账单上越贵的，是<span style={{ color: GOLD }}>你</span>
  </P>
);

// back on the $200 man: the question gets its answer
const Callback: React.FC<{ t: number }> = ({ t }) => (
  <>
    <Stamp t={t} at={B(73.6)} x={5450} y={1530} rot={-9} size={130} color={GOLD}>没算错</Stamp>
    <P t={t} at={B(74.1)} x={4300} y={1860} style={H(64)}>那个每个月花 200 美元的人，没有算错</P>
    <P t={t} at={B(74.9)} x={4300} y={1950} style={H(84, { color: GOLD })}>对他来说，这确实是最便宜的 AI</P>
    <P t={t} at={B(76.5)} x={4280} y={2100} slam style={{ fontFamily: SERIF, fontWeight: 700, fontSize: 150, lineHeight: "180px" }}>那你的一小时，值多少？</P>
  </>
);

const SOURCES = [
  "价格：OpenAI、Anthropic、Moonshot、智谱、DeepSeek 官网（2026 年 10 月）",
  "做一道难题的花费、做对比例：Artificial Analysis（智能指数 Cost per Task；Terminal-Bench 4.0）",
  "包月额度：SemiAnalysis（2026-10-05）；Kimi 为科技博主实测（2026-10-24）；智谱为官方档位折算",
  "每周上限：Anthropic（2025-07-28）",
  "价格趋势：Epoch AI《The plunging price of thought》（2026-09-22）",
  "token 用量：国家数据局（2026-03-24 国新办发布会）",
  "时薪：国家统计局 2025 年城镇非私营单位平均工资",
  "人民币按 6.72 折算",
];
const EndCard: React.FC<{ t: number }> = ({ t }) => (
  <>
    <P t={t} at={B(79.0)} x={1600} y={2380} style={H(84)}>AI 的真实价格 · 第 1 集 完</P>
    <P t={t} at={B(79.4)} x={1600} y={2500} style={H(66, { color: GOLD })}>下一集：一张 AI 图，到底多少钱？</P>
    <P t={t} at={B(79.9)} x={1600} y={2640} style={Mono(28, { color: MUTE })}>信息来源</P>
    {SOURCES.map((s, i) => (
      <P key={s} t={t} at={B(80.0) + i * 0.08} x={1600} y={2690 + i * 40} dur={0.4} style={Mono(24, { color: FAINT })}>
        {s}
      </P>
    ))}
  </>
);

const Brand: React.FC<{ t: number }> = ({ t }) => {
  if (t < B(81.2)) return null;
  const o = ramp(t, B(81.2), B(81.2) + 0.6, EO);
  return (
    <div style={{ position: "absolute", left: 1400, top: 4180, width: 2000, textAlign: "center", opacity: o, transform: `scale(${lerp(1.06, 1, o)})` }}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 36 }}>
        <Img src={staticFile("mark-disc.png")} style={{ width: 190, height: 190 }} />
        <span style={H(150, { color: INK, whiteSpace: "nowrap" })}>世界的形状</span>
      </div>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 54, color: MUTE, marginTop: 24, whiteSpace: "nowrap", letterSpacing: "0.12em" }}>看见世界如何运行</div>
      <div style={{ ...Mono(40, { color: FAINT }), marginTop: 150, whiteSpace: "nowrap" }}>MakerJackie</div>
    </div>
  );
};
