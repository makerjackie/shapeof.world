// Chapter A (0:00–0:59): the night, the button, and the astrolabe of open loops around it. One camera; the world
// origin is the 再来一局 button.
import React from "react";
import { BrainSvg } from "./brain";
import { Cam, camAt, camG, w2s } from "./cam";
import { arc, Box, clamp01, EIN, EIO, EO, ESO, polar, ramp, Say, star, tween, useT, win } from "./kit";
import { BTN_R, PhoneHtml, PhoneState, PhoneSvg } from "./phone";
import { FONT, HAN, K, NUM, SERIF } from "./theme";
import { A, A_END, FPS, sA } from "./timing";

const BEAT = A.bar / 4;
const HOOK: Cam = { cx: -318, cy: -150, z: 0.92 };

const camA = (t: number) =>
  camAt(
    t,
    [
      [0, { cx: -326, cy: -152, z: 0.88 }],
      [sA(2.6), { cx: -310, cy: -148, z: 0.95 }, EIO],
      [sA(3.12), { cx: -290, cy: -140, z: 1.0 }, EIO],
      [sA(4.0), { cx: 0, cy: 0, z: 2.5 }, EIN],
      [sA(5.85), { cx: 0, cy: 0, z: 2.75 }, EIO],
      [sA(6.55), HOOK, ESO],
      [sA(10.0), { cx: -312, cy: -150, z: 0.97 }, EIO],
      // close on the first loop, then a step back each time a bigger loop appears; the button stays at x ≈ 1260
      [sA(11.2), { cx: -176, cy: 0, z: 1.7 }, ESO],
      [sA(12.0), { cx: -178, cy: 0, z: 1.68 }, EIO],
      [sA(12.0) + 1.2, { cx: -200, cy: 0, z: 1.5 }, ESO],
      [sA(14.5), { cx: -203, cy: 0, z: 1.48 }, EIO],
      [sA(14.5) + 1.2, { cx: -227, cy: 0, z: 1.32 }, ESO],
      [sA(16.5), { cx: -230, cy: 0, z: 1.3 }, EIO],
      [sA(16.5) + 1.2, { cx: -254, cy: 0, z: 1.18 }, ESO],
      [sA(18.5), { cx: -257, cy: 0, z: 1.16 }, EIO],
      [sA(18.5) + 1.2, { cx: -283, cy: 0, z: 1.06 }, ESO],
      [sA(20.5), { cx: -291, cy: 0, z: 1.03 }, EIO],
      [sA(24.0), { cx: -284, cy: 0, z: 1.09 }, EIO],
      [sA(26.6), { cx: -172, cy: 0, z: 1.72 }, ESO],
      [sA(27.15), { cx: -150, cy: 0, z: 1.9 }, EIO],
      [A_END, { cx: 0, cy: 0, z: 42 }, EIN],
    ],
    ESO,
  );

// Rings of the astrolabe: each a loop on its own time scale, each with a gap that glows the colour of wanting.
type Ring = { r: number; at: number; name: string; w0: number; g0: number };
const RINGS_DEF: Ring[] = [
  { r: 150, at: sA(10.4), name: "一局", w0: 0, g0: -90 },
  { r: 206, at: sA(12.0), name: "段位", w0: -4.4, g0: -20 },
  { r: 262, at: sA(14.5), name: "每日任务", w0: 3.3, g0: 60 },
  { r: 318, at: sA(16.5), name: "赛季", w0: -2.3, g0: 15 },
  { r: 374, at: sA(18.5), name: "好友", w0: 1.7, g0: -40 },
];

// Spin factor: calm, then the first acceleration of the film from bar 20.5, easing off for the matchmaking, then the fall.
const spinF = (t: number) =>
  t < sA(20.5) ? 1 : t < sA(21.4) ? 1 + 5 * ramp(t, sA(20.5), sA(21.4), EIO) : t < sA(24) ? 6 : t < sA(25) ? 6 - 4.5 * ramp(t, sA(24), sA(25), EIO) : 1.5 + 9 * ramp(t, sA(26.8), A_END, EIN);
const SPIN: number[] = (() => {
  const n = Math.ceil((A_END + 1) * FPS) + 2;
  const out = new Array<number>(n);
  let acc = 0;
  for (let i = 0; i < n; i++) {
    out[i] = acc;
    acc += spinF(i / FPS) / FPS;
  }
  return out;
})();
const spin = (t: number) => SPIN[Math.max(0, Math.min(SPIN.length - 1, Math.round(t * FPS)))];

