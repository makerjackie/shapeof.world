// Chapter 1, second half (story bars 10–17): matchmaking makes every match even; the match history is full of games
// lost by a hair; 差一点就赢了, 不甘心; the rank going round; then half a bar of darkness and silence.
import React from "react";
import { Box, clamp01, EO, ramp, Say, useT, win } from "../kit";
import { HAN, K, NUM } from "../theme";
import { BEAT, S, SIL0 } from "./time";

const want = (s: string) => ({ t: s, c: K.want });
const BLUE = "#4fb8ff";
const RED = "#ff5d70";

// A game-UI backdrop: deep navy, light rays from the top, a faint hex pattern.
export const GameBack: React.FC<{ o?: number }> = ({ o = 1 }) => (
  <div style={{ position: "absolute", inset: 0, opacity: o, background: "radial-gradient(ellipse 80% 70% at 50% 35%, #1b2b55 0%, #0d1530 55%, #060914 100%)" }}>
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: 9 }, (_, i) => (
        <path key={i} d={`M ${960 + (i - 4) * 60} -20 L ${960 + (i - 4) * 260} 1100 L ${960 + (i - 4) * 260 + 90} 1100 Z`} fill="#8fb8ff" opacity={0.025} />
      ))}
      {Array.from({ length: 14 * 8 }, (_, i) => {
        const c = i % 14;
        const r = Math.floor(i / 14);
        const x = 70 + c * 140 + (r % 2) * 70;
        const y = 80 + r * 130;
        return <path key={`h${i}`} d={`M ${x} ${y - 40} L ${x + 35} ${y - 20} L ${x + 35} ${y + 20} L ${x} ${y + 40} L ${x - 35} ${y + 20} L ${x - 35} ${y - 20} Z`} fill="none" stroke="#8fb8ff" strokeOpacity={0.035} strokeWidth={2} />;
      })}
    </svg>
  </div>
);

const Avatar: React.FC<{ c: string; size: number }> = ({ c, size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <defs>
      <linearGradient id={`av-${c.slice(1)}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} />
        <stop offset="100%" stopColor="#1a1f3a" />
      </linearGradient>
    </defs>
    <circle cx={50} cy={50} r={46} fill={`url(#av-${c.slice(1)})`} stroke="#fff" strokeWidth={4} />
    <circle cx={50} cy={40} r={15} fill="#fff" opacity={0.92} />
    <path d="M 22 82 C 24 60, 76 60, 78 82 Z" fill="#fff" opacity={0.92} />
  </svg>
);

// ---------- matchmaking: two even teams ----------
const Match: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(10), S(12.05), 0.2, 0.25);
  if (o <= 0) return null;
  const wob = 2.5 * Math.sin((t - S(10)) * 3.4) * Math.exp(-Math.max(0, t - S(10.6)) * 0.5);
  const bal = ramp(t, S(10.45), S(10.8), EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <div style={{ position: "absolute", left: 0, right: 0, top: 108, textAlign: "center", fontFamily: HAN, fontWeight: 900, fontSize: 52, letterSpacing: 10, background: "linear-gradient(180deg, #fff3c4, #e8b23a)", WebkitBackgroundClip: "text", color: "transparent" }}>匹配成功</div>
      {[0, 1].map((side) =>
        Array.from({ length: 5 }, (_, i) => {
          const k = EO(clamp01((t - S(10) - i * BEAT * 0.3) / 0.22));
          const left = side === 0;
          const x = left ? 250 : 1170;
          const y = 200 + i * 112;
          const c = left ? BLUE : RED;
          return (
            <div key={`${side}-${i}`} style={{ position: "absolute", left: x + (1 - k) * (left ? -500 : 500), top: y, width: 500, height: 96, opacity: k, borderRadius: 18, background: left ? "linear-gradient(90deg, rgba(79,184,255,0.32), rgba(79,184,255,0.06))" : "linear-gradient(270deg, rgba(255,93,112,0.32), rgba(255,93,112,0.06))", border: `2px solid ${c}88`, display: "flex", flexDirection: left ? "row" : "row-reverse", alignItems: "center", gap: 18, padding: "0 18px", boxSizing: "border-box" }}>
              <Avatar c={c} size={70} />
              <div style={{ display: "flex", flexDirection: "column", alignItems: left ? "flex-start" : "flex-end", gap: 6 }}>
                <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 26, color: "#fff" }}>玩家 {left ? i + 1 : i + 6}</span>
                <span style={{ fontFamily: NUM, fontWeight: 700, fontSize: 18, color: "#ffd166", letterSpacing: 2 }}>{"★".repeat(3 + ((i * 3 + side) % 2))}</span>
              </div>
            </div>
          );
        }),
      )}
      <div style={{ position: "absolute", left: 0, right: 0, top: 420, textAlign: "center", fontFamily: NUM, fontStyle: "italic", fontWeight: 900, fontSize: 120, color: "#ffd166", textShadow: "0 6px 0 #6a3a00, 0 0 40px rgba(255,209,102,0.5)", opacity: ramp(t, S(10.25), S(10.45), EO) }}>VS</div>
      <div style={{ position: "absolute", left: 460, top: 790, width: 1000, opacity: bal }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: HAN, fontWeight: 800, fontSize: 26, color: "#c9d3e6", marginBottom: 10 }}>
          <span style={{ color: BLUE }}>我方实力</span>
          <span style={{ fontFamily: NUM, color: "#fff", fontSize: 30 }}>50 : 50</span>
          <span style={{ color: RED }}>对方实力</span>
        </div>
        <div style={{ position: "relative", height: 28, borderRadius: 14, overflow: "hidden", border: "2px solid #e8c36a" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${50 + wob}%`, background: `linear-gradient(90deg, #1f6fd8, ${BLUE})` }} />
          <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: `${50 - wob}%`, background: `linear-gradient(270deg, #c41d3a, ${RED})` }} />
          <div style={{ position: "absolute", left: `calc(${50 + wob}% - 3px)`, top: -4, bottom: -4, width: 6, background: "#fff", boxShadow: "0 0 12px #fff" }} />
        </div>
      </div>
    </div>
  );
};

