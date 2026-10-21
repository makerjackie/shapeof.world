// Shared drawing language for the film: warm paper type on an instrument-panel dark.

export const W = 1920;
export const H = 1080;

export const C = {
  bg: "#070B0C",
  bg2: "#0C1214",
  card: "#10181A",
  card2: "#162124",
  paper: "#F3EEE3",
  paperDim: "#C9C3B6",
  mute: "#87948D",
  dim: "#3E4B45",
  line: "#243029",
  lime: "#C9F56D",
  limeDim: "#7E9B45",
  amber: "#FFB45C",
  red: "#FF5D47",
  cyan: "#79DDE6",
  violet: "#B6A7FF",
};

export const F = {
  sans: '"PingFang SC","Hiragino Sans GB","Noto Sans CJK SC",sans-serif',
  serif: '"Songti SC","STSong","Noto Serif CJK SC",serif',
  mono: '"SF Mono",Menlo,"Roboto Mono",monospace',
};

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeOut = (t) => 1 - Math.pow(1 - clamp(t), 3);
export const easeIn = (t) => Math.pow(clamp(t), 3);
export const easeInOut = (t) => {
  t = clamp(t);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
export const easeOutBack = (t) => {
  t = clamp(t);
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};
// 0 → 1 over [at, at+dur]
export const at = (t, start, dur = 0.4) => clamp((t - start) / dur);
export const pulse = (t, hz = 2, phase = 0) => 0.5 + 0.5 * Math.sin((t * hz + phase) * Math.PI * 2);

export function font(ctx, size, o = {}) {
  const { weight = 500, family = "sans", style = "normal", spacing = 0 } = o;
  ctx.font = `${style} ${weight} ${size}px ${F[family]}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = `${spacing}px`;
}

export function measure(ctx, str, size, o = {}) {
  font(ctx, size, o);
  return ctx.measureText(str).width;
}

export function txt(ctx, str, x, y, o = {}) {
  const {
    size = 48, weight = 500, family = "sans", color = C.paper, align = "left",
    baseline = "alphabetic", spacing = 0, alpha = 1, style = "normal", shadow = 0,
  } = o;
  ctx.save();
  font(ctx, size, { weight, family, spacing, style });
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.globalAlpha *= alpha;
  if (shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = shadow;
    ctx.shadowOffsetY = Math.round(shadow * 0.25);
  }
  ctx.fillText(str, x, y);
  const w = ctx.measureText(str).width;
  ctx.restore();
  return w;
}

export function fitSize(ctx, str, maxWidth, size, o = {}) {
  let s = size;
  while (s > 12 && measure(ctx, str, s, o) > maxWidth) s -= 2;
  return s;
}

export function wrap(ctx, str, maxWidth, size, o = {}) {
  font(ctx, size, o);
  const chars = [...str];
  const lines = [];
  let line = "";
  for (const ch of chars) {
    if (ch === "\n") { lines.push(line); line = ""; continue; }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line = test;
  }
  if (line) lines.push(line);
  // Avoid a line that starts with closing punctuation (a one-character widow).
  for (let i = 1; i < lines.length; i++) {
    while (lines[i] && /^[。，、！？；：）】》”’]/.test(lines[i])) {
      lines[i - 1] += lines[i][0];
      lines[i] = lines[i].slice(1);
    }
  }
  return lines.filter(Boolean);
}

export function rule(ctx, x1, y1, x2, y2, color = C.line, width = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.restore();
}

export function rect(ctx, x, y, w, h, fill, r = 0) {
  ctx.beginPath();
  if (r) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fill();
}

export function outline(ctx, x, y, w, h, color = C.line, width = 1, r = 0, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  if (r) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  ctx.stroke();
  ctx.restore();
}

export function grid(ctx, step = 60, color = C.line, alpha = 0.28) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= W; x += step) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); }
  for (let y = 0; y <= H; y += step) { ctx.moveTo(0, y + 0.5); ctx.lineTo(W, y + 0.5); }
  ctx.stroke();
  ctx.restore();
}

export function bracket(ctx, x, y, w, h, color = C.lime, len = 22, width = 3, alpha = 1) {
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

export function chip(ctx, label, x, y, o = {}) {
  const { size = 26, color = C.paper, border = C.line, fill = "rgba(255,255,255,0.03)", pad = 18, h = 48, alpha = 1, family = "mono", weight = 500 } = o;
  ctx.save();
  ctx.globalAlpha *= alpha;
  font(ctx, size, { family, weight, spacing: 1 });
  const w = ctx.measureText(label).width + pad * 2;
  rect(ctx, x, y, w, h, fill, h / 2);
  outline(ctx, x, y, w, h, border, 1.5, h / 2);
  txt(ctx, label, x + w / 2, y + h / 2 + size * 0.35, { size, family, weight, color, align: "center", spacing: 1 });
  ctx.restore();
  return w;
}

export function stamp(ctx, label, x, y, rot = -0.1, color = C.lime, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rot);
  ctx.scale(scale, scale);
  font(ctx, 30, { family: "mono", weight: 700, spacing: 3 });
  const w = ctx.measureText(label).width + 44;
  const h = 66;
  outline(ctx, -w / 2, -h / 2, w, h, color, 3);
  txt(ctx, label, 0, 11, { size: 30, family: "mono", weight: 700, color, align: "center", spacing: 3 });
  ctx.restore();
}

export function token(ctx, x, y, s = 12, color = C.lime, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, s, s, s * 0.2);
  ctx.fill();
  ctx.restore();
}

export function chipIcon(ctx, x, y, w, h, color = C.lime, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  for (let i = 0; i < 5; i++) {
    const p = y + h * (0.15 + i * 0.175);
    ctx.beginPath(); ctx.moveTo(x - 8, p); ctx.lineTo(x, p); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + w, p); ctx.lineTo(x + w + 8, p); ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.globalAlpha *= 0.22;
  ctx.fillRect(x + w * 0.18, y + h * 0.18, w * 0.64, h * 0.64);
  ctx.restore();
}

export function arrow(ctx, x1, y1, x2, y2, color = C.lime, width = 2, alpha = 1, head = 10) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// Deterministic noise pattern, built once.
let _noise = null;
export function grain(ctx, frame, alpha = 0.05) {
  if (!_noise) {
    const c = document.createElement("canvas");
    c.width = 220; c.height = 220;
    const g = c.getContext("2d");
    const img = g.createImageData(c.width, c.height);
    let seed = 1234567;
    for (let i = 0; i < img.data.length; i += 4) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const v = (seed >>> 24) & 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    _noise = c;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "overlay";
  const ox = (frame * 37) % 220;
  const oy = (frame * 61) % 220;
  for (let x = -ox; x < W; x += 220) {
    for (let y = -oy; y < H; y += 220) ctx.drawImage(_noise, x, y);
  }
  ctx.restore();
}

let _vig = null;
export function vignette(ctx, alpha = 0.55) {
  if (!_vig) {
    _vig = ctx.createRadialGradient(W * 0.5, H * 0.46, H * 0.18, W * 0.5, H * 0.5, H * 0.78);
    _vig.addColorStop(0, "rgba(0,0,0,0)");
    _vig.addColorStop(1, "rgba(0,0,0,1)");
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = _vig;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

export function scan(ctx, alpha = 0.05) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000";
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.restore();
}

// A soft glow disc, useful for GPU heat / power.
export function glow(ctx, x, y, r, color, alpha = 0.5) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