const ringAngle = (rg: Ring, t: number) => rg.g0 + rg.w0 * spin(t);

// The star that falls from the rank ring.
const FALL = sA(13.3);

const phoneState = (t: number): PhoneState => {
  const beat = (((t - A.first) / BEAT) % 1 + 1) % 1;
  const press = sA(3.0);
  const touchO = Math.min(ramp(t, sA(2.3), sA(2.55), EO), 1 - ramp(t, sA(3.3), sA(3.7), EIO));
  const k = ramp(t, sA(2.35), press, EIO);
  // the thumb comes in from the lower right, presses, and lifts back the way it came
  const lift = ramp(t, sA(3.3), sA(3.8), EIN);
  const touch = { x: 250 * (1 - k) + 8 + 220 * lift, y: 330 * (1 - k) + 10 + 320 * lift, s: t < press ? 1.12 - 0.08 * k : 0.97 + 0.07 * ramp(t, press + 0.12, press + 0.4, EO), o: touchO };
  const ripples: { r: number; o: number; c: string }[] = [];
  for (let i = 0; i < 10; i++) {
    const t0 = press + i * 0.38;
    const age = t - t0;
    if (age < 0 || age > 2.6 || t > sA(6.2)) continue;
    ripples.push({ r: BTN_R + 6 + 950 * EO(age / 2.6), o: 0.6 * (1 - age / 2.6) * (1 - ramp(t, sA(5.6), sA(6.2))), c: i % 2 ? K.cyan : K.want });
  }
  const ui = t < sA(3.2) ? 1 : t < sA(6.2) ? 1 - 0.92 * ramp(t, sA(3.2), sA(3.9)) : t < sA(10.2) ? 0.08 + 0.92 * ramp(t, sA(6.2), sA(6.7)) : 1 - ramp(t, sA(10.2), sA(11.0));
  const title = win(t, sA(3.75), sA(6.2), 0.25, 0.4);
  return {
    o: 0.35 + 0.65 * ramp(t, 0, 0.3, EO),
    ui,
    stamp: ramp(t, 0.06, 0.4, EO),
    beat,
    lit: 4,
    touch,
    ripples,
    btnO: 1 - 0.7 * title,
    labelO: (1 - title) * (1 - ramp(t, sA(26.9), sA(27.2))),
    hole: ramp(t, sA(27.0), A_END - 0.25, EIO),
  };
};

