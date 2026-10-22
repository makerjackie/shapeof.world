import React from "react";
import { AbsoluteFill, Img, interpolate, interpolateColors, random, staticFile } from "remotion";
import { Branch, Cell, gridGeo, LifeGrid, Trunk } from "../grid";
import { CL, EBACK, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, PASTEL, SERIF } from "../theme";
import { FPB } from "../timing";
import { Box, Cap, Head } from "../ui";

// 85 s: the stance. Only the trunk is left, a light running along it.
export const Stance: React.FC = () => {
  const frame = useBeatFrame();
  const run = (frame / (FPB * 6)) % 1;
  const lx = -200 + run * 2320;
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <radialGradient id="runlight">
            <stop offset="0%" stopColor={K.themeHi} stopOpacity={0.9} />
            <stop offset="100%" stopColor={K.theme} stopOpacity={0} />
          </radialGradient>
        </defs>
        {[300, 820, 1350].map((x0, i) => (
          <Branch key={i} b={{ x0, x1: x0 + 300, y: 720, dy: i % 2 ? 110 : -110, color: [K.lilac, K.steel, K.sand][i], grow: 1, w: 2, o: 0.22 }} />
        ))}
        <Trunk x0={-20} x1={1940} y={720} glow={0.9} w={6} />
        <ellipse cx={lx} cy={720} rx={160} ry={26} fill="url(#runlight)" />
      </svg>
      <Box x={960} y={300} cx style={{ gap: 20 }}>
        <Cap at={0} size={40} color={K.muted} from="fade">我们的看法：</Cap>
        <Head at={1} parts={["活着本身，"]} size={110} />
        <Head at={3} parts={[{ t: "就够了", c: K.theme }, "。"]} size={110} />
      </Box>
    </AbsoluteFill>
  );
};

// The relit grid, shared by the last scenes. A viewer about 28: the past lights up warm instead of going dark; the
// future turns into empty frames; then a few of them get painted.
const NOW = 28;
const FULL = { x: 447, y: 250, pitch: 13, cell: 10 };
const FG = gridGeo(FULL.x, FULL.y, FULL.pitch, FULL.cell);
const PAINTED = (() => {
  const m = new Map<number, { c: string; at: number }>();
  for (let k = 0; k < 90; k++) {
    const col = NOW + 1 + Math.floor(random(`pc${k}`) * (79 - NOW - 1));
    const row = Math.floor(random(`pr${k}`) * 52);
    m.set(col * 52 + row, { c: PASTEL[Math.floor(random(`pk${k}`) * PASTEL.length)], at: random(`pa${k}`) });
  }
  return m;
})();

// past: 0–1 wave across the past; frames: 0–1 future squares become outlines; paint: 0–1 how many get coloured.
const relit = (past: number, frames: number, paint: number) => (col: number, row: number): Cell | null => {
  if (col < NOW) {
    const on = interpolate(past * (NOW + 6) - col - (row / 52) * 4, [0, 3], [0, 1], CL);
    if (on <= 0) return null;
    const warm = interpolateColors(random(`w${col}-${row}`), [0, 1], [K.theme, K.gold]);
    return { c: warm, o: 0.14 + on * (0.4 + 0.35 * random(`o${col}-${row}`)) };
  }
  const p = PAINTED.get(col * 52 + row);
  if (p) {
    const t = interpolate(paint, [p.at * 0.8, p.at * 0.8 + 0.2], [0, 1], CL);
    if (t > 0) return { c: p.c, o: 0.15 + 0.75 * t };
  }
  if (frames > 0) return { c: K.fg, o: 0.14 + 0.26 * frames, outline: true };
  return null;
};

