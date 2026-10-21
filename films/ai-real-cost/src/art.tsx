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

