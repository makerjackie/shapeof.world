import React from "react";
import { useBeatFrame } from "./kit";
import { C, FONT } from "./theme";
import { FPB } from "./timing";

// ───────── Mascots ─────────

export type Mood = "happy" | "smug" | "shock" | "sweat" | "sad" | "party";
const INK = "#16161C";

const useBounce = (amount = 1) => {
  const frame = useBeatFrame();
  const ph = (frame / FPB) % 1;
  return Math.exp(-ph * 6) * amount;
};

const Face: React.FC<{ mood: Mood }> = ({ mood }) => {
  const frame = useBeatFrame();
  const blink = frame % 97 < 3 && mood !== "shock";
  const eye = (x: number) => {
    if (blink) return <path key={x} d={`M${x - 10} -8 L${x + 10} -8`} stroke={INK} strokeWidth={5} strokeLinecap="round" />;
    if (mood === "smug") return <path key={x} d={`M${x - 11} -6 Q${x} -14 ${x + 11} -6`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />;
    if (mood === "party" || mood === "happy") {
      return mood === "party" ? (
        <path key={x} d={`M${x - 10} -4 Q${x} -18 ${x + 10} -4`} stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" />
      ) : (
        <g key={x}><circle cx={x} cy={-8} r={11} fill="#fff" /><circle cx={x + 2} cy={-7} r={6} fill={INK} /></g>
      );
    }
    const r = mood === "shock" ? 14 : 11;
    return <g key={x}><circle cx={x} cy={-8} r={r} fill="#fff" /><circle cx={x} cy={-6} r={mood === "shock" ? 4 : 6} fill={INK} /></g>;
  };
  const mouth =
    mood === "happy" ? <path d="M-16 12 Q0 30 16 12" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /> :
    mood === "party" ? <path d="M-18 10 Q0 40 18 10 Z" fill={INK} /> :
    mood === "smug" ? <path d="M-14 18 Q6 26 20 10" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /> :
    mood === "shock" ? <ellipse cx={0} cy={20} rx={9} ry={12} fill={INK} /> :
    mood === "sad" ? <path d="M-14 22 Q0 10 14 22" stroke={INK} strokeWidth={6} fill="none" strokeLinecap="round" /> :
    <path d="M-15 18 Q-7 12 0 18 Q7 24 15 18" stroke={INK} strokeWidth={5} fill="none" strokeLinecap="round" />;
  const drop = (mood === "sweat" || mood === "sad") && (
    <path
      d="M0 0 C-7 10 -7 18 0 18 C7 18 7 10 0 0 Z"
      fill="#9FD3FF"
      transform={`translate(42 ${-40 + ((frame * 1.5) % 30)})`}
      opacity={1 - ((frame * 1.5) % 30) / 30}
    />
  );
  return (
    <g>
      {eye(-18)}
      {eye(18)}
      {(mood === "sweat" || mood === "sad") && (
        <g stroke={INK} strokeWidth={5} strokeLinecap="round">
          <path d="M-28 -26 L-10 -22" />
          <path d="M28 -26 L10 -22" />
        </g>
      )}
      {mood === "happy" || mood === "party" ? (
        <g fill="#FF8FA3" opacity={0.6}><circle cx={-30} cy={10} r={7} /><circle cx={30} cy={10} r={7} /></g>
      ) : null}
      {mouth}
      {drop}
    </g>
  );
};

type MascotProps = { size?: number; mood?: Mood; style?: React.CSSProperties; bounce?: number; label?: string };

const Label: React.FC<{ text?: string; color: string }> = ({ text, color }) =>
  text ? (
    <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 900, color, textAlign: "center", marginTop: 4, whiteSpace: "nowrap" }}>{text}</div>
  ) : null;