export const RelitGrid: React.FC<{ past: number; frames: number; paint: number; o?: number; cursor?: number }> = ({ past, frames, paint, o = 1, cursor = 0 }) => (
  <LifeGrid {...FULL} paint={relit(past, frames, paint)} glow={0.8} o={o}>
    {cursor > 0 ? (
      <g opacity={cursor}>
        <line x1={FG.ageX(NOW) - 2} y1={FULL.y - 14} x2={FG.ageX(NOW) - 2} y2={FULL.y + FG.h + 14} stroke={K.themeHi} strokeWidth={3} strokeLinecap="round" />
        <circle cx={FG.ageX(NOW) - 2} cy={FULL.y - 14} r={6} fill={K.themeHi} />
      </g>
    ) : null}
  </LifeGrid>
);

export const Relight: React.FC = () => {
  const frame = useBeatFrame();
  const past = progAt(frame, 0.5, 4, EIO);
  const cursor = progAt(frame, 4, 1, EO);
  const frames = progAt(frame, 6, 1.5, EO);
  const paint = progAt(frame, 9, 6, EIO);
  return (
    <AbsoluteFill>
      <RelitGrid past={past} frames={frames} paint={paint} cursor={cursor} />
      <div style={{ position: "absolute", left: FG.ageX(NOW) - 30, top: FULL.y - 62 }}>
        <In at={4} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 700, color: K.themeHi, whiteSpace: "nowrap" }}>现在</div>
        </In>
      </div>
      <Box x={960} y={70} cx>
        <Head at={0} out={6.5} parts={["过去的格子，", { t: "不用涂黑", c: K.theme }, "。"]} size={72} />
      </Box>
      <Box x={960} y={70} cx>
        <Head at={7} parts={["剩下的，", { t: "留给你自己选颜色", c: K.theme }, "。"]} size={72} />
      </Box>
    </AbsoluteFill>
  );
};

// 103 s: the closing line, on the music's peak.
export const Closing: React.FC = () => (
  <AbsoluteFill>
    <RelitGrid past={1} frames={1} paint={1} o={0.22} />
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, rgba(7,9,11,0.75) 0%, rgba(7,9,11,0.3) 50%, transparent 75%)" }} />
    <Box x={960} y={330} cx style={{ gap: 36 }}>
      <Head at={0} parts={["用自己的方式，过完一生，"]} size={84} />
      <Head at={3} parts={[{ t: "活着便是成功", c: K.gold }, "。"]} size={128} />
    </Box>
  </AbsoluteFill>
);

// 110 s: back to the first sentence.
export const Callback: React.FC = () => {
  const frame = useBeatFrame();
  const draw = progAt(frame, 0, 2.5, EIO);
  return (
    <AbsoluteFill>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {[180, 560, 900, 1240, 1480].map((x0, i) => (
          <Branch key={i} b={{ x0, x1: x0 + 320, y: 700, dy: i % 2 ? -120 : 120, color: [K.steel, K.sand, K.lilac][i % 3], grow: progAt(frame, 1.5 + i * 0.4, 1.6, EO), w: 3, o: 0.6 }} />
        ))}
        <Trunk x0={-20} x1={1940} y={700} draw={draw} glow={0.8} w={5} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 350, display: "flex", justifyContent: "center" }}>
        <Head at={0} parts={[{ t: "活着是主线，", c: K.theme }, "其他都是支线。"]} size={104} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- Fixed end sequence: sources → making-of → brand card ----------

const NOTES = [
  "约 4100 周 = 79.0 岁 × 52.18 周。53% 为本片推算：（有酬劳动 264 + 交通 38 + 无酬劳动 162 分钟）÷ 醒着的 881 分钟，15 岁以上全体均值，含不上班的人。",
  "片中的研究多为相关，不是因果；奖励削弱兴趣在学界有争议。“活着本身就够了”是本片的看法，不是研究结论。",
];

