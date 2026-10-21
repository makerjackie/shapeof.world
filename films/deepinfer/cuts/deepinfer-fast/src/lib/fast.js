import { W, H, C, txt, clamp, easeOut } from "./engine.js";

export function slam(ctx, text, x, y, o, p) {
  const q = clamp(p);
  if (q <= 0) return;
  const s = 1 + 0.14 * (1 - easeOut(q));
  ctx.save();
  ctx.globalAlpha = clamp(q * 2.2);
  ctx.translate(x, y);
  ctx.scale(s, s);
  txt(ctx, text, 0, 0, o);
  ctx.restore();
}

export function cutFlash(ctx, t, times) {
  for (const time of times) {
    if (t >= time && t < time + 0.05) {
      ctx.save();
      ctx.globalAlpha = (1 - (t - time) / 0.05) * 0.16;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
      return;
    }
  }
}

export function sideLabel(ctx, text, x, y, o = {}) {
  txt(ctx, text, x, y, { size: 16, family: "mono", color: o.color ?? C.mute, spacing: 3, alpha: o.alpha ?? 1 });
}

export function bar(ctx, x, y, w, h, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
}
