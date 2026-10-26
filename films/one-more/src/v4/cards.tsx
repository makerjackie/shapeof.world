// "差一点" everywhere in the game: bright panels fly out of the phone on the beat, each one step short of full; then
// they multiply into a wall of nearly-full bars. Generic game UI, self-drawn.
import React from "react";
import { clamp01, EO, lerp, star } from "../kit";
import { HAN, K, NUM } from "../theme";
import { BEAT, beat } from "./time";

type Icon = "star" | "list" | "crown" | "chest" | "shard" | "cal" | "team" | "glass";
type Card = { title: string; icon: Icon; c0: string; c1: string; fill: number; num: string; chip: string; x: number; y: number };

const L = 70;
const R = 1430;
export const CARDS: Card[] = [
  { title: "晋级赛", icon: "star", c0: "#ffe08a", c1: "#f0a020", fill: 0.8, num: "4/5", chip: "再赢 1 局晋级", x: L, y: 170 },
  { title: "每日任务", icon: "list", c0: "#8ff0ff", c1: "#2a9fd8", fill: 0.667, num: "2/3", chip: "还差 1 局", x: R, y: 170 },
  { title: "战令等级", icon: "crown", c0: "#d7b2ff", c1: "#8a4ff0", fill: 0.94, num: "1880/2000", chip: "还差 120 经验", x: L, y: 380 },
  { title: "积分夺宝", icon: "chest", c0: "#ffc49a", c1: "#ff6a3d", fill: 0.98, num: "98/100", chip: "再抽 2 次必得", x: R, y: 380 },
  { title: "皮肤碎片", icon: "shard", c0: "#ffb0dc", c1: "#e0409a", fill: 0.99, num: "99/100", chip: "还差 1 片", x: L, y: 590 },
  { title: "七日签到", icon: "cal", c0: "#b5f5a0", c1: "#3fbf5a", fill: 0.857, num: "6/7", chip: "明天领大奖", x: R, y: 590 },
  { title: "好友开黑", icon: "team", c0: "#a8d4ff", c1: "#3f7fff", fill: 0.8, num: "4/5", chip: "差 1 人", x: L, y: 800 },
  { title: "本赛季", icon: "glass", c0: "#ffd59a", c1: "#ff9a2a", fill: 0.9, num: "81/90 天", chip: "还剩 9 天", x: R, y: 800 },
];
export const CARD_AT = (i: number) => beat(16 + 2 * i);
export const WALL_AT = beat(32);
const CW = 420;
const CH = 130;

