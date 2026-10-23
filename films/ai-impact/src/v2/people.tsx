import React from "react";
import { AbsoluteFill } from "remotion";
import { CAPEX, METR, NVDA, Pt, UNRATE, WAU, yr } from "../data";
import { FONT } from "../theme";
import { Door, Laptop, Person } from "./art";
import { Backdrop, C, Cam, EBACK, EIO, EO, Label, lerp, Line, pr, Src, useT } from "./kit";

const PINK = "#f472b6";

// ── 0:56–1:04 · Everything above shot up; unemployment barely moved. Four ghost curves (each from its own start = 1×, log
// scale) draw fast, then dim while the US unemployment line crawls along the floor. ──
const UB = { x: 170, y: 420, w: 1300, h: 500 };
const UT0 = yr("2022-11-30");
const UT1 = yr("2026-10-21");
const ux = (d: string) => UB.x + ((yr(d) - UT0) / (UT1 - UT0)) * UB.w;
const uy = (r: number) => UB.y + UB.h - (Math.log(Math.max(1, r)) / Math.log(300)) * UB.h;
const norm = (pts: Pt[]): [number, number][] => pts.map(([d, v]) => [ux(d < "2022-11-30" ? "2022-11-30" : d), uy(v / pts[0][1])]);
const capexTot = CAPEX.map((c) => c.amzn + c.goog + c.msft + c.meta);
const GHOSTS: { name: string; color: string; pts: [number, number][]; end: string; dy: number }[] = [
  { name: "AI 干活时长", color: C.cyan, pts: norm(METR.map((m) => [m.d, m.v] as Pt)), end: "×260", dy: 0 },
  { name: "英伟达", color: C.orange, pts: norm(NVDA), end: "×13", dy: -40 },
  { name: "ChatGPT 用户", color: "#7fe3ff", pts: norm(WAU), end: "×12", dy: 8 },
  { name: "大厂投入", color: "#ffc078", pts: norm(CAPEX.map((c, i) => [i === 0 ? "2022-11-30" : `${c.y}-07-01`, capexTot[i]] as Pt)), end: "×4.9", dy: 0 },
];
const UN_PTS = norm(UNRATE.map(([d, v]) => [`${d}-15`, v] as Pt));
const path = (pts: [number, number][], k: number) => {
  const n = Math.max(1, Math.round(k * (pts.length - 1)));
  return pts
    .slice(0, n + 1)
    .map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join("");
};

export const Jobless: React.FC = () => {
  const t = useT();
  const dim = pr(t, 57.58, 0.5, EIO);
  const un = pr(t, 57.83, 1.5, EIO);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.fg} at={[50, 80]} strength={0.05} />
      {[1, 10, 100].map((g) => (
        <React.Fragment key={g}>
          <div style={{ position: "absolute", left: UB.x, width: UB.w, top: uy(g), height: 1, background: g === 1 ? "rgba(244,240,232,0.25)" : C.line }} />
          <div style={{ position: "absolute", left: UB.x - 16, top: uy(g) - 14, transform: "translateX(-100%)", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.muted }}>×{g}</div>
        </React.Fragment>
      ))}
      {[2023, 2024, 2025, 2026].map((y) => (
        <div key={y} style={{ position: "absolute", left: ux(`${y}-01-01`), top: UB.y + UB.h + 14, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.muted }}>
          {y}
        </div>
      ))}
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {GHOSTS.map((g, i) => {
          const k = pr(t, 56.2 + i * 0.12, 1.1, EIO);
          if (k <= 0) return null;
          return <path key={g.name} d={path(g.pts, k)} fill="none" stroke={g.color} strokeWidth={4} strokeLinejoin="round" opacity={lerp(1, 0.28, dim)} />;
        })}
        {un > 0 ? <path d={path(UN_PTS, un)} fill="none" stroke={C.fg} strokeWidth={8} strokeLinejoin="round" strokeLinecap="round" /> : null}
      </svg>
      {GHOSTS.map((g, i) => {
        const [x, y] = g.pts[g.pts.length - 1];
        const p = pr(t, 57.08 + i * 0.08, 0.3);
        return (
          <div key={g.name} style={{ position: "absolute", left: x + 16, top: y - 16 + g.dy, opacity: p * lerp(1, 0.4, dim), fontFamily: FONT, fontSize: 24, fontWeight: 800, color: g.color, whiteSpace: "nowrap" }}>
            {g.name} {g.end}
          </div>
        );
      })}
      <div style={{ position: "absolute", left: UB.x + UB.w + 16, top: UN_PTS[UN_PTS.length - 1][1] - 70, opacity: pr(t, 59.08, 0.4), fontFamily: FONT, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: C.sub }}>美国失业率</div>
        <div style={{ fontSize: 50, fontWeight: 900, color: C.fg }}>3.6% → 4.2%</div>
      </div>
      <Line at={57.58} text="可是，失业率几乎没动。" kw="几乎没动" kwAt={59.08} />
      <Src at={56.4}>美国劳工统计局（BLS）失业率，2022-11 → 2026-09 · 其余四条为前文数据，各自以起点为 1 倍（对数刻度）</Src>
    </AbsoluteFill>
  );
};