export const Rings: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const els: React.ReactNode[] = [];
  RINGS_DEF.forEach((rg, i) => {
    const draw = ramp(t, rg.at, rg.at + 0.9, EO);
    if (draw <= 0) return;
    const a = ringAngle(rg, t);
    const pulse = 0.6 + 0.4 * Math.sin(t * 5.2 + i);
    // the faint full circle and its ticks
    els.push(<circle key={`c${i}`} cx={0} cy={0} r={rg.r} fill="none" stroke={K.fg} strokeOpacity={0.12} strokeWidth={1.5} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />);
    if (i === 0) {
      // 一局: a timer hand sweeps round and closes (ding). This loop closes; the bigger ones never do.
      const p1 = ramp(t, rg.at + 0.1, sA(11.55), EIO);
      if (p1 > 0 && p1 < 1) els.push(<path key="r0a" d={arc(0, 0, rg.r, -90, -90 + 359.9 * p1)} stroke={K.cyan} strokeWidth={7} fill="none" strokeLinecap="round" />);
      if (p1 >= 1) els.push(<circle key="r0c" cx={0} cy={0} r={rg.r} fill="none" stroke={K.cyan} strokeWidth={7} strokeOpacity={0.7} />);
      const flash = win(t, sA(11.55), sA(11.95), 0.05, 0.3);
      if (flash > 0) els.push(<circle key="r0f" cx={0} cy={0} r={rg.r} fill="none" stroke={K.cyanHi} strokeWidth={16} opacity={flash * 0.8} />);
      return;
    }
    const gapW = i === 1 ? (t < FALL + 0.3 ? 34 : 64) : i === 2 ? 104 : i === 3 ? 36 : 30;
    const g0 = a - gapW / 2;
    const g1 = a + gapW / 2;
    if (i !== 2) {
      els.push(<path key={`p${i}`} d={arc(0, 0, rg.r, g1 + 3, g0 + 357)} stroke={K.cyan} strokeOpacity={0.85} strokeWidth={5} fill="none" strokeLinecap="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />);
    } else {
      // 每日任务: three segments, two done
      for (let s = 0; s < 2; s++) els.push(<path key={`p2${s}`} d={arc(0, 0, rg.r, g1 + 8 + s * 128, g1 + 128 + s * 128)} stroke={K.cyan} strokeWidth={9} fill="none" strokeLinecap="round" opacity={draw} />);
    }
    // the gap: what is still missing
    const gd = arc(0, 0, rg.r, g0 + 2, g1 - 2);
    els.push(
      <g key={`g${i}`} opacity={draw * (0.55 + 0.45 * pulse)}>
        <path d={gd} stroke={K.want} strokeWidth={26} strokeOpacity={0.1} fill="none" strokeLinecap="round" />
        <path d={gd} stroke={K.want} strokeWidth={11} strokeOpacity={0.3} fill="none" strokeLinecap="round" />
        <path d={gd} stroke={K.wantHi} strokeWidth={4} fill="none" strokeLinecap="round" strokeDasharray={i === 2 ? "10 9" : undefined} />
      </g>,
    );
    if (i === 1) {
      // five stars: four lit, the fifth an empty magenta slot; one lit star falls off at FALL
      for (let s = 0; s < 5; s++) {
        const sa = a - 132 + s * 33;
        const [sx, sy] = polar(0, 0, rg.r, sa);
        const falling = s === 3 && t >= FALL;
        const lit = s < 4;
        if (falling) {
          const dt = t - FALL;
          const fx = sx + dt * 60;
          const fy = sy + 0.5 * 1500 * dt * dt;
          const fo = 1 - ramp(t, FALL + 0.35, FALL + 0.7);
          if (fo > 0) els.push(<path key={`sf`} d={star(fx, fy, 16)} fill={K.cyan} opacity={fo * draw} transform={`rotate(${dt * 260} ${fx} ${fy})`} />);
          els.push(<path key={`s${s}`} d={star(sx, sy, 15)} fill="none" stroke={K.wantHi} strokeWidth={2.5} opacity={draw * ramp(t, FALL + 0.2, FALL + 0.5)} />);
          continue;
        }
        els.push(<path key={`s${s}`} d={star(sx, sy, 15)} fill={lit ? K.cyan : "none"} stroke={lit ? K.cyanHi : K.wantHi} strokeWidth={2.5} opacity={draw} />);
      }
    }
    if (i === 3) {
      // 赛季: ninety day ticks, the last nine magenta; they blink with the clock
      const tickOn = t > sA(16.5) && t < sA(18.6) ? Math.exp(-(((t - sA(16.5)) / BEAT) % 1) * 6) : 0;
      for (let d = 0; d < 90; d++) {
        const da = g1 + 4 + d * ((356 - gapW) / 89);
        const left = d >= 81;
        const [x0, y0] = polar(0, 0, rg.r - 12, left ? g0 + ((d - 81) * gapW) / 9 : da);
        const [x1, y1] = polar(0, 0, rg.r + 12, left ? g0 + ((d - 81) * gapW) / 9 : da);
        els.push(<line key={`d${d}`} x1={x0} y1={y0} x2={x1} y2={y1} stroke={left ? K.wantHi : K.cyan} strokeWidth={left ? 3 : 1.6} opacity={draw * (left ? 0.7 + 0.3 * tickOn : 0.35)} />);
      }
    }
    if (i === 4) {
      // 好友: five seats, four friends in, one empty
      for (let s = 0; s < 5; s++) {
        const sa = a - 120 + s * 30;
        const [px, py] = polar(0, 0, rg.r, sa);
        const empty = s === 4;
        els.push(
          <g key={`f${s}`} opacity={draw}>
            <circle cx={px} cy={py} r={19} fill={empty ? "#0a0f1c" : "#123a50"} stroke={empty ? K.wantHi : K.cyan} strokeWidth={2.5} strokeDasharray={empty ? "5 5" : undefined} />
            {!empty ? (
              <>
                <circle cx={px} cy={py - 5} r={6} fill={K.cyanHi} />
                <path d={`M ${px - 10} ${py + 11} Q ${px} ${py - 2} ${px + 10} ${py + 11}`} fill={K.cyanHi} />
              </>
            ) : null}
          </g>,
        );
      }
    }
  });
  // matchmaking: two teams slide in around the button, a balance beam settles near level
  const mm = ramp(t, sA(24.15), sA(24.9), EO);
  if (mm > 0) {
    for (let s = 0; s < 10; s++) {
      const left = s < 5;
      const sa = left ? 140 + (s % 5) * 20 : -40 + (s % 5) * 20;
      const rr = 106 + (1 - mm) * 500;
      const [px, py] = polar(0, 0, rr, sa);
      els.push(<circle key={`m${s}`} cx={px} cy={py} r={9} fill={left ? K.cyan : K.fg} opacity={mm * 0.95} />);
    }
    const wob = 9 * Math.sin((t - sA(24.6)) * 4.2) * Math.exp(-Math.max(0, t - sA(24.6)) * 0.45);
    const bo = mm * (1 - ramp(t, sA(27.0), sA(27.4)));
    els.push(
      <g key="beam" opacity={bo} transform={`rotate(${wob})`}>
        <line x1={-128} y1={0} x2={128} y2={0} stroke={K.fg} strokeWidth={3} strokeOpacity={0.75} />
        <circle cx={-128} cy={0} r={6} fill={K.cyan} />
        <circle cx={128} cy={0} r={6} fill={K.fg} />
      </g>,
    );
  }
  return <g transform={camG(cam)}>{els}</g>;
};

