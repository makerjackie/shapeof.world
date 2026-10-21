import { C, W, H, txt, rect, outline, rule, font, token, glow, clamp } from "./engine.js";

export function backdrop(ctx, t, o = {}) {
  const { gridStep = 72, glowColor = "rgba(201,245,109,0.10)", gx = 0.78, gy = 0.28 } = o;
  const g = ctx.createLinearGradient(0, 0, W * 0.35, H);
  g.addColorStop(0, "#0A1012");
  g.addColorStop(0.55, C.bg);
  g.addColorStop(1, "#050808");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  glow(ctx, W * gx, H * gy, 620, glowColor, 0.55);
  if (gridStep) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#2A3A34";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += gridStep) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
    for (let y = 0; y <= H; y += gridStep) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
    ctx.stroke();
    ctx.restore();
  }
  // corner ticks
  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = C.dim;
  ctx.lineWidth = 1;
  const m = 36, l = 18;
  ctx.beginPath();
  ctx.moveTo(m, m + l); ctx.lineTo(m, m); ctx.lineTo(m + l, m);
  ctx.moveTo(W - m - l, m); ctx.lineTo(W - m, m); ctx.lineTo(W - m, m + l);
  ctx.moveTo(W - m, H - m - l); ctx.lineTo(W - m, H - m); ctx.lineTo(W - m - l, H - m);
  ctx.moveTo(m + l, H - m); ctx.lineTo(m, H - m); ctx.lineTo(m, H - m - l);
  ctx.stroke();
  ctx.restore();
}

export function label(ctx, text, x, y, o = {}) {
  const { color = C.lime, alpha = 1, size = 22, dotSize = 8, family = "mono" } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y - dotSize + 1, dotSize, dotSize);
  txt(ctx, text, x + dotSize + 14, y, { size, family, color, spacing: 2.5, weight: 500 });
  ctx.restore();
}

export function card(ctx, x, y, w, h, o = {}) {
  const { fill = C.card, border = C.line, r = 18, shadow = 30, alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = shadow * 0.5;
  }
  rect(ctx, x, y, w, h, fill, r);
  ctx.shadowColor = "transparent";
  outline(ctx, x, y, w, h, border, 1.5, r);
  ctx.restore();
}

export function gpu(ctx, x, y, w, h, o = {}) {
  const { heat = 0, label = "", alpha = 1, color = C.lime } = o;
  ctx.save();
  const base = ctx.globalAlpha * alpha;
  ctx.globalAlpha = base;
  const col = heat > 0.72 ? C.red : heat > 0.4 ? C.amber : color;
  rect(ctx, x, y, w, h, "#0E1719", 8);
  outline(ctx, x, y, w, h, col, 1.6, 8);
  // pins
  ctx.fillStyle = col;
  ctx.globalAlpha = base * 0.8;
  for (let i = 0; i < 4; i++) {
    const px = x + w * (0.2 + i * 0.2);
    ctx.fillRect(px - 1, y - 7, 2, 7);
    ctx.fillRect(px - 1, y + h, 2, 7);
  }
  // die
  const pad = Math.max(6, w * 0.13);
  ctx.fillStyle = col;
  ctx.globalAlpha = base * (0.18 + heat * 0.25);
  ctx.fillRect(x + pad, y + pad, w - pad * 2, h - pad * 2);
  ctx.strokeStyle = col;
  ctx.globalAlpha = base * 0.55;
  ctx.lineWidth = 1;
  for (let i = 1; i < 4; i++) {
    ctx.beginPath(); ctx.moveTo(x + pad, y + (h * i) / 4); ctx.lineTo(x + w - pad, y + (h * i) / 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + (w * i) / 4, y + pad); ctx.lineTo(x + (w * i) / 4, y + h - pad); ctx.stroke();
  }
  ctx.restore();
  if (label) {
    txt(ctx, label, x + w / 2, y + h + 34, {
      size: 18, family: "mono", color: heat > 0.7 ? C.red : C.mute, align: "center", spacing: 1.5, alpha,
    });
  }
}

export function flow(ctx, points, t, o = {}) {
  const { color = C.lime, count = 8, speed = 0.35, size = 7, alpha = 1, spread = 0, seed = 0 } = o;
  // polyline length
  const segs = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i - 1];
    const [x2, y2] = points[i];
    const len = Math.hypot(x2 - x1, y2 - y1);
    segs.push({ x1, y1, x2, y2, len, start: total });
    total += len;
  }
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < count; i++) {
    let d = ((t * speed + i / count + seed) % 1) * total;
    const seg = segs.find((s) => d >= s.start && d <= s.start + s.len) ?? segs.at(-1);
    const p = (d - seg.start) / seg.len;
    const x = seg.x1 + (seg.x2 - seg.x1) * p;
    const y = seg.y1 + (seg.y2 - seg.y1) * p;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - size / 2, y - size / 2, size, size, size * 0.2);
    ctx.fill();
  }
  ctx.restore();
}

export function wire(ctx, points, o = {}) {
  const { color = C.line, width = 2, alpha = 1, dash = null } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.stroke();
  ctx.restore();
}

export function tokenStream(ctx, x, y, t, o = {}) {
  const { rows = 10, color = C.lime, alpha = 1, density = 1, width = 300 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let r = 0; r < rows; r++) {
    const yy = y + r * 26;
    const n = Math.round(density * 9);
    for (let i = 0; i < n; i++) {
      const ph = (t * 0.8 + i * 0.13 + r * 0.07) % 1;
      const xx = x + ph * width;
      ctx.globalAlpha = alpha * (1 - ph) * 0.9;
      token(ctx, xx, yy, 10, color);
    }
  }
  ctx.restore();
}

export function ring(ctx, x, y, r, t, o = {}) {
  const { color = C.lime, alpha = 0.4, count = 3, speed = 0.5, width = 2 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  for (let i = 0; i < count; i++) {
    const p = (t * speed + i / count) % 1;
    ctx.globalAlpha = alpha * (1 - p);
    ctx.beginPath();
    ctx.arc(x, y, r * (0.4 + p * 0.6), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

export function check(ctx, x, y, s = 20, color = C.lime, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.15);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, y);
  ctx.lineTo(x - s * 0.1, y + s * 0.34);
  ctx.lineTo(x + s * 0.48, y - s * 0.34);
  ctx.stroke();
  ctx.restore();
}

export function cross(ctx, x, y, s = 20, color = C.red, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, s * 0.15);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - s * 0.35, y - s * 0.35); ctx.lineTo(x + s * 0.35, y + s * 0.35);
  ctx.moveTo(x + s * 0.35, y - s * 0.35); ctx.lineTo(x - s * 0.35, y + s * 0.35);
  ctx.stroke();
  ctx.restore();
}

export function bracketBox(ctx, x, y, w, h, o = {}) {
  const { color = C.lime, len = 26, width = 3, alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
  ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
  ctx.moveTo(x + w, y + h - len); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - len, y + h);
  ctx.moveTo(x + len, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - len);
  ctx.stroke();
  ctx.restore();
}

export function status(ctx, text, x, y, o = {}) {
  const { color = C.lime, size = 18, alpha = 1 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y - size * 0.3, 4, 0, Math.PI * 2);
  ctx.fill();
  txt(ctx, text, x + 14, y, { size, family: "mono", color, spacing: 2 });
  ctx.restore();
}
