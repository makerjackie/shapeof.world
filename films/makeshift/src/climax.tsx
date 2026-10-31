// Climax and end (sb 64–78.5). The signature shot: one cell is one boarding; the camera pulls out to 13.7 million
// cells. At the 1968–77 risk this field holds 39 deaths (red); at the 2018–22 risk, one. Then the discovery in gold;
// the "but" (a mandated checklist that changed nothing measurable, and the line that made the difference); back to
// MARCHF1 with a note: the last line is written into it.
import React, { useLayoutEffect, useRef } from "react";
import { Box, clamp01, EIO, EO, ramp, Say, useT, win } from "./kit";
import { Checklist } from "./flight";
import { Note2 } from "./open";
import { Caret, Chrome, Paper, Sel, cellXY } from "./sheet";
import { FONT, HAN, K, NUM } from "./theme";
import { BEAT, S } from "./time";

export const GRID_IN = S(64);
const N = 3700; // 3700² ≈ 13.7 million cells
const C0: [number, number] = [1850.5, 1850.5];
const REDS: [number, number][] = Array.from({ length: 39 }, (_, i) => {
  const a = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
  const b = Math.sin(i * 78.233 + 1.7) * 43758.5453;
  return [Math.floor((a - Math.floor(a)) * N), Math.floor((b - Math.floor(b)) * N)];
});
REDS[0] = [1903, 1822]; // the first one met on the way out, and the one that stays
const SURVIVOR = 0;
const Z0 = 140; // px per cell at the start
const Z1 = 900 / N;

const gridCam = (t: number) => {
  const u = ramp(t, S(64.1), S(66.3), EIO);
  const z = Z0 * Math.pow(Z1 / Z0, u);
  const cx = C0[0] + (N / 2 - C0[0]) * u;
  const cy = C0[1] + (N / 2 - C0[1]) * u;
  return { z, cx, cy };
};

const Field: React.FC<{ t: number; o: number; fade: number }> = ({ t, o, fade }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { z, cx, cy } = gridCam(t);
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    g.clearRect(0, 0, 1920, 1080);
    const sx = (x: number) => 960 + (x - cx) * z;
    const sy = (y: number) => 560 + (y - cy) * z;
    // paper
    const x0 = Math.max(0, sx(0));
    const y0 = Math.max(0, sy(0));
    const x1 = Math.min(1920, sx(N));
    const y1 = Math.min(1080, sy(N));
    g.fillStyle = K.paper;
    g.fillRect(x0, y0, x1 - x0, y1 - y0);
    // grid lines at 1, 10, 100, 1000 cells, each fading in once it is far enough apart to read
    for (const L of [1, 10, 100, 1000]) {
      const px = z * L;
      const a = clamp01((px - 5) / 14) * (L === 1 ? 0.9 : 0.8);
      if (a <= 0.01 || px > 4000) continue;
      g.strokeStyle = `rgba(150,158,150,${a})`;
      g.lineWidth = L >= 100 ? 1.5 : 1;
      g.beginPath();
      const i0 = Math.max(0, Math.floor((cx - 960 / z) / L));
      const i1 = Math.min(N / L, Math.ceil((cx + 960 / z) / L));
      for (let i = i0; i <= i1; i++) {
        const x = Math.round(sx(i * L)) + 0.5;
        g.moveTo(x, y0);
        g.lineTo(x, y1);
      }
      const j0 = Math.max(0, Math.floor((cy - 560 / z) / L));
      const j1 = Math.min(N / L, Math.ceil((cy + 560 / z) / L));
      for (let j = j0; j <= j1; j++) {
        const y = Math.round(sy(j * L)) + 0.5;
        g.moveTo(x0, y);
        g.lineTo(x1, y);
      }
      g.stroke();
    }
    // the starting cell: one boarding
    const k0 = 1 - ramp(t, S(64.6), S(65.0));
    if (k0 > 0) {
      g.strokeStyle = `rgba(31,138,82,${k0})`;
      g.lineWidth = 4;
      g.strokeRect(sx(C0[0] - 0.5), sy(C0[1] - 0.5), z, z);
    }
    // deaths
    REDS.forEach(([x, y], i) => {
      const gone = i === SURVIVOR ? 0 : ramp(t, S(66.6) + (i / REDS.length) * 1.4, S(66.6) + (i / REDS.length) * 1.4 + 0.25);
      const a = 1 - gone;
      if (a <= 0) return;
      const r = Math.max(z / 2, 6);
      const px = sx(x + 0.5);
      const py = sy(y + 0.5);
      if (px < -50 || px > 1970 || py < -50 || py > 1130) return;
      const glow = g.createRadialGradient(px, py, 0, px, py, r * 4);
      glow.addColorStop(0, `rgba(255,77,77,${0.55 * a})`);
      glow.addColorStop(1, "rgba(255,77,77,0)");
      g.fillStyle = glow;
      g.fillRect(px - r * 4, py - r * 4, r * 8, r * 8);
      g.fillStyle = `rgba(230,40,40,${a})`;
      if (z > 12) g.fillRect(sx(x) + 1, sy(y) + 1, z - 2, z - 2);
      else {
        g.beginPath();
        g.arc(px, py, r, 0, Math.PI * 2);
        g.fill();
      }
    });
    // the survivor ring
    const ring = ramp(t, S(67.9), S(68.3), EO);
    if (ring > 0) {
      const [x, y] = REDS[SURVIVOR];
      g.strokeStyle = `rgba(255,209,102,${ring})`;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(sx(x + 0.5), sy(y + 0.5), 22 + 10 * (1 - ring), 0, Math.PI * 2);
      g.stroke();
    }
  });
  return <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0, opacity: o * (1 - 0.9 * fade) }} />;
};

