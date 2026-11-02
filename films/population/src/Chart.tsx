// The births/deaths chart on one canvas: grid, yearly columns (red = more births than the year before, green = fewer),
// the two glowing lines with their heads, and the particle work (sparks, fireworks, lightning).
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, useCurrentFrame } from "remotion";
import { Cam, camAt, sx, sy, Y_BASE, Y_TOP } from "./camera";
import { births, deaths, fmtWan, row, Y0, Y1 } from "./data";
import { ALL_EVENTS, CURSOR } from "./plan";
import { C, FONT_CN, FONT_NUM } from "./theme";
import { FPS, H, toBar, W } from "./time";

// deterministic random
export const rng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const niceStep = (yMax: number) => {
  for (const s of [100, 200, 250, 500, 1000]) if (yMax / s <= 6) return s;
  return 1000;
};

type Opts = { bar: number; alpha: number; colAlpha: number; lineAlpha: number; showHeads: boolean; overview: number };

const draw = (ctx: CanvasRenderingContext2D, o: Opts) => {
  const { bar } = o;
  const cam: Cam = camAt(bar);
  const c = cam.c;
  ctx.clearRect(0, 0, W, H);
  ctx.globalAlpha = o.alpha;
  const X = (x: number) => sx(cam, x);
  const Yv = (v: number) => sy(cam, v);
  const xa = Math.max(Y0, Math.floor(cam.x0) - 1);
  const xb = Math.min(c, Y1);
  const colW = Math.max(3, (0.46 * W) / cam.span);

  // ---- grid
  const step = niceStep(cam.yMax);
  ctx.font = `600 22px ${FONT_NUM}`;
  ctx.textBaseline = "middle";
  for (let v = step; v < cam.yMax; v += step) {
    const y = Yv(v);
    ctx.strokeStyle = "rgba(160,175,200,0.10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(170,180,200,0.42)";
    ctx.textAlign = "left";
    ctx.fillText(`${fmtWan(v)}万`, 22, y - 14);
  }
  ctx.strokeStyle = "rgba(170,185,210,0.28)";
  ctx.beginPath();
  ctx.moveTo(0, Y_BASE);
  ctx.lineTo(W, Y_BASE);
  ctx.stroke();
  const dec = cam.span > 40 ? 10 : cam.span > 18 ? 5 : cam.span > 9 ? 2 : 1;
  ctx.textAlign = "center";
  ctx.font = `600 24px ${FONT_NUM}`;
  for (let y = Math.ceil(cam.x0 / dec) * dec; y <= cam.x0 + cam.span; y += dec) {
    if (y < Y0 || y > Y1) continue;
    const x = X(y);
    ctx.strokeStyle = "rgba(160,175,200,0.06)";
    ctx.beginPath();
    ctx.moveTo(x, Y_TOP - 40);
    ctx.lineTo(x, Y_BASE);
    ctx.stroke();
    ctx.fillStyle = y <= c ? "rgba(200,208,224,0.55)" : "rgba(200,208,224,0.18)";
    ctx.fillText(String(y), x, Y_BASE + 30);
  }

  // ---- gap between the lines: warm while births lead, cold where deaths lead
  if (xb > xa) {
    const n = Math.max(2, Math.ceil((xb - xa) * 8));
    for (let i = 0; i < n; i++) {
      const x0 = xa + ((xb - xa) * i) / n;
      const x1 = xa + ((xb - xa) * (i + 1)) / n;
      const lead = births((x0 + x1) / 2) - deaths((x0 + x1) / 2);
      ctx.fillStyle = lead >= 0 ? `rgba(255,70,90,${0.07 * o.lineAlpha})` : `rgba(40,240,150,${0.2 * o.lineAlpha})`;
      ctx.beginPath();
      ctx.moveTo(X(x0), Yv(births(x0)));
      ctx.lineTo(X(x1), Yv(births(x1)));
      ctx.lineTo(X(x1), Yv(deaths(x1)));
      ctx.lineTo(X(x0), Yv(deaths(x0)));
      ctx.closePath();
      ctx.fill();
    }
  }

  // ---- yearly columns
  if (o.colAlpha > 0) {
    for (let y = Math.max(Y0, Math.floor(cam.x0) - 1); y <= Math.min(Y1, Math.floor(c)); y++) {
      const grow = Math.min(1, (c - y) / 0.22 + 0.04);
      if (grow <= 0) continue;
      const v = row(y).b * (0.25 + 0.75 * grow);
      const up = y === Y0 || row(y).b >= row(y - 1).b;
      const x = X(y);
      const top = Yv(v);
      const base = up ? "255,58,84" : "30,226,138";
      const hl = o.overview > 0 ? 1 : 1;
      const g = ctx.createLinearGradient(0, top, 0, Y_BASE);
      g.addColorStop(0, `rgba(${base},${0.62 * o.colAlpha * hl})`);
      g.addColorStop(0.55, `rgba(${base},${0.18 * o.colAlpha})`);
      g.addColorStop(1, `rgba(${base},${0.04 * o.colAlpha})`);
      ctx.fillStyle = g;
      ctx.fillRect(x - colW / 2, top, colW, Y_BASE - top);
      ctx.save();
      ctx.shadowColor = `rgba(${base},0.9)`;
      ctx.shadowBlur = 16;
      ctx.fillStyle = `rgba(${base},${0.95 * o.colAlpha})`;
      ctx.fillRect(x - colW / 2, top - 1.5, colW, Math.max(3, colW * 0.06));
      ctx.restore();
      // reflection
      const r = ctx.createLinearGradient(0, Y_BASE, 0, Y_BASE + (Y_BASE - top) * 0.35);
      r.addColorStop(0, `rgba(${base},${0.14 * o.colAlpha})`);
      r.addColorStop(1, `rgba(${base},0)`);
      ctx.fillStyle = r;
      ctx.fillRect(x - colW / 2, Y_BASE + 2, colW, (Y_BASE - top) * 0.35);
    }
  }

  // ---- lines
  const line = (f: (x: number) => number, core: string, glow: string, w: number) => {
    if (xb <= Y0) return;
    ctx.save();
    ctx.globalAlpha = o.alpha * o.lineAlpha;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(X(xa), Yv(f(xa)));
      for (let y = xa + 1; y < xb; y++) ctx.lineTo(X(y), Yv(f(y)));
      ctx.lineTo(X(xb), Yv(f(xb)));
    };
    ctx.shadowColor = glow;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = glow;
    ctx.lineWidth = w * 2.2;
    ctx.globalAlpha = o.alpha * o.lineAlpha * 0.35;
    path();
    ctx.stroke();
    ctx.globalAlpha = o.alpha * o.lineAlpha;
    ctx.shadowBlur = 12;
    ctx.strokeStyle = core;
    ctx.lineWidth = w;
    path();
    ctx.stroke();
    ctx.restore();
  };
  line(deaths, "#d9efff", "rgba(80,170,255,1)", 4);
  line(births, "#fff3ea", "rgba(255,60,90,1)", 5);

  // ---- heads
  if (o.showHeads && c > Y0 - 0.001) {
    const hb = { x: X(c), y: Yv(births(c)) };
    const hd = { x: X(c), y: Yv(deaths(c)) };
    // scan line
    const sg = ctx.createLinearGradient(0, Y_TOP - 60, 0, Y_BASE);
    sg.addColorStop(0, "rgba(255,255,255,0)");
    sg.addColorStop(1, "rgba(255,255,255,0.16)");
    ctx.strokeStyle = sg;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hb.x, Y_TOP - 60);
    ctx.lineTo(hb.x, Y_BASE);
    ctx.stroke();
    const dot = (p: { x: number; y: number }, col: string, r: number) => {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 7);
      g.addColorStop(0, col.replace("A", "0.9"));
      g.addColorStop(0.25, col.replace("A", "0.35"));
      g.addColorStop(1, col.replace("A", "0"));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    };
    dot(hd, "rgba(90,180,255,A)", 7);
    dot(hb, "rgba(255,70,100,A)", 9);
    // labels, kept apart
    let lb = hb.y - 34;
    let ld = hd.y + 40;
    if (births(c) < deaths(c)) {
      lb = hb.y + 44;
      ld = hd.y - 30;
    }
    if (Math.abs(lb - ld) < 48) {
      const mid = (lb + ld) / 2;
      const s = lb < ld ? -1 : 1;
      lb = mid + s * 24;
      ld = mid - s * 24;
    }
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const label = (txt: string, num: string, x: number, y: number, col: string) => {
      ctx.font = `800 34px ${FONT_NUM}`;
      const wNum = ctx.measureText(num).width;
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.9)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = col;
      ctx.fillText(num, x, y);
      ctx.font = `700 26px ${FONT_CN}`;
      ctx.fillStyle = "rgba(230,235,245,0.85)";
      ctx.fillText(txt, x - wNum - 10, y + 1);
      ctx.restore();
    };
    label("出生", `${fmtWan(births(c))}万`, hb.x - 22, lb, "#ff6b82");
    label("死亡", `${fmtWan(deaths(c))}万`, hd.x - 22, ld, "#8fd0ff");

    // sparks shed by the births head
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const t = bar;
    for (let k = 0; k < 26; k++) {
      const tb = Math.floor(t * 60) / 60 - k / 60; // emitted on a 1/60-bar grid
      const age = (t - tb) / 0.5;
      if (age < 0 || age > 1) continue;
      const r = rng(Math.floor(tb * 60) * 7 + 3);
      const cx = CURSOR(Math.max(0, tb));
      if (cx < Y0) continue;
      const px = X(cx) + (r() - 0.7) * 40 * age * 2.2;
      const py = Yv(births(cx)) + (r() - 0.65) * 70 * age * 2.2 + 30 * age * age;
      ctx.fillStyle = `rgba(255,${150 + r() * 90},${120 + r() * 80},${(1 - age) * 0.8})`;
      ctx.fillRect(px, py, 2.6, 2.6);
    }
    ctx.restore();
  }

  // ---- fireworks and lightning
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ALL_EVENTS.forEach((e, ei) => {
    if (e.k === "fire") {
      const bursts = e.big ? 3 : 2;
      for (let bi = 0; bi < bursts; bi++) {
        const t0 = e.at + bi * 0.22;
        const dt = (bar - t0) * (240 / 130); // seconds
        if (dt < 0 || dt > 1.9) continue;
        const ox = X(e.x) + (bi - 1) * 46;
        const oy = Yv(births(e.x)) - 40 - bi * 70;
        const r = rng(ei * 97 + bi * 13);
        const n = e.big ? 120 : 80;
        for (let i = 0; i < n; i++) {
          const a = r() * Math.PI * 2;
          const sp = 260 + r() * 420;
          const hue = r();
          const col = hue < 0.45 ? "255,200,90" : hue < 0.8 ? "255,70,95" : "255,245,230";
          const pos = (tt: number) => {
            const drag = (1 - Math.exp(-2.2 * tt)) / 2.2;
            return { x: ox + Math.cos(a) * sp * drag, y: oy + Math.sin(a) * sp * drag + 160 * tt * tt };
          };
          const p1 = pos(dt);
          const p0 = pos(Math.max(0, dt - 0.07));
          const life = 1 - dt / (1.3 + r() * 0.6);
          if (life <= 0) continue;
          const tw = 0.6 + 0.4 * Math.sin(dt * 40 + i);
          ctx.strokeStyle = `rgba(${col},${life * tw})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(p0.x, p0.y);
          ctx.lineTo(p1.x, p1.y);
          ctx.stroke();
        }
        if (dt < 0.25) {
          const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, 220);
          g.addColorStop(0, `rgba(255,220,170,${0.7 * (1 - dt / 0.25)})`);
          g.addColorStop(1, "rgba(255,120,80,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ox, oy, 220, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    if (e.k === "bolt") {
      const dt = (bar - e.at) * (240 / 130);
      if (dt < -0.02 || dt > 0.75) return;
      const fr = Math.floor(dt * 20);
      const r = rng(ei * 131 + fr * 7);
      const tx = X(e.x);
      const ty = Yv(Math.min(births(e.x), deaths(e.x)));
      const life = dt < 0.08 ? 1 : Math.max(0, 1 - (dt - 0.08) / 0.6);
      const flick = fr % 3 === 1 ? 0.45 : 1;
      const bolt = (x0: number, y0: number, x1: number, y1: number, depth: number, w: number) => {
        const pts: [number, number][] = [[x0, y0]];
        const n = 14;
        for (let i = 1; i < n; i++) {
          const k = i / n;
          pts.push([x0 + (x1 - x0) * k + (r() - 0.5) * 90 * (1 - k * 0.6), y0 + (y1 - y0) * k + (r() - 0.5) * 20]);
        }
        pts.push([x1, y1]);
        for (const [lw, col] of [
          [w * 7, `rgba(120,170,255,${0.18 * life * flick})`],
          [w * 2.6, `rgba(190,215,255,${0.6 * life * flick})`],
          [w, `rgba(255,255,255,${life * flick})`],
        ] as [number, string][]) {
          ctx.strokeStyle = col;
          ctx.lineWidth = lw;
          ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
          ctx.stroke();
        }
        if (depth > 0)
          for (let j = 0; j < 3; j++) {
            const p = pts[3 + Math.floor(r() * 8)];
            bolt(p[0], p[1], p[0] + (r() - 0.5) * 300, p[1] + 80 + r() * 260, depth - 1, w * 0.5);
          }
      };
      bolt(tx + (r() - 0.5) * 160, -40, tx, ty, 1, 3.2);
      // ground burst
      const gg = ctx.createRadialGradient(tx, ty, 0, tx, ty, 260);
      gg.addColorStop(0, `rgba(200,255,230,${0.55 * life})`);
      gg.addColorStop(1, "rgba(40,255,160,0)");
      ctx.fillStyle = gg;
      ctx.beginPath();
      ctx.arc(tx, ty, 260, 0, Math.PI * 2);
      ctx.fill();
      // debris
      const rr = rng(ei * 7 + 1);
      for (let i = 0; i < 60; i++) {
        const a = -Math.PI * (0.05 + 0.9 * rr());
        const sp = 200 + rr() * 500;
        const x = tx + Math.cos(a) * sp * dt;
        const y = ty + Math.sin(a) * sp * dt + 700 * dt * dt;
        ctx.fillStyle = `rgba(150,255,200,${Math.max(0, 1 - dt / 0.75)})`;
        ctx.fillRect(x, y, 3, 3);
      }
    }
  });
  ctx.restore();
  ctx.globalAlpha = 1;
};

export const Chart: React.FC<Omit<Opts, "bar">> = (p) => {
  const frame = useCurrentFrame();
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("chart fonts"));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    document.fonts.ready.then(() => {
      setReady(true);
      continueRender(handle);
    });
  }, [handle]);
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const ctx = ref.current.getContext("2d")!;
    draw(ctx, { ...p, bar: toBar(frame / FPS) });
  });
  return <canvas ref={ref} width={W} height={H} style={{ position: "absolute", inset: 0, width: W, height: H }} />;
};
export { C };