const RingLabels: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const out: React.ReactNode[] = [];
  const end = sA(26.9);
  RINGS_DEF.forEach((rg, i) => {
    // ring names sit on the vertical axis while the rings are calm; once they spin, the gaps speak for themselves
    const o = win(t, rg.at + 0.3, sA(20.7), 0.4, 0.4);
    const [nx, ny] = w2s(cam, 0, -rg.r + 27);
    if (o > 0)
      out.push(
        <div key={`n${i}`} style={{ position: "absolute", left: nx, top: ny, transform: "translate(-50%, -50%)", fontFamily: HAN, fontWeight: 800, fontSize: 23 * cam.z, color: "rgba(244,240,232,0.7)", opacity: o, whiteSpace: "nowrap" }}>
          {rg.name}
        </div>,
      );
    if (i === 0 || t < rg.at) return;
    const chip = i === 1 ? (t < FALL + 0.4 ? "还差 1 颗" : "还差 2 颗") : i === 2 ? "还差 1 局" : i === 3 ? "还剩 9 天" : "差 1 人";
    const a = ringAngle(rg, t);
    const [cx, cy] = w2s(cam, ...polar(0, 0, rg.r + 52, a));
    const co = win(t, rg.at + 0.7, end, 0.35, 0.4);
    out.push(
      <div key={`c${i}`} style={{ position: "absolute", left: cx, top: cy, transform: "translate(-50%, -50%)", fontFamily: FONT, fontWeight: 800, fontSize: 25 * cam.z, color: K.wantHi, background: "rgba(255,79,154,0.16)", border: `${1.5 * cam.z}px solid ${K.want}`, borderRadius: 999, padding: `${3 * cam.z}px ${12 * cam.z}px`, whiteSpace: "nowrap", opacity: co }}>
        {chip}
      </div>,
    );
  });
  const m = win(t, sA(24.6), sA(27.1), 0.4, 0.3);
  if (m > 0) {
    const [mx, my] = w2s(cam, 0, -118);
    out.push(
      <div key="mm" style={{ position: "absolute", left: mx, top: my, transform: "translate(-50%, -50%)", fontFamily: NUM, fontWeight: 800, fontSize: 26 * cam.z, color: K.fg, opacity: m, whiteSpace: "nowrap", letterSpacing: 1 }}>
        50 : 50
      </div>,
    );
  }
  return <>{out}</>;
};