// the hospital checklist for the "but"
const HOSP = ["核对病人身份", "确认手术部位", "清点器械纱布", "确认过敏史", "确认抗生素已用"];
const HTICK = (i: number) => S(69.9) + i * (BEAT / 2);

// the ending: back to the gene sheet
const W = [120, 300, 220, 220, 220, 220];
const CW = 220;
const RH_ = 64;
const B2 = cellXY(1, 1, CW, RH_, W);

export const END_LINES_AT = S(73.6);
export const SOURCES_AT = S(76.5);
export const END_AT = S(77.45);

export const Climax: React.FC = () => {
  const t = useT();
  if (t < GRID_IN - 0.3) return null;
  const inK = ramp(t, GRID_IN - 0.25, GRID_IN + 0.1, EO);
  const fieldO = inK * (1 - ramp(t, S(69.1), S(69.45)));
  const gold = win(t, S(67.5), S(69.6), 0.3, 0.35);
  const listO = win(t, S(69.6), S(73.5), 0.35, 0.35);
  const endO = ramp(t, S(73.4), S(73.8), EO);
  const risk = ramp(t, S(66.5), S(66.9));
  if (t > END_AT + 0.6) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {fieldO > 0 ? <Field t={t} o={fieldO} fade={gold} /> : null}
      {/* labels for the field */}
      <div style={{ position: "absolute", left: 960 + 90, top: 560 - 30, fontFamily: HAN, fontWeight: 800, fontSize: 40, color: K.ink, opacity: win(t, S(64.1), S(64.7), 0.2, 0.25) }}>一格 = 一人次登机</div>
      {fieldO > 0 ? (
        <div style={{ position: "absolute", left: 1480, top: 150, width: 420, padding: "18px 24px", background: "rgba(7,8,10,0.82)", opacity: ramp(t, S(65.2), S(65.6)) * (1 - gold), fontFamily: NUM }}>
          <div style={{ fontSize: 26, color: K.sub, fontFamily: HAN, fontWeight: 600 }}>{risk < 0.5 ? "按 1968–77 年的风险" : "按 2018–22 年的风险"}</div>
          <div style={{ fontSize: 30, color: K.fg, fontWeight: 700, marginTop: 6 }}>1,370 万人次里</div>
          <div style={{ fontSize: 72, color: K.err, fontWeight: 900, lineHeight: 1.1 }}>
            {Math.max(1, Math.round(39 - 38 * ramp(t, S(66.6), S(68.0), (x) => x)))} <span style={{ fontSize: 34, color: K.fg, fontFamily: HAN }}>人遇难</span>
          </div>
        </div>
      ) : null}
      {fieldO > 0 && gold <= 0.01 ? <div style={{ position: "absolute", left: 0, top: 780, width: 1920, height: 260, background: "linear-gradient(180deg, transparent, rgba(7,8,10,0.88) 35%)", opacity: ramp(t, S(65), S(65.4)) }} /> : null}
      <Box x={110} y={850}>
        <Say at={S(65.1)} out={S(66.5)} parts={[{ t: "50", num: true }, " 年前，每 ", { t: "35 万", num: true, c: "#ff6b6b" }, "人次坐飞机，就有 1 人遇难。"]} size={50} />
      </Box>
      <Box x={110} y={850}>
        <Say at={S(66.6)} out={S(67.5)} parts={["现在，", { t: "1,370 万", num: true, c: K.ok }, "人次，才有 1 人。"]} size={56} />
      </Box>
      <Note2 at={S(65.1)} out={S(67.5)}>Barnett, MIT, 2024：每次登机的遇难风险，1968–77 年约 35 万分之一，2018–22 年约 1,370 万分之一。红点位置为示意。</Note2>
      {/* the discovery */}
      {gold > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: gold }}>
          <div style={{ position: "absolute", left: 0, top: 260, width: 1920, textAlign: "center", fontFamily: HAN, fontWeight: 600, fontSize: 34, color: K.sub, opacity: ramp(t, S(67.55), S(67.8)) }}>靠更好的飞机，也靠把每个错摊开。</div>
          <Box x={960} y={380} align="center" gap={26}>
            <Say at={S(67.85)} parts={["最靠谱的系统，也是", { t: "草台班子", mark: true }, "。"]} size={88} serif weight={900} />
            <Say at={S(68.55)} parts={["只是，它把", { t: "补丁", mark: true }, "亮了出来。"]} size={88} serif weight={900} />
          </Box>
        </div>
      ) : null}
      {/* the but */}
      <Checklist x={1150} y={190} t={t} ticks={HOSP.map((_, i) => HTICK(i))} title="手术安全核对单" items={HOSP} o={listO} extra={{ label: "护士可以当场叫停", at: S(71.9) }} />
      <Box x={110} y={250}>
        <Say at={S(69.75)} out={S(73.4)} parts={[{ t: "但是", c: K.tape }, "，光抄清单没用。"]} size={60} />
      </Box>
      <Box x={110} y={400}>
        <Say at={S(70.3)} out={S(73.4)} parts={["加拿大上百家医院强推手术清单，"]} size={42} />
        <Say at={S(70.75)} out={S(73.4)} parts={["死亡率没明显变化。"]} size={42} />
      </Box>
      <Box x={110} y={600}>
        <Say at={S(71.9)} out={S(73.4)} parts={["管用的医院，", { t: "护士能当场叫停医生", c: K.ok }, "。"]} size={42} />
        <Say at={S(72.5)} out={S(73.4)} parts={["差别在于：问题能不能", { t: "说出来", c: K.tape }, "。"]} size={50} />
      </Box>
      <Note2 at={S(70.3)} out={S(73.4)}>Urbach 等, NEJM 2014：安大略省 101 家医院强制推行手术清单，死亡率 0.71% → 0.65%，差别不显著。Pronovost 等, NEJM 2006；Dixon-Woods 等, Milbank Q 2011：密歇根授权护士在步骤遗漏时叫停操作。</Note2>
      {/* the end: MARCHF1 and a note */}
      {endO > 0 && t < SOURCES_AT + 0.6 ? (
        <div style={{ position: "absolute", inset: 0, opacity: endO }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: 0, height: 0, transformOrigin: "0 0", transform: `translate(960px, 540px) scale(${2.3 - 0.15 * ramp(t, S(73.5), S(76.6), (x) => x)}) translate(${-(B2.x + B2.w / 2 + 40)}px, ${-(B2.y + B2.h / 2 + 60)}px)` }}>
            <Paper x={0} y={0} cols={6} rows={12} cw={CW} ch={RH_} widths={W} selCol={1} selRow={1}>
              {["", "基因", "表达量", "样本 1", "样本 2", "P 值"].map((h, i) => (
                <div key={i} style={{ position: "absolute", left: cellXY(i, 0, CW, RH_, W).x + 12, top: cellXY(i, 0, CW, RH_, W).y, height: RH_, display: "flex", alignItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: 26, color: K.ink }}>
                  {h}
                </div>
              ))}
              {["MARCHF1", "SEPTIN2", "TP53", "DEC1", "MARCHF5"].map((g, i) => {
                const b = cellXY(1, i + 1, CW, RH_, W);
                return (
                  <div key={i} style={{ position: "absolute", left: b.x, top: b.y, width: b.w - 1, height: b.h - 1, display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", fontFamily: NUM, fontWeight: 600, fontSize: 30, color: K.ink, background: i < 2 ? "rgba(61,220,132,0.22)" : undefined }}>
                    {g}
                  </div>
                );
              })}
              {/* the red triangle that marks a note */}
              <div style={{ position: "absolute", left: B2.x + B2.w - 16, top: B2.y, width: 0, height: 0, borderTop: `16px solid ${K.err}`, borderLeft: "16px solid transparent", opacity: ramp(t, S(73.9), S(74.1)) }} />
              <Sel x={B2.x} y={B2.y} w={B2.w} h={B2.h} />
            </Paper>
          </div>
          <Chrome o={1} name="B2" formula={<span style={{ fontFamily: NUM }}>MARCHF1</span>} />
          {/* the note */}
          <div style={{ position: "absolute", left: 700, top: 500, width: 1100, padding: "34px 44px 40px", background: "#fff7c2", border: "2px solid #c9b55a", boxShadow: "8px 14px 36px rgba(0,0,0,0.4)", opacity: ramp(t, S(73.9), S(74.2)), display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ fontFamily: HAN, fontWeight: 700, fontSize: 24, color: "#8a7a2a" }}>批注：</div>
            <Say at={S(74.1)} parts={["每个草台班子背后，都有人在悄悄补洞。"]} size={48} color={K.ink} shadow="none" />
            <Say at={S(74.9)} parts={["很可能，就是你。"]} size={48} color={K.ink} shadow="none" />
            <div style={{ display: "flex", alignItems: "center" }}>
              <Say at={S(75.5)} parts={["下次补上的时候，", { t: "留个批注", mark: true }, "。"]} size={60} color={K.ink} shadow="none" weight={900} />
              {t > S(75.5) + 0.7 ? <Caret t={t} h={80} /> : null}
            </div>
          </div>
        </div>
      ) : null}
      <SourcesCard t={t} />
    </div>
  );
};

