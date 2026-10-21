import { C, W, H, txt, rule, rect, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, label, bracketBox } from "../lib/parts.js";

function reveal(ctx, p, x, y, w, h, fn) {
  if (p <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - h, w, h * easeOut(p));
  ctx.clip();
  ctx.translate(0, (1 - easeOut(p)) * h * 0.3);
  fn();
  ctx.restore();
}

export default {
  id: "hook",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.09)", gx: 0.78, gy: 0.25, gridStep: 90 });
    label(ctx, "DEEPSEEK / OPEN SOURCE", 120, 185, { size: 20, color: C.lime, alpha: clamp(t / 0.3) });

    txt(ctx, "DeepSeek", 120, 320, {
      size: 42, family: "mono", weight: 600, color: C.paperDim, spacing: 1,
      alpha: clamp((t - 0.05) / 0.3),
    });
    if (t < 2.2) {
      ctx.save();
      ctx.globalAlpha = Math.sin(t * 14) > 0 ? 0.9 : 0.2;
      rect(ctx, 120 + measure(ctx, "DeepSeek", 42, { family: "mono", weight: 600, spacing: 1 }) + 10, 284, 14, 38, C.lime, 2);
      ctx.restore();
    }

    reveal(ctx, at(t, 0.35, 0.6), 108, 590, 1000, 220, () => {
      txt(ctx, "又开源了。", 112, 560, {
        size: 188, family: "serif", weight: 700, color: C.paper, spacing: -4,
      });
    });

    const p2 = at(t, 3.2, 0.45);
    if (p2 > 0) {
      ctx.save();
      ctx.globalAlpha = p2;
      txt(ctx, "但这次，不是模型。", 120, 690, {
        size: 78, weight: 500, color: C.paperDim, spacing: 0.5,
      });
      const pre = measure(ctx, "但这次，不是", 78, { weight: 500, spacing: 0.5 });
      const wordW = measure(ctx, "模型。", 78, { weight: 500, spacing: 0.5 });
      const sp = at(t, 4.5, 0.35);
      if (sp > 0) rule(ctx, 120 + pre, 716, 120 + pre + (wordW - 14) * sp, 716, C.red, 6);
      ctx.restore();
    }

    const p3 = at(t, 6.1, 0.4);
    if (p3 > 0) {
      ctx.save();
      ctx.globalAlpha = p3;
      bracketBox(ctx, 112, 756, 650, 118, { color: C.lime, len: 26, width: 3, alpha: 0.9 });
      txt(ctx, "是引擎。", 140, 840, { size: 70, weight: 700, color: C.lime, spacing: 1 });
      ctx.restore();
    }

    // commit wall
    ctx.save();
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 8; c++) {
        const lit = (r * 8 + c * 5) % 11 < 2;
        const on = t > 0.3 + r * 0.04 + c * 0.025;
        ctx.globalAlpha = on ? (lit ? 0.55 : 0.3) : 0;
        ctx.fillStyle = lit ? C.lime : C.dim;
        ctx.beginPath();
        ctx.roundRect(1260 + c * 42, 240 + r * 42, 28, 28, 4);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(1830, 520);
    ctx.rotate(-Math.PI / 2);
    txt(ctx, "EXP. 01  /  INFERENCE", 0, 0, { size: 18, family: "mono", color: C.mute, spacing: 4, alpha: 0.7 });
    ctx.restore();

    const hp = at(t, 6.4, 0.4);
    rule(ctx, 120, 930, 1800, 930, C.line, 1, 0.6 * hp);
    txt(ctx, "模型只是上半句", 120, 982, { size: 26, color: C.mute, spacing: 2, alpha: hp });
    txt(ctx, "下半句，在机房里", 1800, 982, { size: 26, color: C.mute, align: "right", spacing: 2, alpha: hp });
  },
};
