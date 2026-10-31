// Everything drawn over the WebGL world: captions, labels pinned to the map, the drone's on-screen display and the
// few graphics the 3D scene can't say on its own.
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { CITIES, COUNTRY_LABELS, ll, PLACE, toLL } from "../geo";
import { clamp01, CL, EO, EIO, FPS, ramp, SHADOW } from "../kit";
import { FONT, K, MONO, NUM, SERIF } from "../theme";
import { Cam, toScreen } from "../world/camera";
import { engine, WorldState } from "../world/engine";
import { Line, LINES, NOTES } from "./text";

const win = (t: number, a: number, b: number, fi = 0.3, fo = 0.3) => Math.min(clamp01((t - a) / fi), clamp01((b - t) / fo));

// ---------- text ----------
const Typed: React.FC<{ line: Line; t: number; size: number; weight?: number; serif?: boolean; color?: string; center?: boolean }> = ({ line, t, size, weight = 800, serif, color = K.fg, center }) => {
  const frame = useCurrentFrame();
  const f0 = line.at * FPS;
  const exit = interpolate(frame, [line.out * FPS - 6, line.out * FPS + 3], [0, 1], CL);
  const chars = Array.from(line.t);
  // highlight ranges
  const hot = new Array(chars.length).fill(false);
  for (const h of line.hl ?? []) {
    const i = line.t.indexOf(h);
    if (i >= 0) for (let j = 0; j < Array.from(h).length; j++) hot[Array.from(line.t.slice(0, i)).length + j] = true;
  }
  const per = Math.max(0.45, Math.min(1.1, 26 / chars.length));
  void t;
  return (
    <div style={{ fontFamily: serif ? SERIF : FONT, fontSize: size, fontWeight: weight, color, lineHeight: 1.32, textShadow: SHADOW, opacity: 1 - exit, transform: `translateY(${-exit * 14}px)`, textAlign: center ? "center" : "left" }}>
      {chars.map((ch, i) => {
        const s = f0 + i * per;
        const k = interpolate(frame, [s, s + 7], [0, 1], { ...CL, easing: EO });
        return (
          <span key={i} style={{ display: "inline-block", whiteSpace: "pre", opacity: k, transform: `translateY(${(1 - k) * 0.25}em)`, color: hot[i] ? line.c ?? K.gold : undefined, fontFamily: hot[i] && /[0-9%.]/.test(ch) ? NUM : undefined }}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

export const Captions: React.FC<{ t: number }> = ({ t }) => {
  const on = LINES.filter((l) => t >= l.at - 0.05 && t <= l.out + 0.2);
  const caps = on.filter((l) => l.s === "cap" || l.s === "cap2");
  const bigs = on.filter((l) => l.s === "big");
  const titles = on.filter((l) => l.s === "title");
  const quotes = on.filter((l) => l.s === "quote" || l.s === "who");
  return (
    <>
      {caps.length ? (
        <div style={{ position: "absolute", left: 96, bottom: 104, width: 1480, display: "flex", flexDirection: "column", gap: 10 }}>
          {caps.map((l, i) => (
            <Typed key={i} line={l} t={t} size={l.s === "cap" ? 58 : 50} weight={l.s === "cap" ? 800 : 700} color={l.s === "cap2" ? "rgba(242,239,232,0.92)" : K.fg} />
          ))}
        </div>
      ) : null}
      {bigs.map((l, i) => (
        <div key={i} style={{ position: "absolute", left: 160, right: 160, top: 400, display: "flex", justifyContent: "center" }}>
          <Typed line={l} t={t} size={l.t.length > 20 ? 66 : 92} weight={900} center />
        </div>
      ))}
      {titles.map((l, i) => (
        <div key={i} style={{ position: "absolute", left: 120, right: 120, top: 360 + (l.y ?? 0) * 120, display: "flex", justifyContent: "center" }}>
          <Typed line={l} t={t} size={l.y === undefined && titles.length === 1 && t < 20 ? 96 : 76} weight={900} serif center />
        </div>
      ))}
      {quotes.length ? (
        <div style={{ position: "absolute", left: 120, top: 330, width: 1600, display: "flex", flexDirection: "column", gap: 18 }}>
          {quotes
            .sort((a, b) => (a.s === "who" ? -1 : 0) - (b.s === "who" ? -1 : 0) || (a.y ?? 0) - (b.y ?? 0))
            .map((l, i) =>
              l.s === "who" ? (
                <div key={i} style={{ fontFamily: MONO, fontSize: 26, fontWeight: 500, color: l.c, letterSpacing: 1, opacity: win(t, l.at, l.out), display: "flex", alignItems: "center", gap: 14 }}>
                  <span style={{ width: 12, height: 12, borderRadius: 6, background: l.c, boxShadow: `0 0 12px ${l.c}` }} />
                  {l.t}
                </div>
              ) : (
                <div key={i} style={{ borderLeft: `4px solid ${l.c}`, paddingLeft: 30 }}>
                  <Typed line={l} t={t} size={60} weight={800} serif />
                </div>
              ),
            )}
        </div>
      ) : null}
    </>
  );
};

export const Notes: React.FC<{ t: number }> = ({ t }) => (
  <>
    {NOTES.filter((n) => t >= n.at && t <= n.out).map((n, i) => (
      <div key={i} style={{ position: "absolute", right: 56, bottom: 34, maxWidth: 1200, textAlign: "right", fontFamily: FONT, fontSize: 19, fontWeight: 500, color: "rgba(242,239,232,0.55)", textShadow: SHADOW, opacity: win(t, n.at, n.out, 0.4, 0.4) }}>
        {n.t}
      </div>
    ))}
  </>
);

// ---------- map labels ----------
const Pin: React.FC<{ c: Cam; x: number; y: number; h?: number; text: string; sub?: string; color?: string; o: number; size?: number; dot?: boolean; side?: "r" | "l" | "c" }> = ({ c, x, y, h, text, sub, color = K.fg, o, size = 28, dot = true, side = "r" }) => {
  if (o <= 0.01) return null;
  const hh = h ?? engine().heightAt(x, y) * 3 + 20;
  const [sx, sy, vis] = toScreen(c, x, y, hh);
  if (!vis || sx < -200 || sx > 2120 || sy < -100 || sy > 1180) return null;
  const tx = side === "r" ? "0%" : side === "l" ? "-100%" : "-50%";
  return (
    <div style={{ position: "absolute", left: sx, top: sy, opacity: o }}>
      {dot ? <div style={{ position: "absolute", left: -6, top: -6, width: 12, height: 12, borderRadius: 6, background: color, boxShadow: `0 0 14px ${color}` }} /> : null}
      <div style={{ position: "absolute", left: side === "r" ? 16 : side === "l" ? -16 : 0, top: 0, transform: `translate(${tx}, -50%)`, whiteSpace: "nowrap", fontFamily: FONT, textShadow: SHADOW }}>
        <div style={{ fontSize: size, fontWeight: 800, color }}>{text}</div>
        {sub ? <div style={{ fontSize: size * 0.72, fontWeight: 600, color: "rgba(242,239,232,0.75)", marginTop: 2 }}>{sub}</div> : null}
      </div>
    </div>
  );
};

export const MapLabels: React.FC<{ t: number; s: WorldState }> = ({ t, s }) => {
  const c = s.cam;
  const ex = s.exag;
  const H = (x: number, y: number, up = 25) => engine().heightAt(x, y) * ex + up;
  const out: React.ReactNode[] = [];
  // country scale
  const co = s.country * (1 - s.thermal);
  if (co > 0.05) {
    const o1 = co * win(t, 19.2, 50, 0.8, 1) + co * win(t, 304, 334, 1, 1);
    CITIES.forEach((ct, i) => out.push(<Pin key={`c${i}`} c={c} x={ct.p[0]} y={ct.p[1]} h={4000} text={ct.n} o={o1 * 0.9} size={ct.big ? 30 : 24} color={K.fg} />));
    COUNTRY_LABELS.forEach((ct, i) => out.push(<Pin key={`n${i}`} c={c} x={ct.p[0]} y={ct.p[1]} h={4000} text={ct.n} o={o1 * 0.55} size={26} dot={false} side="c" color="#9aa3ab" />));
    // the field, marked from far away
    const [fx, fy] = PLACE.orikhiv;
    out.push(<Pin key="field" c={c} x={fx} y={fy - 10000} h={4000} text="这片田" o={co * (win(t, 44.5, 52, 0.6, 0.6) + win(t, 306, 334, 0.6, 1))} size={30} color={K.gold} />);
    // other battles (6)
    const [ax, ay] = ll(37.75, 48.14);
    const [px, py] = ll(37.18, 48.28);
    out.push(<Pin key="avd" c={c} x={ax} y={ay} h={4000} text="阿夫迪伊夫卡" o={co * win(t, 309.6, 334, 0.5, 1)} size={30} color={K.ruHi} />);
    out.push(<Pin key="pok" c={c} x={px} y={py} h={4000} text="波克罗夫斯克" o={co * win(t, 313.8, 334, 0.5, 1)} size={30} color={K.ruHi} side="l" />);
  }
  // field scale
  const fo = s.field * (1 - s.country);
  if (fo > 0.05 && s.thermal < 0.5) {
    const lab = (t > 55.5 && t < 109.5) || (t > 176 && t < 263.4) || (t > 289.6 && t < 303.5);
    const o = fo * (lab ? 1 : 0) * (1 - s.thermal);
    const [mxx, myy] = PLACE.mala;
    const [rxx, ryy] = PLACE.robotyne;
    const [ox, oy] = PLACE.orikhiv;
    const [tx, ty] = PLACE.tokmak;
    out.push(<Pin key="mala" c={c} x={mxx} y={myy} h={H(mxx, myy, 60)} text="北边的村子" sub="马拉托克马奇卡" o={o * win(t, 59.6, 300, 0.5, 0.8)} color={K.uaHi} />);
    out.push(<Pin key="rob" c={c} x={rxx} y={ryy} h={H(rxx, ryy, 60)} text="南边的村子" sub="罗博京" o={o * win(t, 59.6, 300, 0.5, 0.8)} color={t > 232 ? K.ruHi : K.ruHi} />);
    out.push(<Pin key="ori" c={c} x={ox} y={oy} h={H(ox, oy, 60)} text="奥里希夫" o={o * 0.8 * win(t, 56.2, 300)} size={24} />);
    out.push(<Pin key="tok" c={c} x={tx} y={ty} h={H(tx, ty, 60)} text="托克马克" o={o * 0.8 * win(t, 56.2, 300)} size={24} />);
  }
  return <>{out}</>;
};

// ---------- the drone's on-screen display (thermal shots) ----------
export const OSD: React.FC<{ t: number; s: WorldState }> = ({ t, s }) => {
  const o = clamp01((s.thermal - 0.4) / 0.4);
  if (o <= 0) return null;
  const c = s.cam;
  const [lon, lat] = toLL(c.x, c.y);
  const alt = Math.round(c.dist);
  const blink = Math.floor(t * 2) % 2 === 0;
  const col = "rgba(235,240,236,0.9)";
  const tick = (x: number, y: number, dx: number, dy: number) => (
    <path d={`M ${x} ${y + dy * 46} L ${x} ${y} L ${x + dx * 46} ${y}`} stroke={col} strokeWidth={3} fill="none" />
  );
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: MONO, color: col, fontSize: 22, letterSpacing: 1 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        {tick(70, 70, 1, 1)}
        {tick(1850, 70, -1, 1)}
        {tick(70, 1010, 1, -1)}
        {tick(1850, 1010, -1, -1)}
        <g stroke={col} strokeWidth={2.5} fill="none">
          <path d="M 960 480 L 960 520 M 960 560 L 960 600 M 900 540 L 940 540 M 980 540 L 1020 540" />
          <circle cx={960} cy={540} r={4} fill={col} />
        </g>
        <g stroke={col} strokeWidth={2} opacity={0.6}>
          {Array.from({ length: 13 }, (_, i) => (
            <path key={i} d={`M ${720 + i * 40} 1000 L ${720 + i * 40} ${i % 3 === 0 ? 982 : 990}`} />
          ))}
        </g>
      </svg>
      <div style={{ position: "absolute", left: 100, top: 92 }}>
        <span style={{ color: blink ? "#ff5a4a" : "transparent" }}>●</span> REC&nbsp;&nbsp;IR · WH
      </div>
      <div style={{ position: "absolute", right: 100, top: 92, textAlign: "right" }}>
        {lat.toFixed(4)}N {lon.toFixed(4)}E
        <br />
        ALT {alt} m
      </div>
      <div style={{ position: "absolute", left: 100, top: 124, opacity: 0.8 }}>
        HDG {String(Math.round((c.yaw + 360) % 360)).padStart(3, "0")}° · ZOOM ×{(1000 / c.dist).toFixed(1)}
      </div>
    </div>
  );
};

// ---------- special graphics ----------
const Arrow: React.FC<{ a: [number, number]; b: [number, number]; color: string; o: number; dash?: boolean; label?: string; k?: number }> = ({ a, b, color, o, dash, label, k = 1 }) => {
  if (o <= 0.01) return null;
  const bx = a[0] + (b[0] - a[0]) * k;
  const by = a[1] + (b[1] - a[1]) * k;
  const ang = Math.atan2(by - a[1], bx - a[0]);
  return (
    <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
      <path d={`M ${a[0]} ${a[1]} L ${bx} ${by}`} stroke={color} strokeWidth={5} strokeDasharray={dash ? "14 12" : undefined} fill="none" strokeLinecap="round" />
      {k > 0.98 ? <path d={`M ${bx} ${by} L ${bx - 26 * Math.cos(ang - 0.45)} ${by - 26 * Math.sin(ang - 0.45)} M ${bx} ${by} L ${bx - 26 * Math.cos(ang + 0.45)} ${by - 26 * Math.sin(ang + 0.45)}`} stroke={color} strokeWidth={5} strokeLinecap="round" /> : null}
      {label ? (
        <text x={(a[0] + bx) / 2 + 22} y={(a[1] + by) / 2} fill={color} fontFamily={FONT} fontWeight={800} fontSize={34} style={{ paintOrder: "stroke", stroke: "rgba(3,4,8,0.8)", strokeWidth: 6 }}>
          {label}
        </text>
      ) : null}
    </svg>
  );
};

const P = (c: Cam, x: number, y: number, up = 8, ex = 3): [number, number] => {
  const [sx, sy] = toScreen(c, x, y, engine().heightAt(x, y) * ex + up);
  return [sx, sy];
};

export const Graphics: React.FC<{ t: number; s: WorldState }> = ({ t, s }) => {
  const c = s.cam;
  const ex = s.exag;
  const out: React.ReactNode[] = [];
  // 1 · year + share counter while the line freezes
  {
    const o = win(t, 39.4, 46.2, 0.5, 0.5);
    if (o > 0) {
      const k = ramp(t, 40, 45, EIO);
      const year = Math.min(2026, 2022 + Math.floor(k * 4.999));
      const share = 18.0 + 1.35 * k;
      out.push(
        <div key="yc" style={{ position: "absolute", right: 120, top: 150, textAlign: "right", opacity: o, fontFamily: NUM, textShadow: SHADOW }}>
          <div style={{ fontSize: 96, fontWeight: 900, color: K.fg, lineHeight: 1 }}>{year}</div>
          <div style={{ fontSize: 60, fontWeight: 800, color: K.ru, marginTop: 10 }}>{share.toFixed(1)}%</div>
          <div style={{ fontFamily: FONT, fontSize: 22, color: K.sub, marginTop: 6 }}>俄方控制的面积占乌克兰（示意）</div>
        </div>,
      );
    }
  }
  // 2 · side tags at the front
  {
    const o = win(t, 60.2, 75, 0.5, 0.6);
    if (o > 0) {
      const a = P(c, -4500, 10500, 80, ex);
      const b = P(c, -4500, 7000, 80, ex);
      out.push(
        <div key="sides" style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, fontWeight: 900, fontSize: 34, textShadow: SHADOW }}>
          <div style={{ position: "absolute", left: a[0], top: a[1], transform: "translate(-50%,-50%)", color: K.ua }}>乌方守着</div>
          <div style={{ position: "absolute", left: b[0], top: b[1], transform: "translate(-50%,-50%)", color: K.ru }}>俄方守着</div>
        </div>,
      );
    }
  }
  // 3 · minefield depth ruler
  {
    const o = win(t, 80.6, 86, 0.4, 0.4);
    if (o > 0) {
      const depth = 120 + 380 * ramp(t, 81.5, 84.5, EIO);
      const y0 = 6860;
      const a = P(c, 1180, y0, 6, ex);
      const b = P(c, 1180, y0 + depth, 6, ex);
      out.push(
        <svg key="ruler" width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: o }}>
          <path d={`M ${a[0]} ${a[1]} L ${b[0]} ${b[1]}`} stroke={K.ruHi} strokeWidth={4} />
          <path d={`M ${a[0] - 14} ${a[1]} L ${a[0] + 14} ${a[1]} M ${b[0] - 14} ${b[1]} L ${b[0] + 14} ${b[1]}`} stroke={K.ruHi} strokeWidth={4} />
          <text x={(a[0] + b[0]) / 2 + 26} y={(a[1] + b[1]) / 2 + 12} fill={K.ruHi} fontFamily={NUM} fontWeight={900} fontSize={54} style={{ paintOrder: "stroke", stroke: "rgba(3,4,8,0.85)", strokeWidth: 8 }}>
            {Math.round(depth / 10) * 10} 米
          </text>
        </svg>,
      );
    }
  }
  // 4 · stacked mines cut-away
  {
    const o = win(t, 86.2, 90.8, 0.4, 0.4);
    if (o > 0) {
      const k = ramp(t, 86.4, 88, EO);
      out.push(
        <svg key="cut" width={760} height={520} viewBox="0 0 760 520" style={{ position: "absolute", right: 110, top: 150, opacity: o }}>
          <rect x={0} y={0} width={760} height={520} rx={18} fill="rgba(6,8,11,0.82)" stroke="rgba(242,239,232,0.2)" />
          <rect x={30} y={200} width={700} height={290} fill="#2a2119" />
          <path d="M 30 200 Q 200 188 380 200 T 730 200" stroke="#5a4a3a" strokeWidth={6} fill="none" />
          {/* a clearing tank's plough above */}
          <g transform={`translate(${200 + (1 - k) * -60}, 96)`} fill="#3d4a48" stroke="#9fb3ae" strokeWidth={2}>
            <rect x={0} y={20} width={300} height={56} rx={8} />
            <rect x={70} y={-6} width={150} height={34} rx={6} />
            <rect x={300} y={60} width={40} height={40} />
          </g>
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(380, ${236 + i * 46 + (1 - k) * 30 * (2 - i)})`} opacity={k}>
              <ellipse cx={0} cy={0} rx={92} ry={20} fill="#556b4e" stroke="#c9d8b7" strokeWidth={2.5} />
              <rect x={-14} y={-28} width={28} height={10} fill="#c9d8b7" />
            </g>
          ))}
          <text x={480} y={300} fill={K.fg} fontFamily={FONT} fontWeight={800} fontSize={30}>两三枚叠在一起</text>
          <text x={480} y={340} fill={K.sub} fontFamily={FONT} fontWeight={600} fontSize={22}>反坦克雷（示意）</text>
        </svg>,
      );
    }
  }
  // 5 · three lines of defence
  {
    const o = win(t, 97.2, 101, 0.4, 0.4);
    if (o > 0) {
      const L = (x: number, y: number, txt: string) => {
        const [sx, sy] = P(c, x, y, 40, ex);
        return (
          <div key={txt} style={{ position: "absolute", left: sx, top: sy, transform: "translate(-50%,-140%)", fontFamily: FONT, fontWeight: 800, fontSize: 30, color: K.ruHi, textShadow: SHADOW }}>
            {txt}
          </div>
        );
      };
      out.push(
        <div key="lines3" style={{ position: "absolute", inset: 0, opacity: o }}>
          {L(4500, 7300, "第一道")}
          {L(2000, -1600, "第二道")}
          {L(-2400, -12500, "第三道")}
        </div>,
      );
    }
  }
  // 6 · what waits behind
  {
    const o = win(t, 105.2, 109, 0.4, 0.4);
    if (o > 0) {
      out.push(
        <div key="behind" style={{ position: "absolute", inset: 0, opacity: o }}>
          <Pin c={c} x={-7000} y={-9000} h={engine().heightAt(-7000, -9000) * ex + 60} text="火炮" o={1} color={K.ruHi} />
          <Pin c={c} x={-1400} y={-1600} h={engine().heightAt(-1400, -1600) * ex + 120} text="直升机" o={1} color={K.ruHi} />
          <Pin c={c} x={6000} y={-7000} h={engine().heightAt(6000, -7000) * ex + 60} text="电子干扰" o={1} color={K.ruHi} />
        </div>,
      );
    }
  }
  // 6b · the helicopter and the guns, pinned
  {
    const o1 = win(t, 146.4, 151.3, 0.3, 0.3);
    if (o1 > 0) out.push(<Pin key="heli" c={c} x={-1400} y={-1600} h={engine().heightAt(-1400, -1600) * ex + 60} text="直升机" o={o1} color={K.ruHi} />);
    const o2 = win(t, 151.6, 155.8, 0.3, 0.3);
    if (o2 > 0) out.push(<Pin key="guns" c={c} x={-2530} y={14830} h={engine().heightAt(-2530, 14830) * ex + 30} text="乌方炮兵阵地" o={o2} color={K.uaHi} />);
  }
  // 6c · Russian armour coming north
  {
    const o = win(t, 238.4, 246.4, 0.4, 0.4);
    if (o > 0) out.push(<Pin key="ruarm" c={c} x={1500} y={Math.min(9200, 7600 + (t - 236) * 120)} h={engine().heightAt(1500, 9000) * ex + 40} text="俄军装甲" o={o} color={K.ruHi} />);
  }
  // 7 · the plan: day one to the southern village
  {
    const o = win(t, 113.8, 117.6, 0.4, 0.4);
    if (o > 0) {
      const a = P(c, 1000, 9200, 30, ex);
      const [rxx, ryy] = PLACE.robotyne;
      const b = P(c, rxx + 300, ryy + 300, 30, ex);
      out.push(<Arrow key="plan" a={a} b={b} color={K.uaHi} o={o} k={ramp(t, 113.8, 115.6, EO)} label="第 1 天" />);
    }
  }
  // 8 · the drone timer
  {
    const o = win(t, 142.8, 146, 0.2, 0.3);
    if (o > 0) {
      const k = ramp(t, 142.8, 145.4, EIO);
      const secs = Math.round(k * 300);
      const mm = String(Math.floor(secs / 60)).padStart(2, "0");
      const ss = String(secs % 60).padStart(2, "0");
      out.push(
        <div key="timer" style={{ position: "absolute", left: 0, right: 0, top: 210, textAlign: "center", opacity: o, fontFamily: MONO, fontWeight: 700, fontSize: 96, color: "#fff", textShadow: "0 0 24px rgba(0,0,0,0.9)" }}>
          T+{mm}:{ss}
        </div>,
      );
    }
  }
  // 9 · the helicopter's distance
  {
    const o = win(t, 147.4, 151.3, 0.4, 0.3);
    if (o > 0) {
      const a = P(c, -1400, -1600, 60, ex);
      const b = P(c, 1000, 7450, 30, ex);
      out.push(<Arrow key="heli" a={a} b={b} color={K.ruHi} o={o} dash label="约 9 公里" />);
    }
  }
  // 10 · calendar while the line creeps
  {
    const o = win(t, 190.8, 198.6, 0.4, 0.4);
    if (o > 0) {
      const k = ramp(t, 191, 197.5, EIO);
      const days = ["6 月 4 日", "6 月 20 日", "7 月 10 日", "7 月 30 日", "8 月 15 日", "8 月 28 日"];
      const d = days[Math.min(days.length - 1, Math.floor(k * (days.length - 0.01)))];
      out.push(
        <div key="cal" style={{ position: "absolute", right: 120, top: 150, textAlign: "right", opacity: o, fontFamily: FONT, textShadow: SHADOW }}>
          <div style={{ fontSize: 26, color: K.sub, fontWeight: 600 }}>2023 年</div>
          <div style={{ fontSize: 84, fontWeight: 900, color: K.fg, lineHeight: 1.1 }}>{d}</div>
        </div>,
      );
    }
  }
  // 11 · Tokmak, 23 km further
  {
    const o = win(t, 198.8, 202.4, 0.4, 0.4);
    if (o > 0) {
      const [rxx, ryy] = PLACE.robotyne;
      const [tx, ty] = PLACE.tokmak;
      out.push(<Arrow key="tok" a={P(c, rxx, ryy - 400, 40, ex)} b={P(c, tx + 500, ty + 800, 40, ex)} color={K.uaHi} o={o} dash label="23 公里" k={ramp(t, 198.8, 200.6, EO)} />);
    }
  }
  // 12 · kill zone by year
  {
    const o = win(t, 249.2, 258.4, 0.4, 0.5);
    if (o > 0) {
      const rows = [
        { at: 249.2, y: "2024 年", v: "约 1 到 2 公里" },
        { at: 251.4, y: "2025 年", v: "约 5 到 6 公里" },
        { at: 253.6, y: "2026 年", v: "20 多公里" },
      ];
      out.push(
        <div key="kz" style={{ position: "absolute", right: 120, top: 150, opacity: o, fontFamily: FONT, textShadow: SHADOW, display: "flex", flexDirection: "column", gap: 14, alignItems: "flex-end" }}>
          {rows.map((r) => {
            const k = ramp(t, r.at, r.at + 0.5, EO);
            return (
              <div key={r.y} style={{ opacity: k, transform: `translateX(${(1 - k) * 30}px)`, display: "flex", alignItems: "baseline", gap: 22 }}>
                <span style={{ fontSize: 32, color: K.sub, fontWeight: 700 }}>{r.y}</span>
                <span style={{ fontSize: 66, fontWeight: 900, color: "#ff8a74" }}>{r.v}</span>
              </div>
            );
          })}
        </div>,
      );
    }
  }
  // 13 · 165 days
  {
    const o = win(t, 277.2, 289.6, 0.4, 0.4);
    if (o > 0) {
      const k = ramp(t, 277.4, 288.6, (x) => x);
      const day = Math.max(1, Math.round(Math.pow(k, 1.6) * 165));
      out.push(
        <div key="days" style={{ position: "absolute", right: 120, top: 150, textAlign: "right", opacity: o, fontFamily: FONT, textShadow: SHADOW }}>
          <div style={{ fontSize: 30, color: K.sub, fontWeight: 600 }}>在阵地里</div>
          <div style={{ fontSize: 120, fontWeight: 900, color: K.uaHi, lineHeight: 1.05, fontFamily: FONT }}>第 {day} 天</div>
        </div>,
      );
    }
  }
  return <>{out}</>;
};
void SERIF;