const IconSvg: React.FC<{ icon: Icon }> = ({ icon }) => {
  const s = { fill: "none", stroke: "#fff", strokeWidth: 5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (icon) {
    case "star":
      return <path d={star(42, 44, 26)} fill="#fff" />;
    case "list":
      return (
        <g {...s}>
          <path d="M 22 26 l 6 6 l 10 -12 M 22 46 l 6 6 l 10 -12" />
          <path d="M 46 28 h 18 M 46 48 h 18 M 24 66 h 40" />
        </g>
      );
    case "crown":
      return <path d="M 16 62 L 20 26 L 34 42 L 42 20 L 50 42 L 64 26 L 68 62 Z" fill="#fff" />;
    case "chest":
      return (
        <g {...s}>
          <rect x={16} y={34} width={52} height={32} rx={4} />
          <path d="M 16 40 C 16 18, 68 18, 68 40 M 42 34 v 14" />
        </g>
      );
    case "shard":
      return <path d="M 42 14 L 60 40 L 42 70 L 24 40 Z M 42 14 L 42 70 M 24 40 L 60 40" {...s} />;
    case "cal":
      return (
        <g {...s}>
          <rect x={16} y={22} width={52} height={46} rx={6} />
          <path d="M 16 36 h 52 M 30 16 v 12 M 54 16 v 12" />
          <path d="M 30 52 l 8 8 l 14 -16" />
        </g>
      );
    case "team":
      return (
        <g fill="#fff">
          <circle cx={30} cy={34} r={9} />
          <circle cx={54} cy={34} r={9} />
          <path d="M 14 66 C 14 46, 46 46, 46 66 Z M 38 66 C 38 46, 70 46, 70 66 Z" />
        </g>
      );
    default:
      return <path d="M 26 18 h 32 M 26 70 h 32 M 30 18 C 30 36, 54 36, 54 44 C 54 52, 30 52, 30 70 M 54 18 C 54 36, 30 36, 30 44 C 30 52, 54 52, 54 70" {...s} />;
  }
};

// full: the screen-POV layout (two columns across the frame, larger); otherwise around a phone in the middle.
const place = (c: Card, i: number, full: boolean): [number, number, number] => (full ? [i % 2 === 0 ? 290 : 1110, 150 + Math.floor(i / 2) * 195, 1.24] : [c.x, c.y, 1]);

const CardView: React.FC<{ c: Card; t: number; at: number; i: number; full: boolean }> = ({ c, t, at, i, full }) => {
  const k = clamp01((t - at) / 0.32);
  if (k <= 0) return null;
  const e = EO(k);
  const pop = 1 + 0.12 * Math.sin(Math.PI * clamp01((t - at) / 0.42));
  const [px, py, sc] = place(c, i, full);
  const x = lerp(960 - CW / 2, px + (CW * (sc - 1)) / 2, e);
  const y = lerp(540 - CH / 2, py + (CH * (sc - 1)) / 2, e);
  const flash = Math.exp(-(t - at) / 0.12);
  const fill = c.fill * EO(clamp01((t - at - 0.1) / 0.5));
  const pulse = 0.55 + 0.45 * Math.sin(t * 7 + i);
  const shine = ((t - at) * 0.9) % 1.6;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: CW, height: CH, transform: `scale(${(0.3 + 0.7 * e) * pop * sc})`, opacity: Math.min(1, k * 2) }}>
      <div style={{ position: "absolute", inset: -3, borderRadius: 20, background: "linear-gradient(135deg, #fff2c4 0%, #d9a440 35%, #7a5418 60%, #f5d68a 100%)", boxShadow: `0 10px 30px rgba(0,0,0,0.5), 0 0 ${30 * flash + 10}px ${c.c1}${flash > 0.1 ? "cc" : "55"}` }} />
      <div style={{ position: "absolute", inset: 0, borderRadius: 17, background: "linear-gradient(180deg, #223163 0%, #131b3b 100%)", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, right: 0, height: 46, background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0))" }} />
        <div style={{ position: "absolute", left: 16, top: 20, width: 88, height: 88, borderRadius: 18, background: `linear-gradient(135deg, ${c.c0}, ${c.c1})`, boxShadow: `inset 0 -6px 0 rgba(0,0,0,0.25), 0 0 18px ${c.c1}88` }}>
          <svg width={88} height={88} viewBox="0 0 84 84">
            <IconSvg icon={c.icon} />
          </svg>
        </div>
        <div style={{ position: "absolute", left: 122, top: 16, fontFamily: HAN, fontWeight: 900, fontSize: 30, color: "#fff", textShadow: "0 2px 0 rgba(0,0,0,0.5)", whiteSpace: "nowrap" }}>{c.title}</div>
        <div style={{ position: "absolute", right: 18, top: 22, fontFamily: NUM, fontWeight: 800, fontSize: 22, color: c.c0, fontVariantNumeric: "tabular-nums" }}>{c.num}</div>
        <div style={{ position: "absolute", left: 122, right: 18, top: 62, height: 24, borderRadius: 12, background: "#080d1f", boxShadow: "inset 0 3px 6px rgba(0,0,0,0.7)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: `${fill * 100}%`, right: 0, top: 0, bottom: 0, background: K.want, opacity: 0.35 + 0.45 * pulse }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, borderRadius: 12, background: `linear-gradient(180deg, ${c.c0}, ${c.c1})`, boxShadow: `0 0 12px ${c.c1}` }}>
            <div style={{ position: "absolute", top: 0, bottom: 0, left: `${(shine - 0.3) * 100}%`, width: "18%", background: "linear-gradient(90deg, rgba(255,255,255,0), rgba(255,255,255,0.6), rgba(255,255,255,0))" }} />
          </div>
        </div>
        <div style={{ position: "absolute", left: 122, top: 94, fontFamily: HAN, fontWeight: 900, fontSize: 21, color: "#fff", background: "rgba(255,79,154,0.35)", border: `1.5px solid ${K.want}`, borderRadius: 999, padding: "1px 12px", whiteSpace: "nowrap", boxShadow: `0 0 14px rgba(255,79,154,${0.3 + 0.3 * pulse})` }}>{c.chip}</div>
      </div>
      {flash > 0.02 ? <div style={{ position: "absolute", inset: -3, borderRadius: 20, background: "#fff", opacity: 0.5 * flash }} /> : null}
    </div>
  );
};

