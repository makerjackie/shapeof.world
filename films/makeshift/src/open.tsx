// Opening (sb 0–9.5): MARCH1 typed into a cell turns into 1-Mar on the first downbeat; a column of gene names flips to
// dates; the sheet is one of a wall of papers' supplementary tables, one in five red; back in the cell the gene is
// renamed MARCHF1; the question.
import React from "react";
import { Cam, camAt, CamKey } from "./cam";
import { Box, clamp01, EIO, EO, ESO, ramp, Say, useT, win } from "./kit";
import { Caret, cellXY, Chrome, Note, Paper, paperSize, Sel, Tile, typed, World } from "./sheet";
import { FONT, K, NUM, SERIF } from "./theme";
import { BEAT, S } from "./time";

export const ENTER = S(0);
const W = [120, 300, 220, 220, 220, 220];
const CW = 220;
const RH_ = 64;
const PAPER = { cols: 6, rows: 30, cw: CW, ch: RH_, widths: W };
const PS = paperSize(PAPER);
const B2 = cellXY(1, 1, CW, RH_, W);
const B2C: [number, number] = [B2.x + B2.w / 2, B2.y + B2.h / 2];

// Gene symbols that Excel turns into dates, and some it leaves alone (Ziemann et al. 2016).
const GENES: [string, string | null][] = [
  ["MARCH1", "1-Mar"],
  ["SEPT2", "2-Sep"],
  ["TP53", null],
  ["DEC1", "1-Dec"],
  ["MARCH5", "5-Mar"],
  ["BRCA1", null],
  ["SEPT7", "7-Sep"],
  ["SEPT9", "9-Sep"],
  ["EGFR", null],
  ["MARCH8", "8-Mar"],
  ["SEPT4", "4-Sep"],
  ["MYC", null],
  ["MARCH2", "2-Mar"],
  ["SEPT11", "11-Sep"],
  ["KRAS", null],
  ["MARCH6", "6-Mar"],
  ["SEPT6", "6-Sep"],
  ["PTEN", null],
];
const VALS = ["2.31", "0.87", "1.42", "3.05", "0.66", "1.98", "2.74", "0.51", "1.13", "4.20", "0.92", "1.67", "2.08", "0.73", "1.35", "3.61", "0.48", "1.21"];
export const FLIP_AT = (i: number) => (i === 0 ? ENTER : S(2.9) + (i - 1) * (BEAT / 2));

// The wall of supplementary tables: 16 × 8 papers; ours is (7, 4). One in five turns red (deterministic pick).
const PX = PS.w + 220;
const PY = PS.h + 260;
const WALL: { i: number; j: number; red: number }[] = [];
for (let j = 0; j < 8; j++)
  for (let i = 0; i < 16; i++) {
    const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    const r = h - Math.floor(h);
    WALL.push({ i, j, red: i === 7 && j === 4 ? 0 : r < 0.19 ? r / 0.19 : -1 });
  }
const WALL_C: [number, number] = [(PX + PS.w) / 2, (PS.h - PY) / 2];

const CLOSE: Cam = { cx: B2C[0] + 40, cy: B2C[1] + 30, z: 2.7 };
const COLV: Cam = { cx: PS.w / 2 - 330 / 0.62, cy: 560, z: 0.62 };
const WALLV: Cam = { cx: WALL_C[0], cy: WALL_C[1], z: 0.057 };
const RENAME: Cam = { cx: B2C[0] + 40, cy: B2C[1] + 60, z: 2.3 };

const cam = (t: number) => {
  const k: CamKey[] = [
    [0, { ...CLOSE, z: 2.95 }],
    [ENTER + 0.3, CLOSE, EO],
    [S(2.6), { ...CLOSE, z: 2.8 }],
    [S(3.35), COLV, ESO],
    [S(4.05), COLV],
    [S(4.9), WALLV, ESO],
    [S(5.25), { ...WALLV, z: 0.06 }],
    [S(5.95), RENAME, ESO],
    [S(7.5), { ...RENAME, z: 2.15 }],
    [S(9.5), { ...RENAME, z: 1.2 }, EIO],
  ];
  return camAt(t, k, ESO);
};

export const OPEN_END = S(9.5);
export const RENAME_AT = S(6.05);
const RENAME2_AT = S(6.75);