// 开心 meter under the phone: it drains in the hook and stays empty while the button keeps glowing.
const Happy: React.FC<{ t: number; cam: Cam }> = ({ t, cam }) => {
  const o = Math.min(win(t, sA(1.3), sA(3.4), 0.35, 0.4) + win(t, sA(6.4), sA(10.1), 0.4, 0.4), 1);
  if (o <= 0) return null;
  const fill = 0.64 - 0.58 * ramp(t, sA(1.5), sA(2.5), EIO);
  const [x0, y0] = w2s(cam, -250, 205);
  const wpx = 500 * cam.z;
  return (
    <div style={{ position: "absolute", left: x0, top: y0, opacity: o, display: "flex", alignItems: "center", gap: 18 * cam.z }}>
      <span style={{ fontFamily: HAN, fontWeight: 800, fontSize: 26 * cam.z, color: K.like, marginLeft: -86 * cam.z, width: 70 * cam.z, textAlign: "right" }}>开心</span>
      <div style={{ position: "relative", width: wpx, height: 14 * cam.z, borderRadius: 99, background: "rgba(255,176,122,0.14)", border: `1px solid rgba(255,176,122,0.4)` }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, borderRadius: 99, background: K.like, boxShadow: `0 0 16px ${K.like}` }} />
      </div>
    </div>
  );
};

export const Clock: React.FC<{ o: number; cam: Cam }> = ({ o, cam }) => {
  if (o <= 0) return null;
  const [x, y] = w2s(cam, 400, -520);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, -50%)", opacity: o, display: "flex", alignItems: "baseline", gap: 14 * cam.z, whiteSpace: "nowrap" }}>
      <span style={{ fontFamily: HAN, fontWeight: 700, fontSize: 26 * cam.z, color: K.sub }}>凌晨</span>
      <span style={{ fontFamily: NUM, fontWeight: 200, fontSize: 92 * cam.z, color: K.fg, letterSpacing: 2, fontVariantNumeric: "tabular-nums" }}>01:47</span>
    </div>
  );
};

export const GameWorld: React.FC = () => {
  const t = useT();
  if (t > A_END + 0.05) return null;
  const cam = camA(t);
  const ps = phoneState(t);
  const ghost = win(t, sA(8.9), sA(10.15), 0.4, 0.4);
  const [gx, gy] = w2s(cam, 0, -175);
  const veil = win(t, sA(3.6), sA(6.3), 0.4, 0.5);
  const blackout = ramp(t, A_END - 0.35, A_END, EIO);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <PhoneSvg cam={cam} s={ps} />
        {ghost > 0 ? <BrainSvg id="ghost" x={gx} y={gy} s={1.02 * cam.z} t={t} st={{ draw: ramp(t, sA(8.9), sA(9.7), EO), o: 0.42 * ghost, like: 0, want: 0, flow: 0, know: 0, ghost: true }} /> : null}
        <Rings t={t} cam={cam} />
      </svg>
      <PhoneHtml cam={cam} s={ps} />
      <Happy t={t} cam={cam} />
      <Clock o={Math.min(win(t, 0, sA(3.4), 0.2, 0.4) + win(t, sA(6.4), sA(10.1), 0.4, 0.4), 1)} cam={cam} />
      <RingLabels t={t} cam={cam} />
      {veil > 0 ? <div style={{ position: "absolute", inset: 0, background: "#04060a", opacity: 0.62 * veil }} /> : null}
      <Title t={t} />
      <GameText t={t} />
      {blackout > 0 ? <div style={{ position: "absolute", inset: 0, background: "#020306", opacity: blackout }} /> : null}
    </div>
  );
};

const Title: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, sA(4.0), sA(5.95), 0.25, 0.45);
  if (o <= 0) return null;
  const k = ramp(t, sA(4.0), sA(4.6), EO);
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", opacity: o }}>
      <div style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 168, color: K.fg, letterSpacing: 24, transform: `scale(${1.08 - 0.08 * k})`, textShadow: "0 0 60px rgba(255,79,154,0.35), 0 4px 20px rgba(0,0,0,0.8)" }}>再来一局</div>
      <div style={{ marginTop: 26, fontFamily: HAN, fontWeight: 700, fontSize: 46, color: "rgba(244,240,232,0.82)", letterSpacing: 6, opacity: ramp(t, sA(4.5), sA(5.0), EO) }}>游戏为什么让人停不下来？</div>
    </div>
  );
};

const want = (s: string) => ({ t: s, c: K.want });