const SOURCES = [
  "国家卫生健康委 · 2024 年我国卫生健康事业发展统计公报 · 2025　｜　国家统计局 · 2018 年全国时间利用调查公报 · 2019",
  "盖洛普 · State of the Global Workplace: 2026 Report · 2026",
  "Deci, Koestner & Ryan · Psychological Bulletin · 1999　｜　Cameron & Pierce · Review of Educational Research · 1994",
  "Cerasoli, Nicklin & Ford · Psychological Bulletin · 2014　｜　Holt-Lunstad, Smith & Layton · PLoS Medicine · 2010",
  "哈佛成人发展研究（Grant & Glueck Study）· 研究官网 · 2026　｜　Harvard Gazette · 2017",
];

const Dimmed: React.FC = () => <RelitGrid past={1} frames={1} paint={1} o={0.12} />;

export const Sources: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={130} y={140} style={{ gap: 18 }} w={1660}>
      <In at={0} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg }}>口径与说明</div>
      </In>
      {NOTES.map((t, i) => (
        <In key={i} at={0.4 + i * 0.3} from="up">
          <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={1.2} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg, marginTop: 30 }}>来源</div>
      </In>
      {SOURCES.map((t, i) => (
        <In key={i} at={1.5 + i * 0.25} from="up">
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={3} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 500, color: K.muted, marginTop: 24 }}>数据截至 2026 年 10 月 22 日</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const MAKING: [string, string][] = [
  ["选题与撰稿", "MakerJackie"],
  ["数据核对", "MakerJackie"],
  ["画面", "代码逐帧渲染"],
  ["配乐", "原创，代码生成"],
  ["制作", "MakerJackie"],
];

export const Making: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={960} y={330} cx style={{ gap: 14 }}>
      {MAKING.map(([r, n], i) => (
        <In key={r} at={i * 0.25} from="up">
          <div style={{ display: "flex", fontFamily: FONT, alignItems: "baseline" }}>
            <div style={{ width: 300, textAlign: "right", paddingRight: 36, fontSize: 34, fontWeight: 700, color: K.muted }}>{r}</div>
            <div style={{ width: 420, fontSize: 44, fontWeight: 700, color: K.fg }}>{n}</div>
          </div>
        </In>
      ))}
      <In at={1.6} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: K.sub, marginTop: 30 }}>代码逐帧渲染 · Claude 协作</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const FROM = Array.from("活着是主线");
const TO = Array.from("世界的形状");

// The title turns into 世界的形状, the orb lands, then the slogan. The audio logo plays on beat 0.
export const BrandCard: React.FC = () => {
  const frame = useBeatFrame();
  const mark = progAt(frame, 1.4, 1.6, EBACK);
  const halo = progAt(frame, 1.4, 2, EO);
  const slogan = progAt(frame, 3, 1, EO);
  const size = 150;
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <div style={{ position: "absolute", left: 960 - 130, top: 170, width: 260, height: 260 }}>
          <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.22 * halo}) 0%, rgba(140,196,212,${0.08 * halo}) 45%, transparent 70%)` }} />
          <Img src={staticFile("mark-disc.png")} style={{ width: 260, height: 260, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -60}px) scale(${0.7 + 0.3 * mark})` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", gap: 6, perspective: 1400 }}>
        {FROM.map((ch, i) => {
          const q = progAt(frame, 0.3 + i * 0.12, 0.9, EIO);
          const front = q < 0.5;
          const ang = front ? q * 180 : (q - 1) * 180;
          return (
            <div key={i} style={{ width: size * 1.02, height: size * 1.25, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateX(${ang}deg)` }}>
              <span style={{ fontFamily: front ? FONT : SERIF, fontWeight: front ? 900 : 700, fontSize: size, color: front ? K.theme : K.fg, lineHeight: 1 }}>{front ? ch : TO[i]}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", opacity: slogan, transform: `translateY(${(1 - slogan) * 20}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: K.sub, letterSpacing: 10, whiteSpace: "nowrap" }}>看见世界如何运行</div>
      </div>
    </AbsoluteFill>
  );
};