const SourcesCard: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, SOURCES_AT, END_AT + 0.2, 0.3, 0.2);
  if (o <= 0) return null;
  const rows = [
    "基因名被改成日期：Ziemann 等, Genome Biology 2016；改名：Bruford 等, Nature Genetics 2020",
    "英国漏报病例：英国公共卫生署 2020；Fetzer & Graeber, PNAS 2021（密接为估计）",
    "表格审计：Panko 2015；画自行车：Lawson, Memory & Cognition 2006",
    "xz 后门：CVE-2024-3094；Lasse Collin 2022；Andres Freund 2024",
    "护士：Tucker & Edmondson, California Management Review 2003",
    "航空报告：NASA ASRS 简报 2025；坐飞机的风险：Barnett, MIT 2024",
    "手术清单：Urbach 等, NEJM 2014；Pronovost 等, NEJM 2006；Dixon-Woods 等, Milbank Q 2011",
    "表格、报告和护士记录中的具体条目为示意",
  ];
  return (
    <div style={{ position: "absolute", inset: 0, background: `rgba(5,6,8,${0.94 * o})`, opacity: o }}>
      <div style={{ position: "absolute", left: 130, top: 150, fontFamily: FONT, color: K.fg }}>
        <div style={{ fontSize: 44, fontWeight: 800, marginBottom: 30, letterSpacing: 2 }}>信息来源</div>
        {rows.map((r, i) => (
          <div key={i} style={{ fontSize: 27, fontWeight: 500, color: "rgba(244,240,232,0.8)", lineHeight: 1.85 }}>
            {r}
          </div>
        ))}
      </div>
    </div>
  );
};

