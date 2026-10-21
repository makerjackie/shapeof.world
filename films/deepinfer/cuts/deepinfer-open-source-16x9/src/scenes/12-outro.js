import { C, W, H, txt, rule, at, easeOut, clamp, glow } from "../lib/engine.js";
import { backdrop } from "../lib/parts.js";
import { mark } from "../lib/assets.js";

export default {
  id: "outro",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.10)", gx: 0.32, gy: 0.5, gridStep: 0 });

    const lp = at(t, 0.15, 0.6);
    if (lp > 0 && mark.complete) {
      ctx.save();
      ctx.globalAlpha = lp;
      const size = 230;
      const s = 0.94 + easeOut(lp) * 0.06;
      glow(ctx, 560, 520, 210, "rgba(201,245,109,0.14)", 0.5 * lp);
      ctx.drawImage(mark, 560 - (size * s) / 2, 520 - (size * s) / 2, size * s, size * s);
      ctx.restore();
    }

    const tp = at(t, 0.7, 0.55);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      txt(ctx, "世界的形状", 830, 500, { size: 96, family: "serif", weight: 700, color: C.paper, spacing: 2 });
      txt(ctx, "SHAPE OF THE WORLD", 838, 552, { size: 18, family: "mono", color: C.mute, spacing: 6 });
      rule(ctx, 838, 592, 1430, 592, C.line, 1, tp);
      txt(ctx, "看见世界如何运行", 838, 660, { size: 32, weight: 500, color: C.paper, spacing: 2 });
      txt(ctx, "SEE HOW THE WORLD WORKS", 838, 700, { size: 14, family: "mono", color: C.mute, spacing: 4 });
      txt(ctx, "制作 MakerJackie  /  by MakerJackie", 838, 760, { size: 20, color: C.mute, spacing: 1 });
      ctx.restore();
    }

    const sp = at(t, 1.6, 0.45);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      rule(ctx, 120, 920, 1800, 920, C.line, 1);
      txt(ctx, "github.com/deepseek-ai/DeepInfer", 120, 976, { size: 19, family: "mono", color: C.paperDim, spacing: 0.5 });
      txt(ctx, "Apache-2.0", 1800, 976, { size: 16, family: "mono", color: C.lime, align: "right", spacing: 2 });
      txt(ctx, "EP. 01  /  OPEN SOURCE", 120, 1018, { size: 15, family: "mono", color: C.mute, spacing: 3 });
      ctx.restore();
    }
  },
};