export const Open: React.FC = () => {
  const t = useT();
  if (t > OPEN_END + 0.1) return null;
  const c = cam(t);
  const wall = ramp(t, S(4.0), S(4.3));
  const redK = ramp(t, S(4.35), S(5.2), (x) => x);
  const dim = 0.86 * ramp(t, S(7.4), S(7.9)) ;
  const chrome = (1 - ramp(t, S(3.9), S(4.2))) + ramp(t, S(5.8), S(6.1)) * (1 - ramp(t, S(7.4), S(7.8)));
  // B2's story: typing, the date, cleared, retyped as MARCHF1
  const b2 = (() => {
    if (t < ENTER) return { s: typed("MARCH1", t, -0.18, 12.5), caret: true, date: false, k: 0 };
    if (t < RENAME_AT) return { s: "1-Mar", caret: false, date: true, k: ramp(t, ENTER, ENTER + 0.5, EO) };
    return { s: typed("MARCHF1", t, RENAME_AT + 0.08, 16), caret: t < RENAME_AT + 0.6, date: false, k: 0, fixed: ramp(t, RENAME_AT + 0.55, RENAME_AT + 0.9, EO) };
  })();
  const formula = t < ENTER ? b2.s : t < RENAME_AT ? "2026/3/1" : t < RENAME2_AT ? b2.s : typed("SEPTIN2", t, RENAME2_AT + 0.05, 16);
  const nameBox = t < RENAME2_AT ? "B2" : "B3";
  const flash = (at: number) => Math.exp(-Math.max(0, t - at) / 0.35) * (t >= at ? 1 : 0);
  return (
    <>
      <World cam={c}>
        {WALL.map((w, idx) =>
          w.i === 7 && w.j === 4 ? null : (
            <Tile key={idx} x={(w.i - 7) * PX} y={(w.j - 4) * PY} w={PS.w} h={PS.h} red={w.red >= 0 ? clamp01(redK * 1.6 - w.red * 0.6) : 0} seed={idx} o={wall} />
          ),
        )}
        <Paper x={0} y={0} {...PAPER} selCol={t < RENAME2_AT ? 1 : 1} selRow={t < RENAME2_AT ? 1 : 2} dim={dim}>
          {/* header row */}
          {["", "基因", "表达量", "样本 1", "样本 2", "P 值"].map((h, i) => (
            <div key={i} style={{ position: "absolute", left: cellXY(i, 0, CW, RH_, W).x + 12, top: cellXY(i, 0, CW, RH_, W).y, height: RH_, display: "flex", alignItems: "center", fontFamily: FONT, fontWeight: 800, fontSize: 26, color: K.ink }}>
              {h}
            </div>
          ))}
          {GENES.map(([g, d], i) => {
            const r = i + 1;
            const b = cellXY(1, r, CW, RH_, W);
            const flipped = d !== null && t >= FLIP_AT(i);
            const isB2 = i === 0;
            const isB3 = i === 1;
            let text: React.ReactNode = flipped ? d : g;
            let right = flipped;
            let red = flipped;
            if (isB2) {
              text = (
                <>
                  {b2.s}
                  {b2.caret ? <Caret t={t} h={RH_} /> : null}
                </>
              );
              right = b2.date;
              red = b2.date;
            }
            if (isB3 && t >= RENAME2_AT) {
              text = typed("SEPTIN2", t, RENAME2_AT + 0.05, 16);
              right = false;
              red = false;
            }
            const fl = d !== null ? flash(FLIP_AT(i)) : 0;
            const fixedK = isB2 ? (b2 as { fixed?: number }).fixed ?? 0 : isB3 ? ramp(t, RENAME2_AT + 0.45, RENAME2_AT + 0.8, EO) : 0;
            const bg = red ? `rgba(255,77,77,${0.12 + 0.5 * fl})` : fixedK > 0 ? `rgba(61,220,132,${0.28 * fixedK})` : undefined;
            return (
              <React.Fragment key={i}>
                <div style={{ position: "absolute", left: b.x, top: b.y, width: b.w - 1, height: b.h - 1, background: bg, display: "flex", alignItems: "center", justifyContent: right ? "flex-end" : "flex-start", padding: "0 14px", boxSizing: "border-box", fontFamily: NUM, fontWeight: 600, fontSize: 30, color: red ? "#d22b2b" : K.ink }}>
                  {text}
                </div>
                {[2, 3, 4].map((cc) => (
                  <div key={cc} style={{ position: "absolute", left: cellXY(cc, r, CW, RH_, W).x, top: b.y, width: CW - 14, height: RH_, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: NUM, fontSize: 26, color: "#4a514c" }}>
                    {cc === 2 ? VALS[i] : VALS[(i * 3 + cc) % VALS.length]}
                  </div>
                ))}
                <div style={{ position: "absolute", left: cellXY(5, r, CW, RH_, W).x, top: b.y, width: CW - 14, height: RH_, display: "flex", alignItems: "center", justifyContent: "flex-end", fontFamily: NUM, fontSize: 26, color: "#4a514c" }}>{`0.0${(i * 7) % 9 + 1}`}</div>
              </React.Fragment>
            );
          })}
          <Sel x={B2.x} y={t < RENAME2_AT ? B2.y : B2.y + RH_} w={B2.w} h={B2.h} o={1 - ramp(t, S(2.7), S(3.0)) + ramp(t, RENAME_AT - 0.3, RENAME_AT)} />
        </Paper>
      </World>
      <Chrome o={clamp01(chrome)} name={nameBox} formula={<span style={{ fontFamily: NUM }}>{formula}</span>} />
      {/* type: on the paper in the close-ups, on the dark beside the column, on a band over the wall */}
      <Note x={150} y={640} at={S(0.5)} out={S(2.75)} tail={[600, 420]}>
        <Say at={S(0.5)} parts={[{ t: "MARCH1", num: true }, "，人类的一个基因。"]} size={56} color={K.ink} shadow="none" />
        <Say at={S(1.25)} parts={["在 Excel 里一回车，它变成了", { t: "日期", c: "#d22b2b" }, "。"]} size={56} color={K.ink} shadow="none" />
      </Note>
      {win(t, S(4.05), S(5.45), 0.3, 0.3) > 0 ? <div style={{ position: "absolute", left: 0, top: 560, width: 1920, height: 440, background: "linear-gradient(180deg, transparent, rgba(7,8,10,0.88) 30%, rgba(7,8,10,0.88) 75%, transparent)", opacity: win(t, S(4.05), S(5.45), 0.3, 0.3) }} /> : null}
      <Box x={90} y={650}>
        <Say at={S(4.1)} out={S(5.45)} parts={["十年里，论文附带的基因表格，"]} size={60} />
        <Say at={S(4.55)} out={S(5.45)} parts={["约", { t: "五分之一", c: "#ff6b6b" }, "被改错了。"]} size={76} />
      </Box>
      <Note2 at={S(4.55)} out={S(5.45)}>Ziemann 等, Genome Biology 2016：18 种期刊 2005–2015 年，带 Excel 基因表的 3,597 篇论文里 704 篇（19.6%）</Note2>
      <Note x={150} y={600} at={S(5.6)} out={S(7.45)} tail={[620, 420]}>
        <Say at={S(5.6)} parts={[{ t: "2020", num: true }, " 年，科学家认输了："]} size={56} color={K.ink} shadow="none" />
        <Say at={S(6.35)} parts={["给这些基因", { t: "改了名", c: K.green }, "。"]} size={56} color={K.ink} shadow="none" />
      </Note>
      <Note2 at={S(6.4)} out={S(7.45)} ink>
        人类基因命名委员会：「所有会被 Excel 自动转成日期的符号都已更改（SEPT1 改为 SEPTIN1，MARCH1 改为 MARCHF1 等）」 Bruford 等, Nature Genetics 2020
      </Note2>
      <Question t={t} />
    </>
  );
};

