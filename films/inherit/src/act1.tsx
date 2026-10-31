// 1 俗话 (SB 7.5–11.5) and 2 钱，确实留不住 (SB 11.5–19.5).
import React from "react";
import { EIN, EIO, EO, clamp01, keys, lerp, ramp, win } from "./kit";
import { FONT, K, NUM, SERIF } from "./theme";
import { BEAT, S, SB } from "./timing";
import { Big, Cap, Label, Num, Tree, buildTree, rnd } from "./world";
import type { Node } from "./world";

// ---------- 1 俗话: three slips of old paper slapped onto the table, one at a time ----------
const slipIn = (t: number, at: number) => ramp(t, at, at + 0.18, EIN);

const Slip: React.FC<{ t: number; at: number; fanAt: number; slot: number; w: number; h: number; rot: number; children: React.ReactNode; bg?: string }> = ({
  t, at, fanAt, slot, w, h, rot, children, bg = "#e9dcc0",
}) => {
  const k = slipIn(t, at);
  if (k <= 0) return null;
  const fan = ramp(t, fanAt, fanAt + 0.6, EIO);
  const out = ramp(t, S(SB.money) - 0.3, S(SB.money) + 0.2, EIO);
  const x = lerp(960, 380 + slot * 580, fan);
  const y = lerp(470, 430, fan);
  const s = lerp(1.4, 1, k) * lerp(1, 0.78, fan);
  // the newest slip is the only bright one until they fan out
  return (
    <div style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, background: bg, borderRadius: 4, opacity: k * (1 - out),
      transform: `rotate(${lerp(rot * 2, rot, k)}deg) scale(${s})`, boxShadow: "0 30px 60px rgba(0,0,0,0.6), inset 0 0 60px rgba(120,80,30,0.35)", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(ellipse at 80% 90%, rgba(110,70,30,0.25), transparent 60%)" }} />
      {children}
    </div>
  );
};

export const Sayings: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.say);
  if (t < a - 0.2 || t > S(SB.money) + 0.4) return null;
  const at = [a, a + S(0.75), a + S(2)];
  const fanAt = a + S(3.25);
  return (
    <>
      <Slip t={t} at={at[0]} fanAt={fanAt} slot={0} w={620} h={300} rot={-3}>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 30, color: "#6b4a28", letterSpacing: 6 }}>中国老话</div>
          <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 104, color: "#241a10", letterSpacing: 12, marginTop: 10 }}>富不过三代</div>
        </div>
      </Slip>
      <Slip t={t} at={at[1]} fanAt={fanAt} slot={1} w={600} h={330} rot={2.5} bg="#e4dcc8">
        <div style={{ position: "absolute", left: 30, right: 30, top: 22, borderBottom: "3px double #3a3026", paddingBottom: 8, textAlign: "center", fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 34, color: "#2b241c", letterSpacing: 3 }}>
          THE PRESTON CHRONICLE
        </div>
        <div style={{ position: "absolute", left: 30, right: 30, top: 82, textAlign: "center", fontFamily: "Georgia, serif", fontSize: 20, color: "#4a3f33", letterSpacing: 2 }}>SATURDAY, FEBRUARY 1, 1868</div>
        <div style={{ position: "absolute", left: 40, right: 40, top: 128, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 44, lineHeight: 1.25, color: "#1f1912", textAlign: "center" }}>
          “There are only three generations from clogs to clogs.”
        </div>
      </Slip>
      <Slip t={t} at={at[2]} fanAt={fanAt} slot={2} w={360} h={520} rot={-2} bg="#eadfc6">
        <div style={{ position: "absolute", right: 70, top: 40, writingMode: "vertical-rl", fontFamily: SERIF, fontWeight: 900, fontSize: 56, color: "#1d150d", letterSpacing: 6, lineHeight: 1.1 }}>
          売り家と唐様で書く三代目
        </div>
        <div style={{ position: "absolute", left: 40, bottom: 44, width: 54, height: 54, border: `4px solid ${K.seal}`, borderRadius: 4, color: K.seal, fontFamily: SERIF, fontWeight: 900, fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
          川柳
        </div>
      </Slip>
      <Cap at={at[1] + 0.2} out={at[2] - 0.1} lines={["英国 1868 年的报纸：", "木屐到木屐，只隔三代。"]} />
      <Cap at={at[2] + 0.2} out={fanAt - 0.05} lines={["日本江户的俗话：", "第三代卖房，招牌上的字写得很讲究。"]} />
      <Cap at={fanAt + 0.3} out={S(SB.money) - 0.1} lines={["好多地方的人，都这么说。"]} />
    </>
  );
};