/** Claude: an orange spark with a face. */
export const Spark: React.FC<MascotProps> = ({ size = 220, mood = "happy", style, bounce = 1, label }) => {
  const frame = useBeatFrame();
  const b = useBounce(bounce);
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", ...style }}>
      <svg width={size} height={size} viewBox="-100 -100 200 200" style={{ overflow: "visible" }}>
        <g transform={`translate(0 ${-b * 14}) scale(${1 + b * 0.07} ${1 - b * 0.07})`}>
          <g transform={`rotate(${frame * 0.5})`}>
            {Array.from({ length: 8 }).map((_, i) => (
              <rect key={i} x={-14} y={-95} width={28} height={70} rx={14} fill={C.claude} transform={`rotate(${i * 45})`} />
            ))}
          </g>
          <circle r={56} fill={C.claude} />
          <Face mood={mood} />
        </g>
      </svg>
      <Label text={label} color={C.claude} />
    </div>
  );
};

/** DeepSeek: a blue whale with a face. */
export const Whale: React.FC<MascotProps> = ({ size = 260, mood = "happy", style, bounce = 1, label }) => {
  const frame = useBeatFrame();
  const b = useBounce(bounce);
  const wag = Math.sin(frame * 0.25) * 10;
  const spout = mood === "happy" || mood === "party" || mood === "smug";
  return (
    <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", ...style }}>
      <svg width={size} height={size * 0.8} viewBox="-120 -100 240 192" style={{ overflow: "visible" }}>
        <g transform={`translate(0 ${-b * 12}) scale(${1 + b * 0.05} ${1 - b * 0.05})`}>
          {spout && (
            <g fill="#9FD3FF" opacity={0.9}>
              {[-14, 0, 14].map((dx, i) => (
                <circle key={i} cx={-30 + dx * (1 + ((frame + i * 5) % 20) / 20)} cy={-70 - ((frame + i * 5) % 20) * 1.6} r={6} />
              ))}
            </g>
          )}
          <path d="M70 10 C95 0 104 -34 116 -42 C114 -18 110 -4 100 6 C112 16 118 34 116 46 C100 32 90 22 70 24 Z" fill={C.deepseek} transform={`rotate(${wag} 70 15)`} />
          <path d="M-92 12 C-92 -48 -32 -70 18 -62 C62 -54 84 -20 84 12 C84 52 32 66 -20 64 C-70 62 -92 42 -92 12 Z" fill={C.deepseek} />
          <path d="M-84 28 C-62 58 22 62 66 36 C34 54 -42 56 -84 28 Z" fill="#A9B9FF" />
          <g transform="translate(-36 4) scale(0.95)">
            <Face mood={mood} />
          </g>
        </g>
      </svg>
      <Label text={label} color={C.deepseek} />
    </div>
  );
};

// ───────── Props ─────────