export const Cards: React.FC<{ t: number; full?: boolean }> = ({ t, full = false }) => {
  const out = 1 - clamp01((t - WALL_AT) / 0.35);
  if (out <= 0 || t < CARD_AT(0)) return null;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: out, transform: `scale(${1 - 0.15 * (1 - out)})` }}>
      {CARDS.map((c, i) => (
        <CardView key={i} c={c} t={t} at={CARD_AT(i)} i={i} full={full} />
      ))}
    </div>
  );
};

// The wall: dozens of bars, every one nearly full.
const WALL_LABELS = ["碎片 99/100", "经验 1880/2000", "任务 2/3", "签到 6/7", "宝箱 9/10", "成就 49/50", "星星 4/5", "活跃度 90/100", "积分 980/1000", "皮肤 99/100", "好友 4/5", "战令 Lv.49", "勋章 19/20", "图鉴 59/60", "熟练度 95%", "夺宝 98/100"];
const WALL_COLORS = [
  ["#ffe08a", "#f0a020"],
  ["#8ff0ff", "#2a9fd8"],
  ["#d7b2ff", "#8a4ff0"],
  ["#ffc49a", "#ff6a3d"],
  ["#ffb0dc", "#e0409a"],
  ["#b5f5a0", "#3fbf5a"],
];
export const Wall: React.FC<{ t: number }> = ({ t }) => {
  const d = t - WALL_AT;
  if (d < -0.1) return null;
  const cols = 6;
  const rows = 10;
  const zoom = 1.3 - 0.4 * EO(clamp01(d / (BEAT * 6)));
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const dist = Math.hypot(c - (cols - 1) / 2, (r - (rows - 1) / 2) * 0.8);
      const k = clamp01((d - dist * 0.07) / 0.25);
      if (k <= 0) continue;
      const [c0, c1] = WALL_COLORS[i % WALL_COLORS.length];
      const fill = (0.9 + 0.09 * ((i * 37) % 10) / 9) * EO(k);
      cells.push(
        <div key={i} style={{ position: "absolute", left: 160 + c * 280, top: 70 + r * 100, width: 250, opacity: k, transform: `scale(${0.6 + 0.4 * EO(k)})` }}>
          <div style={{ fontFamily: HAN, fontWeight: 800, fontSize: 19, color: "rgba(255,255,255,0.85)", marginBottom: 8, whiteSpace: "nowrap" }}>{WALL_LABELS[i % WALL_LABELS.length]}</div>
          <div style={{ position: "relative", height: 18, borderRadius: 9, background: "#080d1f", border: "1.5px solid rgba(232,195,106,0.7)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: `${fill * 100}%`, right: 0, top: 0, bottom: 0, background: K.want, opacity: 0.55 + 0.35 * Math.sin(t * 6 + i) }} />
            <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: `linear-gradient(180deg, ${c0}, ${c1})` }} />
          </div>
        </div>,
      );
    }
  }
  return (
    <div style={{ position: "absolute", inset: 0, opacity: clamp01((d + 0.1) / 0.3) }}>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, transform: `scale(${zoom})`, transformOrigin: "960px 540px" }}>{cells}</div>
    </div>
  );
};
