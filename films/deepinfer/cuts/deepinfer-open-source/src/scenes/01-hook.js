import { C, W, H, txt, rule, rect, at, easeOut, clamp, measure, font } from "../lib/engine.js";
import { backdrop, label, bracketBox } from "../lib/parts.js";

function reveal(ctx, p, x, y, w, h, fn) {
  if (p <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y - h, w, h * easeOut(p));
  ctx.clip();
  ctx.translate(0, (1 - easeOut(p)) * h * 0.32);
  fn();
  ctx.restore();
}

export default {
  id: "hook",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.09)", gx: 0.82, gy: 0.2 });

    // A quiet commit wall, far right.
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 7; c++) {
        const seed = (r * 7 + c * 13) % 17;
        const lit = seed % 5 === 0;
        const on = t > 0.3 + r * 0.05 + c * 0.03;
        ctx.fillStyle = lit ? C.lime : "#1B2622";
        ctx.globalAlpha = on ? (lit ? 0.5 : 0.55) : 0;
        ctx.beginPath();
        ctx.roundRect(760 + c * 34, 250 + r * 34, 22, 22, 4);
        ctx.fill();
      }
    }
    ctx.restore();

    label(ctx, "DEEPSEEK / OPEN SOURCE", 90, 215, { size: 20, color: C.lime, alpha: clamp(t / 0.3) });

    txt(ctx, "DeepSeek", 90, 410, {
      size: 54, family: "mono", weight: 600, color: C.paperDim, spacing: 1,
      alpha: clamp((t - 0.05) / 0.25),
    });
    if (t < 1.6) {
      ctx.save();
      ctx.globalAlpha = Math.sin(t * 18) > 0 ? 0.9 : 0.2;
      rect(ctx, 90 + measure(ctx, "DeepSeek", 54, { family: "mono", weight: 600, spacing: 1 }) + 12, 366, 18, 46, C.lime, 2);
      ctx.restore();
    }

    reveal(ctx, at(t, 0.14, 0.5), 80, 800, 940, 210, () => {
      txt(ctx, "又开源了", 84, 760, {
        size: 184, family: "serif", weight: 700, color: C.paper, spacing: -4,
      });
    });

    const p2 = at(t, 1.9, 0.4);
    if (p2 > 0) {
      ctx.save();
      ctx.globalAlpha = p2;
      txt(ctx, "但这次，不是模型。", 90, 892, {
        size: 62, weight: 500, color: C.paperDim, spacing: 0.5,
      });
      const pre = measure(ctx, "但这次，不是", 62, { weight: 500, spacing: 0.5 });
      const wordW = measure(ctx, "模型。", 62, { weight: 500, spacing: 0.5 });
      const sp = at(t, 2.75, 0.3);
      if (sp > 0) {
        rule(ctx, 90 + pre, 916, 90 + pre + (wordW - 12) * sp, 916, C.red, 5);
      }
      ctx.restore();
    }

    const p3 = at(t, 3.15, 0.35);
    if (p3 > 0) {
      ctx.save();
      ctx.globalAlpha = p3;
      bracketBox(ctx, 84, 942, 760, 112, { color: C.lime, len: 24, width: 3, alpha: 0.9 });
      txt(ctx, "是让 AI 接得住所有人的那套引擎", 104, 1012, {
        size: 34, weight: 500, color: C.lime, spacing: 0.5,
      });
      ctx.restore();
    }

    // What was already open, and what is new.
    const lp = at(t, 2.9, 0.4);
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha = lp;
      rule(ctx, 90, 1120, 990, 1120, C.line, 1);
      txt(ctx, "模型", 90, 1186, { size: 30, weight: 600, color: C.paperDim, spacing: 1 });
      txt(ctx, "之前开源过", 230, 1186, { size: 22, color: C.mute, spacing: 1 });
      txt(ctx, "01", 990, 1186, { size: 18, family: "mono", color: C.dim, align: "right", spacing: 2 });

      rule(ctx, 90, 1224, 990, 1224, C.line, 1, 0.7);
      txt(ctx, "推理框架", 90, 1290, { size: 30, weight: 600, color: C.lime, spacing: 1 });
      txt(ctx, "这次开源", 274, 1290, { size: 22, color: C.lime, spacing: 1 });
      txt(ctx, "02", 990, 1290, { size: 18, family: "mono", color: C.lime, align: "right", spacing: 2 });
      ctx.restore();
    }

    // vertical issue mark
    ctx.save();
    ctx.translate(1004, 560);
    ctx.rotate(-Math.PI / 2);
    txt(ctx, "EXP. 01  /  INFERENCE", 0, 0, { size: 18, family: "mono", color: C.mute, spacing: 4, alpha: 0.7 });
    ctx.restore();

    rule(ctx, 90, 1396, 990, 1396, C.line, 1, 0.7);
    txt(ctx, "模型只是上半句", 90, 1448, { size: 26, color: C.mute, spacing: 2 });
    txt(ctx, "下半句，在机房里", 990, 1448, { size: 26, color: C.mute, align: "right", spacing: 2 });
  },
};