/** A receipt printing out of a slot, one line per `per` beats starting at `start`. */
export const Receipt: React.FC<{
  title: string;
  color: string;
  lines: { l: string; r: string }[];
  start: number;
  per: number;
  width?: number;
}> = ({ title, color, lines, start, per, width = 420 }) => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const shown = Math.max(0, Math.min(lines.length, Math.floor((b - start) / per) + 1));
  const lineH = 36;
  const target = 86 + shown * lineH;
  // Paper eases toward its target height so each new line "feeds" out.
  const prevH = 86 + Math.max(0, shown - 1) * lineH;
  const lineProgress = shown === 0 ? 0 : Math.min(1, ((b - start) / per - (shown - 1)) * 3);
  const h = shown === 0 ? 0 : prevH + (target - prevH) * lineProgress;
  const jitter = shown > 0 && shown < lines.length ? Math.sin(frame * 3) * 1.5 : 0;
  return (
    <div style={{ position: "relative", width: width + 60, fontFamily: FONT }}>
      <div style={{ height: 34, borderRadius: 17, background: "#2B2B36", border: `3px solid ${color}`, position: "relative", zIndex: 2 }} />
      <div
        style={{
          position: "absolute",
          top: 18,
          left: 30,
          width,
          height: h,
          background: "#F6F1E4",
          color: INK,
          overflow: "hidden",
          transform: `translateX(${jitter}px)`,
          clipPath: "polygon(0 0,100% 0,100% calc(100% - 10px),95% 100%,90% calc(100% - 10px),85% 100%,80% calc(100% - 10px),75% 100%,70% calc(100% - 10px),65% 100%,60% calc(100% - 10px),55% 100%,50% calc(100% - 10px),45% 100%,40% calc(100% - 10px),35% 100%,30% calc(100% - 10px),25% 100%,20% calc(100% - 10px),15% 100%,10% calc(100% - 10px),5% 100%,0 calc(100% - 10px))",
        }}
      >
        <div style={{ position: "absolute", bottom: 14, left: 24, right: 24 }}>
          <div style={{ fontSize: 26, fontWeight: 900, borderBottom: `2px dashed #999`, paddingBottom: 6, marginBottom: 6 }}>{title}</div>
          {lines.slice(0, shown).map((ln, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", height: lineH, alignItems: "center", fontSize: 24, fontWeight: 500 }}>
              <span>{ln.l}</span>
              <span style={{ fontWeight: 900 }}>{ln.r}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


// ───────── People and small props for the "your time" chapter ─────────

export type PersonMood = "calm" | "frown" | "happy";

/** A programmer, head and shoulders. */
export const Person: React.FC<{ size?: number; shirt?: string; mood?: PersonMood; style?: React.CSSProperties }> = ({ size = 120, shirt = "#566079", mood = "calm", style }) => {
  const frame = useBeatFrame();
  const blink = frame % 113 < 3;
  const eye = (x: number) =>
    blink ? <path key={x} d={`M${x - 4} -22 L${x + 4} -22`} stroke={INK} strokeWidth={3} strokeLinecap="round" /> : <circle key={x} cx={x} cy={-22} r={3.8} fill={INK} />;
  const mouth =
    mood === "happy" ? "M-10 -9 Q0 1 10 -9" : mood === "frown" ? "M-9 -5 Q0 -11 9 -5" : "M-8 -8 Q0 -4 8 -8";
  return (
    <svg width={size} height={size * 1.15} viewBox="-60 -72 120 138" style={{ overflow: "visible", display: "block", ...style }}>
      <path d="M-50 66 C-50 30 -30 14 0 14 C30 14 50 30 50 66 Z" fill={shirt} />
      <path d="M-12 14 L0 28 L12 14 Z" fill="#ffffff22" />
      <circle cx={0} cy={-24} r={30} fill="#F2C9A0" />
      <path d="M-31 -26 C-31 -52 -14 -60 2 -60 C20 -60 33 -50 31 -28 C24 -42 6 -46 -12 -40 C-20 -38 -27 -33 -31 -26 Z" fill="#2B2730" />
      {eye(-11)}
      {eye(11)}
      {mood === "frown" ? (
        <g stroke={INK} strokeWidth={3} strokeLinecap="round">
          <path d="M-17 -33 L-6 -30" />
          <path d="M17 -33 L6 -30" />
        </g>
      ) : null}
      {mood === "happy" ? <g fill="#FF8FA3" opacity={0.55}><circle cx={-18} cy={-12} r={5} /><circle cx={18} cy={-12} r={5} /></g> : null}
      <path d={mouth} stroke={INK} strokeWidth={3.5} fill="none" strokeLinecap="round" />
    </svg>
  );
};

export const Magnifier: React.FC<{ size?: number; color?: string }> = ({ size = 60, color = "#B98CFF" }) => (
  <svg width={size} height={size} viewBox="0 0 60 60" style={{ overflow: "visible", display: "block" }}>
    <circle cx={24} cy={24} r={16} fill={`${color}33`} stroke={color} strokeWidth={6} />
    <path d="M36 36 L52 52" stroke={color} strokeWidth={8} strokeLinecap="round" />
  </svg>
);

export const Verdict: React.FC<{ ok: boolean; size?: number }> = ({ ok, size = 64 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" style={{ display: "block" }}>
    <circle cx={32} cy={32} r={29} fill={ok ? C.green : C.red} />
    {ok ? (
      <path d="M18 33 L28 43 L47 22" stroke="#06060A" strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    ) : (
      <g stroke="#06060A" strokeWidth={7} strokeLinecap="round">
        <path d="M21 21 L43 43" />
        <path d="M43 21 L21 43" />
      </g>
    )}
  </svg>
);

/** A clock face; `p` turns the minute hand (1 = one full hour), `arc` fills a purple sector from 12 o'clock. */
export const ClockFace: React.FC<{ size?: number; p?: number; arc?: number; color?: string }> = ({ size = 120, p = 0, arc = 0, color = "#B98CFF" }) => {
  const a = arc * Math.PI * 2;
  const r = 40;
  const large = arc > 0.5 ? 1 : 0;
  const sector =
    arc >= 0.999 ? <circle cx={0} cy={0} r={r} fill={`${color}55`} /> :
    arc > 0 ? <path d={`M0 0 L0 ${-r} A${r} ${r} 0 ${large} 1 ${Math.sin(a) * r} ${-Math.cos(a) * r} Z`} fill={`${color}66`} /> : null;
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ display: "block", overflow: "visible" }}>
      <circle cx={0} cy={0} r={46} fill="#F5F2EB" stroke="#2B2B36" strokeWidth={3} />
      {sector}
      {Array.from({ length: 12 }).map((_, i) => (
        <rect key={i} x={-1.5} y={-43} width={3} height={i % 3 === 0 ? 9 : 5} fill="#2B2B36" transform={`rotate(${i * 30})`} />
      ))}
      <rect x={-2.5} y={-22} width={5} height={24} rx={2.5} fill="#2B2B36" transform={`rotate(${p * 30})`} />
      <rect x={-1.8} y={-36} width={3.6} height={38} rx={1.8} fill={color === "#B98CFF" ? "#7B4FE0" : color} transform={`rotate(${p * 360})`} />
      <circle cx={0} cy={0} r={4} fill="#2B2B36" />
    </svg>
  );
};

export const Coin: React.FC<{ size?: number }> = ({ size = 160 }) => (
  <svg width={size} height={size} viewBox="-50 -50 100 100" style={{ display: "block" }}>
    <circle r={47} fill="#E8A92E" />
    <circle r={47} fill="url(#coin-g)" />
    <defs>
      <radialGradient id="coin-g" cx="35%" cy="30%" r="75%">
        <stop offset="0%" stopColor="#FFE9A8" />
        <stop offset="55%" stopColor="#FFC947" />
        <stop offset="100%" stopColor="#C98A1E" />
      </radialGradient>
    </defs>
    <circle r={37} fill="none" stroke="#B07A18" strokeWidth={3} />
    <text x={0} y={16} textAnchor="middle" fontSize={46} fontWeight={900} fill="#8A5A0E" fontFamily={FONT}>¥</text>
  </svg>
);

/** A small card of code the AI hands back. */
export const CodeCard: React.FC<{ tint?: string; w?: number }> = ({ tint, w = 132 }) => (
  <div style={{ width: w, height: w * 0.66, borderRadius: 12, background: "linear-gradient(160deg, #262634, #15151d)", border: `2px solid ${tint ?? "rgba(255,255,255,0.22)"}`, boxShadow: `0 14px 30px rgba(0,0,0,0.5)${tint ? `, 0 0 26px ${tint}66` : ""}`, padding: "12px 14px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 8 }}>
    {[0.8, 0.55, 0.7].map((x, i) => (
      <div key={i} style={{ height: 8, width: `${x * 100}%`, borderRadius: 4, background: ["#E07B53", "#5B7BFF", "#3DDC97"][i], opacity: 0.85 }} />
    ))}
  </div>
);