// ---------- the match history: lost by a hair, again and again ----------
type Row = { win: boolean; tag: string; kda: string; time: string; near: boolean };
const ROWS: Row[] = [
  { win: false, tag: "水晶 1%", kda: "9/6/12", time: "18:42", near: true },
  { win: false, tag: "差 1 座塔", kda: "4/7/10", time: "21:05", near: true },
  { win: true, tag: "险胜", kda: "11/5/8", time: "19:37", near: false },
  { win: false, tag: "团战差 3 秒", kda: "6/6/14", time: "16:58", near: true },
  { win: false, tag: "残血被反杀", kda: "7/8/6", time: "22:11", near: true },
  { win: true, tag: "翻盘", kda: "5/4/17", time: "24:30", near: false },
  { win: false, tag: "水晶 3%", kda: "8/5/9", time: "20:03", near: true },
];
const History: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(12), S(15.05), 0.25, 0.3);
  if (o <= 0) return null;
  const stress = ramp(t, S(13.5), S(13.8), EO);
  const recede = ramp(t, S(13.5), S(15.05));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <div style={{ position: "absolute", left: 360, top: 70, width: 1200, transform: `scale(${1 - 0.22 * recede})`, transformOrigin: "50% 40%", opacity: 1 - 0.7 * recede }}>
        <div style={{ fontFamily: HAN, fontWeight: 900, fontSize: 44, color: "#fff", letterSpacing: 8, marginBottom: 20, textAlign: "center" }}>战绩</div>
        {ROWS.map((r, i) => {
          const k = EO(clamp01((t - S(12.05) - i * BEAT * 0.5) / 0.2));
          const pulse = r.near ? stress * (0.5 + 0.5 * Math.sin(t * 9 + i)) : 0;
          return (
            <div key={i} style={{ position: "relative", height: 84, marginBottom: 12, opacity: k, transform: `translateX(${(1 - k) * 260}px)`, borderRadius: 16, background: r.win ? "linear-gradient(90deg, rgba(255,209,102,0.2), rgba(255,209,102,0.04))" : "linear-gradient(90deg, rgba(150,165,195,0.18), rgba(150,165,195,0.04))", border: `2px solid ${r.near ? `rgba(255,79,154,${0.35 + 0.6 * pulse})` : "rgba(232,195,106,0.35)"}`, display: "flex", alignItems: "center", gap: 26, padding: "0 26px", boxSizing: "border-box", boxShadow: r.near ? `0 0 ${24 * pulse}px rgba(255,79,154,0.6)` : "none" }}>
              <span style={{ fontFamily: HAN, fontWeight: 900, fontSize: 34, color: r.win ? "#ffd166" : "#aeb6c8", width: 46 }}>{r.win ? "胜" : "负"}</span>
              <Avatar c={r.win ? "#f0a020" : "#5a6a90"} size={56} />
              <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 26, color: "#dfe6f5" }}>排位赛</span>
              <span style={{ fontFamily: NUM, fontWeight: 700, fontSize: 26, color: "#c9d3e6", width: 120 }}>{r.kda}</span>
              <span style={{ fontFamily: NUM, fontWeight: 600, fontSize: 22, color: "#8a93a6" }}>{r.time}</span>
              <span style={{ marginLeft: "auto", fontFamily: HAN, fontWeight: 900, fontSize: 28, color: "#fff", background: r.near ? "rgba(255,79,154,0.38)" : "rgba(255,209,102,0.3)", border: `2px solid ${r.near ? K.want : "#ffd166"}`, borderRadius: 999, padding: "2px 18px", whiteSpace: "nowrap" }}>{r.tag}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const starPath = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45;
    const a = ((-90 + i * 36) * Math.PI) / 180;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `M ${pts.join(" L ")} Z`;
};

// The rank going round: a star won, a star lost, on every beat. Even teams keep the near misses coming.
const RankLoop: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, S(15), SIL0 + 0.02, 0.2, 0.2);
  if (o <= 0) return null;
  const n = Math.max(0, Math.floor((t - S(15)) / BEAT));
  const up = n % 2 === 0;
  const flip = Math.exp(-(((t - S(15)) / BEAT) % 1) / 0.25);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      <GameBack />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: 5 }, (_, i) => {
          const x = 960 + (i - 2) * 170;
          const lit = i < 3 || (i === 3 && up);
          const hot = i === 3;
          return (
            <g key={i}>
              {hot ? <circle cx={x} cy={300} r={80} fill={up ? "#ffd166" : "#ff4f9a"} opacity={0.18 + 0.25 * flip} /> : null}
              <path d={starPath(x, 300, 66)} fill={lit ? "#ffc93a" : "none"} stroke={lit ? "#fff4c8" : hot ? "#ff4f9a" : "#5a6378"} strokeWidth={lit ? 3 : 6} strokeDasharray={!lit ? "12 9" : undefined} />
            </g>
          );
        })}
      </svg>
      <div style={{ position: "absolute", left: 960 + 170 + 70, top: 190, fontFamily: NUM, fontWeight: 900, fontSize: 64, color: up ? "#ffd166" : K.want, opacity: flip, transform: `translateY(${(1 - flip) * -30}px)` }}>{up ? "+1" : "−1"}</div>
    </div>
  );
};