const CAPBIG = 860;

// ---------- 2 钱，确实留不住 ----------
// 400 nameplates (Forbes 400, 1982). 34 stay lit to 2014. 13 Rockefeller plates go out to 1.
const COLS = 25;
const PW = 46;
const PH = 22;
const GAP = 8;
const GX = 960 - (COLS * (PW + GAP) - GAP) / 2;
const GY = 250;
const plate = (i: number) => ({ x: GX + (i % COLS) * (PW + GAP), y: GY + Math.floor(i / COLS) * (PH + GAP) });
// which 34 survive, which 13 are Rockefellers (a cluster), which Rockefeller survives
const SURVIVE = new Set(Array.from({ length: 400 }, (_, i) => i).sort((a, b) => rnd(a, 21) - rnd(b, 21)).slice(0, 34));
const ROCK = [106, 107, 108, 109, 110, 131, 132, 133, 134, 135, 156, 157, 158];
const ROCK_KEEP = 132;
ROCK.forEach((i) => SURVIVE.delete(i));
SURVIVE.add(ROCK_KEEP);
// keep the survivor count at 34
while (SURVIVE.size > 34) SURVIVE.delete([...SURVIVE].find((i) => i !== ROCK_KEEP)!);

export const Money: React.FC<{ t: number }> = ({ t }) => {
  const a = S(SB.money);
  const end = S(SB.bang);
  if (t < a - 0.2 || t > end + 0.4) return null;
  const tOff = a + S(1.5); // 1982 → 2014
  const tRock = a + S(3.0);
  const tKids = a + S(4.6);
  const tLose = a + S(6.0);
  const gridO = win(t, a, tKids + 0.2, 0.4, 0.5);
  const rockFocus = ramp(t, tRock, tRock + 0.4, EO);

  // grandchildren: one grandfather, 100 grandchildren in 4 rows of 25
  const kidsNodes: Node[] = buildTree(960, 250, 150, [1, 25, 25, 25, 25], [0, 1300, 1300, 1300, 1300]).map((n) =>
    n.row === 0 ? n : { ...n, y: n.row === 1 ? 470 : 470 + (n.row - 1) * 64, parent: 0 },
  );
  const KEEP = new Set([7, 19, 33, 48, 61, 77, 92]); // 7 of 100 stay in the top 1%
  const lossAt = (n: Node) => (n.row === 0 || KEEP.has(n.i + (n.row - 1) * 25) ? null : tLose + rnd(n.i + n.row * 25, 4) * 1.2);
  const kidsO = win(t, tKids, end + 0.2, 0.4, 0.4);

  return (
    <>
      {gridO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: gridO }}>
          <Label x={960} y={190} o={1 - ramp(t, tOff + 1.2, tOff + 1.6, EIO)} size={46} color={K.gold}>1982 · 福布斯 400</Label>
          <Label x={960} y={190} o={ramp(t, tOff + 1.2, tOff + 1.6, EIO) * (1 - rockFocus)} size={46} color={K.gold}>2014</Label>
          <Label x={960} y={190} o={rockFocus} size={46} color={K.gold}>洛克菲勒家</Label>
          {Array.from({ length: 400 }, (_, i) => {
            const p = plate(i);
            const survive = SURVIVE.has(i);
            const offAt = tOff + rnd(i, 22) * 1.4;
            const on = survive ? 1 : 1 - clamp01((t - offAt) / 0.25);
            const isRock = ROCK.includes(i);
            // the Rockefeller beat: their 13 plates relight in outline, then 12 go out
            const rockRe = isRock ? rockFocus * (i === ROCK_KEEP ? 1 : 1 - clamp01((t - (tRock + 0.6 + ROCK.indexOf(i) * 0.08)) / 0.2)) : 0;
            const lit = Math.max(on, rockRe);
            const dimOthers = isRock ? 1 : 1 - 0.75 * rockFocus;
            return (
              <div key={i} style={{ position: "absolute", left: p.x, top: p.y, width: PW, height: PH, borderRadius: 3,
                background: lit > 0.02 ? `linear-gradient(180deg, ${K.goldHi}, ${K.gold} 55%, ${K.goldLo})` : "transparent",
                opacity: (0.12 + 0.88 * lit) * dimOthers,
                border: `1px solid ${lit > 0.02 ? "rgba(255,227,163,0.6)" : "rgba(141,130,115,0.35)"}`,
                boxShadow: lit > 0.5 ? "0 0 14px rgba(240,192,98,0.45)" : undefined,
                outline: isRock && rockFocus > 0.05 ? `2px solid rgba(255,227,163,${0.8 * rockFocus})` : undefined, outlineOffset: 3 }}>
                {lit > 0.02 ? <div style={{ position: "absolute", left: 6, right: 6, top: 9, height: 3, background: "rgba(60,40,10,0.45)", borderRadius: 2 }} /> : null}
              </div>
            );
          })}
          <Cap at={a + 0.15} out={tOff - 0.05} lines={[["1982 年，福布斯美国最富的 ", { t: "400", num: true, c: K.gold }, " 人。"]]} />
          <Cap at={tOff + 0.1} out={tRock - 0.05} lines={[["到 2014 年，只剩 ", { t: "34", num: true, c: K.gold }, " 人还在榜上。"]]} />
          <Cap at={tRock + 0.1} out={tKids - 0.05} lines={[["洛克菲勒家占过 ", { t: "13", num: true, c: K.gold }, " 席，"], ["到 2015 年只剩 ", { t: "1", num: true, c: K.gold }, " 人。"]]} />
        </div>
      ) : null}
      {kidsO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: kidsO }}>
          <Tree id="kids" t={t} nodes={kidsNodes} r={(n) => (n.row === 0 ? 30 : 11)}
            grow={(n) => (t - (tKids + (n.row === 0 ? 0 : 0.3 + n.i * 0.012 + (n.row - 1) * 0.08))) / 0.4}
            gold={(n) => { const l = lossAt(n); return l === null ? 1 : 1 - clamp01((t - l) / 0.3); }}
            flakeAt={lossAt} links={false} />
          {/* the grandfather → grandchildren fan */}
          <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
            {[...Array(25)].map((_, i) => {
              const x = 960 - 650 + (1300 * i) / 24;
              const g = ramp(t, tKids + 0.3 + i * 0.012, tKids + 0.8 + i * 0.012, EO);
              return <path key={i} d={`M 960 280 C 960 380, ${x} 380, ${x} 458`} fill="none" stroke={K.gold} strokeOpacity={0.25 * g} strokeWidth={1.6} />;
            })}
          </svg>
          <Label x={960} y={190} o={ramp(t, tKids + 0.2, tKids + 0.6, EO)} size={40} color={K.gold}>爷爷：美国最富的 1%</Label>
          <Num x={1790} y={560} o={ramp(t, tLose + 0.6, tLose + 1.0, EO)} size={150} color={K.ashHi}>93</Num>
          <Label x={1790} y={660} o={ramp(t, tLose + 0.8, tLose + 1.2, EO)} size={34} color={K.ashHi}>/ 100</Label>
          <Cap at={tKids + 0.2} out={tLose - 0.05} lines={["再看美国 1850 到 1940 年，", ["约 ", { t: "1500 万", num: true, c: K.gold }, "个孙辈的记录。"]]} />
          <Cap at={tLose + 0.1} out={end - S(0.75) - 0.05} lines={["爷爷在最富的 1%，", ["100 个孙辈里，", { t: "93", num: true, c: K.gold }, " 个掉了出去。"]]} />
        </div>
      ) : null}
      <Big at={end - S(0.75) + 0.05} out={end - 0.05} y={CAPBIG} size={88} lines={["钱，确实留不住。"]} />
    </>
  );
};