const GameText: React.FC<{ t: number }> = () => (
  <>
    {/* hook */}
    <Box x={110} y={300} gap={18}>
      <Say at={0.12} out={sA(2.95)} size={84} weight={900} parts={["凌晨 ", { t: "1:47", num: true }, "。"]} />
      <Say at={sA(0.55)} out={sA(2.95)} size={56} weight={700} color={K.sub} parts={["今晚第 ", { t: "9", num: true }, " 局，又输了。"]} />
      <Say at={sA(1.5)} out={sA(2.95)} size={62} weight={800} parts={["其实，早就", { t: "不好玩", c: K.like }, "了。"]} style={{ marginTop: 34 }} />
    </Box>
    <Box x={110} y={370} gap={10}>
      <Say at={sA(3.0)} out={sA(3.95)} size={80} weight={900} parts={["可为什么，"]} />
      <Say at={sA(3.18)} out={sA(3.95)} size={80} weight={900} parts={["还是", want("停不下来"), "？"]} />
    </Box>
    {/* it is not the fun */}
    <Box x={110} y={380} gap={16}>
      <Say at={sA(6.25)} out={sA(7.95)} size={66} parts={["让你停不下来的，"]} />
      <Say at={sA(6.65)} out={sA(7.95)} size={66} parts={["不是", { t: "好玩", c: K.like }, "。"]} />
    </Box>
    <Box x={110} y={380} gap={16}>
      <Say at={sA(8.05)} out={sA(10.15)} size={56} weight={700} color={K.sub} parts={["它藏在两个地方："]} />
      <Say at={sA(8.6)} out={sA(10.15)} size={64} parts={[{ t: "游戏里", c: K.cyan }, "，和", want("你脑子里"), "。"]} />
    </Box>
    {/* the rings */}
    <Box x={110} y={360} gap={14}>
      <Say at={sA(10.35)} out={sA(11.9)} size={62} parts={["一局，十几分钟。"]} />
      <Say at={sA(10.95)} out={sA(11.9)} size={50} weight={700} color={K.sub} parts={["“再来一局”，从来不贵。"]} />
    </Box>
    <Box x={110} y={360} gap={14}>
      <Say at={sA(12.05)} out={sA(14.4)} size={62} parts={["差一颗星，就升段。"]} />
      <Say at={sA(13.35)} out={sA(14.4)} size={52} weight={700} color={K.sub} parts={["掉一颗，比赢一颗", { t: "更疼", c: K.wantHi }, "。"]} />
    </Box>
    <Box x={110} y={400} gap={14}>
      <Say at={sA(14.55)} out={sA(16.4)} size={62} parts={["每日任务：", want("还差 1 局"), "。"]} />
    </Box>
    <Box x={110} y={380} gap={14}>
      <Say at={sA(16.55)} out={sA(18.4)} size={62} parts={["赛季", want("还剩 9 天"), "。"]} />
      <Say at={sA(17.3)} out={sA(18.4)} size={54} weight={700} color={K.sub} parts={["过了，奖励就没了。"]} />
    </Box>
    <Box x={110} y={380} gap={14}>
      <Say at={sA(18.55)} out={sA(20.4)} size={46} weight={700} color={K.sub} parts={["好友发来："]} />
      <Say at={sA(18.85)} out={sA(20.4)} size={66} parts={["“差一个，来不来？”"]} />
    </Box>
    {/* the rings spin up with no words for a moment, then one line */}
    <Box x={110} y={380} gap={16}>
      <Say at={sA(21.5)} out={sA(24.0)} size={62} parts={["你想停的那一刻，"]} />
      <Say at={sA(22.0)} out={sA(24.0)} size={62} parts={["总有一个圈，", want("还差一点"), "。"]} />
    </Box>
    <Box x={110} y={360} gap={16}>
      <Say at={sA(24.15)} out={sA(26.35)} size={52} weight={700} parts={["每一局，系统都会找"]} />
      <Say at={sA(24.5)} out={sA(26.35)} size={52} weight={700} parts={["和你差不多强的对手。"]} />
      <Say at={sA(25.25)} out={sA(26.35)} size={62} parts={["输赢，大概", { t: "一半一半", c: K.fg, w: 900 }, "。"]} style={{ marginTop: 18 }} />
    </Box>
    <Box x={110} y={430} gap={16}>
      <Say at={sA(26.45)} out={sA(27.75)} size={66} weight={900} parts={["为什么，一半一半"]} />
      <Say at={sA(26.75)} out={sA(27.75)} size={66} weight={900} parts={["最让人", want("上头"), "？"]} />
    </Box>
  </>
);