// ── 1:04–1:12 · Who did it touch? A corridor of doors by age; the camera steps along on the bar lines and stops at the
// smallest door, 22–25 岁, where a graduate stands. ──
const AGES = ["50 岁以上", "41–49 岁", "35–40 岁", "31–34 岁", "26–30 岁", "22–25 岁"];
const DOOR_X = (i: number) => 330 + i * 430;
const FLOOR = 930;

const Walker: React.FC<{ t: number; x: number; seed: number }> = ({ t, x, seed }) => {
  const ph = (t * 0.45 + seed) % 1;
  return (
    <div style={{ position: "absolute", left: x - 110 + ph * 110 - 18, top: FLOOR - 76 - ph * 30, opacity: Math.min(1, (1 - ph) * 3) * Math.min(1, ph * 6), transform: `scale(${1 - ph * 0.35})`, transformOrigin: "50% 100%" }}>
      <Person h={76} color="#5f6a79" />
    </div>
  );
};

export const Who: React.FC = () => {
  const t = useT();
  const tx = [0, -430, -860, -1300];
  const keys: [number, number, number, number][] = [
    [64.08, tx[0], 0, 1],
    [65.08, tx[0], 0, 1],
    [65.98, tx[1], 0, 1],
    [67.08, tx[1], 0, 1],
    [67.98, tx[2], 0, 1],
    [69.08, tx[2], 0, 1],
    [69.98, tx[3], 0, 1],
  ];
  const grad = pr(t, 70.08, 0.4, EBACK);
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[60, 75]} strength={0.07} />
      <div style={{ position: "absolute", left: 0, right: 0, top: FLOOR, height: 2, background: C.line }} />
      <Cam keys={keys}>
        {AGES.map((a, i) => {
          const last = i === AGES.length - 1;
          const w = last ? 170 : 200;
          const h = last ? 330 : 380;
          const x = DOOR_X(i);
          return (
            <React.Fragment key={a}>
              <div style={{ position: "absolute", left: x - w / 2, top: FLOOR - h }}>
                <Door w={w} h={h} light={0.75} />
              </div>
              <div style={{ position: "absolute", left: x, top: FLOOR - h - 70, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: last ? C.gold : C.sub, whiteSpace: "nowrap" }}>{a}</div>
              {!last ? [0, 0.33, 0.66].map((s) => <Walker key={s} t={t} x={x} seed={s + i * 0.17} />) : null}
              {last ? (
                <div style={{ position: "absolute", left: x - 150, top: FLOOR - 96, opacity: grad, transform: `translateY(${(1 - grad) * 20}px)` }}>
                  <Person h={96} color="#8b95a3" cap={1} />
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </Cam>
      <Line at={66.08} text="那 AI 到底碰到了谁？" />
    </AbsoluteFill>
  );
};

// ── 1:12–1:20 · The finding, on the biggest re-entry: at 22–25, the door into the jobs AI can do most easily narrows
// (−11%, the lost strip hatched red against the old width); the door into the jobs it does worst widens (+10%). ──
const FD = [
  { x: 620, label: "AI 最容易做的岗位", d: -0.11, at: 72.08, color: C.red, tag: "−11%" },
  { x: 1300, label: "AI 最难做的岗位", d: 0.1, at: 74.08, color: C.green, tag: "+10%" },
];
const FW = 360;
const FH = 470;

export const Finding: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill>
      <Backdrop glow={C.gold} at={[45, 70]} strength={0.12} />
      <div style={{ position: "absolute", left: 0, right: 0, top: FLOOR, height: 2, background: C.line }} />
      <Label x={960} y={330} anchor="center" size={28} color={C.sub} at={72.33} weight={800}>
        22–25 岁的人，2022 年底 → 今年
      </Label>
      {FD.map((f, i) => {
        const show = i === 0 ? pr(t, 71.98, 0.25) : pr(t, 73.58, 0.4);
        const p = pr(t, f.at, 0.28, i === 0 ? EBACK : EO);
        const left = f.x - FW / 2;
        const w = FW * (1 + f.d * Math.min(1, p));
        const strip = Math.abs(w - FW);
        const tag = pr(t, f.at + 0.5, 0.35, EBACK);
        return (
          <React.Fragment key={f.label}>
            <div style={{ position: "absolute", left, top: FLOOR - FH, opacity: show }}>
              <Door w={w} h={FH} light={0.85} />
            </div>
            {strip > 1 ? (
              <div
                style={{
                  position: "absolute",
                  left: left + Math.min(w, FW),
                  top: FLOOR - FH,
                  width: strip,
                  height: FH,
                  background: f.d < 0 ? `repeating-linear-gradient(135deg, ${C.red}cc 0 6px, transparent 6px 12px)` : `${C.green}88`,
                  border: `2px dashed ${f.d < 0 ? C.red : C.green}`,
                  boxSizing: "border-box",
                }}
              />
            ) : null}
            <div style={{ position: "absolute", left: f.x, top: FLOOR - FH - 64, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 30, fontWeight: 900, color: C.fg, whiteSpace: "nowrap", opacity: show }}>
              {f.label}
            </div>
            <div style={{ position: "absolute", left: left + FW + 40, top: FLOOR - FH / 2 - 56, transform: `scale(${tag})`, transformOrigin: "0 50%", opacity: Math.min(1, tag * 2), fontFamily: FONT, fontSize: 92, fontWeight: 900, color: f.color, whiteSpace: "nowrap" }}>
              {f.tag}
            </div>
          </React.Fragment>
        );
      })}
      <Label x={960} y={FLOOR + 24} anchor="center" size={24} color={C.muted} at={76.08}>
        26 岁以上的人：同样的岗位，人数没有减少
      </Label>
      <Line at={72.08} text="变窄的，是第一份工作的门。" kw="第一份工作" kwAt={73.08} />
      <Src at={72.4}>Brynjolfsson 等（斯坦福数字经济实验室），ADP（美国最大的薪资服务商）工资单，2022-11 → 2026-06；AI 暴露度最高两档 vs 最低三档 · 描述性证据，非因果</Src>
    </AbsoluteFill>
  );
};

// ── 1:20–1:24 · Coders: five at their laptops in each row; one 22–25 leaves (−19%), one more 41–49 sits down (+20%). ──
const Coder: React.FC<{ tone: string }> = ({ tone }) => (
  <div style={{ position: "relative", width: 150, height: 170 }}>
    <div style={{ position: "absolute", left: 40, top: 0 }}>
      <Person h={140} color={tone} />
    </div>
    <div style={{ position: "absolute", left: 8, top: 92 }}>
      <Laptop w={134} color="#3a424e" />
    </div>
  </div>
);

export const Devs: React.FC = () => {
  const t = useT();
  const rows = [
    { y: 390, label: "22–25 岁", delta: -1, at: 81.08, color: C.red, tag: "约 −19%" },
    { y: 680, label: "41–49 岁", delta: 1, at: 81.58, color: C.green, tag: "约 +20%" },
  ];
  return (
    <AbsoluteFill>
      <Backdrop glow={PINK} at={[50, 60]} strength={0.08} />
      {rows.map((r) => (
        <React.Fragment key={r.label}>
          <Label x={160} y={r.y + 70} size={36} color={C.fg} at={80.2} weight={900}>
            {r.label}
          </Label>
          {Array.from({ length: 5 + Math.max(0, r.delta) }).map((_, i) => {
            const extra = i >= 5;
            const leaving = r.delta < 0 && i === 4;
            const pin = pr(t, 80.08 + i * 0.05, 0.3, EO);
            const out = leaving ? pr(t, r.at, 0.45, EIO) : 0;
            const add = extra ? pr(t, r.at, 0.4, EBACK) : 1;
            return (
              <div key={i} style={{ position: "absolute", left: 420 + i * 200 + out * 120, top: r.y + (1 - pin) * 16, opacity: pin * (1 - out) * Math.min(1, add * 2), transform: `scale(${extra ? add : 1})`, transformOrigin: "50% 100%" }}>
                <Coder tone={leaving && out > 0.1 ? "#9a4448" : extra ? "#3f8a6c" : "#5f6a79"} />
              </div>
            );
          })}
          <div style={{ position: "absolute", left: 420 + (5 + Math.max(0, r.delta)) * 200 - 10, top: r.y + 50, opacity: pr(t, r.at + 0.4, 0.35), fontFamily: FONT, fontSize: 64, fontWeight: 900, color: r.color, whiteSpace: "nowrap" }}>{r.tag}</div>
        </React.Fragment>
      ))}
      <Line at={80.08} text="写代码的新人，少了五分之一。" kw="五分之一" kwAt={81.58} />
      <Src at={80.4}>同上论文：美国软件开发者人数，2022-11 → 2026-06，读自论文附图（±0.5%）· 每排 5 人为示意</Src>
    </AbsoluteFill>
  );
};