const Question: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(7.55), S(9.45), 0.2, 0.3);
  if (o <= 0) return null;
  const k = ramp(t, S(7.55), S(8.0), EO);
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, display: "flex", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 124, color: K.fg, letterSpacing: 6, transform: `scale(${1.08 - 0.08 * k})`, textShadow: "0 0 60px rgba(0,0,0,0.9)" }}>
        社会，真的是个<span style={{ color: K.tape }}>草台班子</span>吗？
      </div>
    </div>
  );
};

// A source line, bottom left; `ink` for when it sits on paper.
export const Note2: React.FC<{ at: number; out: number; ink?: boolean; children: React.ReactNode }> = ({ at, out, ink, children }) => {
  const t = useT();
  const o = win(t, at, out, 0.3, 0.3);
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 64, bottom: 66, maxWidth: 1760, fontFamily: FONT, fontSize: 23, fontWeight: 500, color: ink ? "rgba(29,36,32,0.72)" : "rgba(244,240,232,0.62)", background: ink ? "rgba(251,251,247,0.94)" : undefined, padding: ink ? "6px 12px" : undefined, opacity: o, lineHeight: 1.4, textShadow: ink ? "none" : "0 2px 6px rgba(0,0,0,0.8)" }}>
      {children}
    </div>
  );
};