// Half a bar of darkness and silence before the lab.
const Dark: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, SIL0 - 0.12, S(17) + 0.08, 0.12, 0.12);
  if (o <= 0) return null;
  return <div style={{ position: "absolute", inset: 0, background: "#020306", opacity: o }} />;
};

export const Ch1: React.FC = () => {
  const t = useT();
  if (t < S(10) - 0.1 || t > S(17) + 0.2) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Match t={t} />
      <History t={t} />
      <RankLoop t={t} />
      <Dark t={t} />
      <Ch1Text />
    </div>
  );
};

const Ch1Text: React.FC = () => (
  <>
    <Box x={960} y={900} align="center" gap={10}>
      <Say at={S(10.15)} out={S(11.95)} size={56} weight={900} parts={["系统总给你找差不多强的对手，"]} />
      <Say at={S(10.6)} out={S(11.95)} size={56} weight={900} parts={["输赢，大概", { t: "一半一半", c: "#fff" }, "。"]} />
    </Box>
    <Box x={960} y={985} align="center">
      <Say at={S(12.25)} out={S(13.45)} size={56} weight={900} parts={["实力接近，很多局都打到最后", want("一点点"), "。"]} />
    </Box>
    <Box x={960} y={400} align="center" gap={30}>
      <Say at={S(13.5)} out={S(14.95)} size={108} weight={900} parts={["差一点就赢了。"]} style={{ background: "rgba(5,7,12,0.7)", padding: "6px 40px", borderRadius: 24 }} />
      <Say at={S(14.05)} out={S(14.95)} size={136} weight={900} parts={[want("不甘心。")]} style={{ background: "rgba(5,7,12,0.7)", padding: "6px 40px", borderRadius: 24 }} />
    </Box>
    <Box x={960} y={560} align="center" gap={18}>
      <Say at={S(15.05)} out={SIL0 - 0.1} size={64} weight={900} parts={["系统不用让你输。"]} />
      <Say at={S(15.5)} out={SIL0 - 0.1} size={64} weight={900} parts={["只要势均力敌，", want("“差一点”"), "就会一直来。"]} />
    </Box>
  </>
);
