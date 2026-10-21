import { C, W, H, txt, rule, rect, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, bracketBox } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "hook",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.10)", gx: 0.8, gy: 0.25, gridStep: 90 });
    txt(ctx, "DEEPSEEK / 2026", 108, 190, { size: 18, family: "mono", color: C.lime, spacing: 4, alpha: 1 });
    txt(ctx, "DeepSeek", 108, 300, { size: 40, family: "mono", weight: 600, color: C.paperDim, spacing: 1, alpha: 1 });

    if (t < 1.6) {
      slam(ctx, "又开源了", 100, 610, { size: 202, family: "serif", weight: 700, color: C.paper, spacing: -5 }, 1);
    } else if (t < 3.5) {
      txt(ctx, "但这次", 108, 500, { size: 72, weight: 500, color: C.mute, spacing: 1, alpha: at(t, 1.6, 0.2) });
      slam(ctx, "不是模型", 100, 660, { size: 176, weight: 700, color: C.paper, spacing: -2 }, at(t, 1.62, 0.22));
      const pre = measure(ctx, "不是", 176, { weight: 700, spacing: -2 });
      const word = measure(ctx, "模型", 176, { weight: 700, spacing: -2 });
      const sp = at(t, 2.25, 0.25);
      if (sp > 0) rule(ctx, 100 + pre, 690, 100 + pre + word * sp, 690, C.red, 8);
    } else {
      slam(ctx, "是引擎", 100, 650, { size: 196, weight: 700, color: C.lime, spacing: -2 }, at(t, 3.52, 0.22));
      bracketBox(ctx, 92, 480, 740, 240, { color: C.lime, len: 28, width: 3, alpha: at(t, 3.6, 0.3) });
      txt(ctx, "不是一句口号", 112, 790, { size: 30, color: C.paperDim, spacing: 2, alpha: at(t, 4.2, 0.3) });
    }

    // commit wall, faster
    ctx.save();
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 8; c++) {
        const lit = (r * 8 + c * 5) % 11 < 2;
        const on = t > 0.05 + r * 0.025 + c * 0.015;
        ctx.globalAlpha = on ? (lit ? 0.6 : 0.28) : 0;
        ctx.fillStyle = lit ? C.lime : C.dim;
        ctx.beginPath();
        ctx.roundRect(1280 + c * 42, 240 + r * 42, 28, 28, 4);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.translate(1840, 520);
    ctx.rotate(-Math.PI / 2);
    txt(ctx, "EXP. 01  /  INFERENCE", 0, 0, { size: 16, family: "mono", color: C.mute, spacing: 4, alpha: 0.6 });
    ctx.restore();

    rule(ctx, 108, 930, 1800, 930, C.line, 1, 0.6);
    txt(ctx, "模型只是上半句", 108, 982, { size: 24, color: C.mute, spacing: 2 });
    txt(ctx, "下半句，在机房里", 1800, 982, { size: 24, color: C.mute, align: "right", spacing: 2 });

    cutFlash(ctx, t, [1.6, 3.5]);
  },
};
