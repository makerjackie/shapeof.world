import { C, W, H, txt, rule, at, clamp, easeOut } from "../lib/engine.js";
import { backdrop } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "close",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.10)", gx: 0.5, gy: 0.55, gridStep: 90 });

    const split = t < 1.8 ? 1 : 0;
    if (split > 0) {
      ctx.save();
      ctx.globalAlpha = split;
      txt(ctx, "模型", 120, 300, { size: 22, color: C.mute, spacing: 3 });
      txt(ctx, "聪明", 108, 560, { size: 180, family: "serif", weight: 700, color: C.paper, spacing: -5 });
      txt(ctx, "推理框架", 1010, 300, { size: 22, color: C.lime, spacing: 3 });
      txt(ctx, "用得起", 990, 560, { size: 180, family: "serif", weight: 700, color: C.lime, spacing: -5 });
      ctx.restore();
    }

    if (t > 1.8) {
      const p = at(t, 1.82, 0.22);
      ctx.save();
      ctx.globalAlpha = p;
      txt(ctx, "让智能，用得起。", 960, 600, {
        size: 128, family: "serif", weight: 700, color: C.paper, align: "center", spacing: -2,
      });
      rule(ctx, 960 - 180 * easeOut(p), 650, 960 + 180 * easeOut(p), 650, C.lime, 6);
      txt(ctx, "DeepSeek 这次开源的，是后半句。", 960, 740, {
        size: 32, color: C.paperDim, align: "center", spacing: 1, alpha: at(t, 2.1, 0.2),
      });
      ctx.restore();
    }

    cutFlash(ctx, t, [1.8]);
  },
};
