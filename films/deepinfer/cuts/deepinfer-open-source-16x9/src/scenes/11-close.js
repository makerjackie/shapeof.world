import { C, W, H, txt, rule, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, label } from "../lib/parts.js";

export default {
  id: "close",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.09)", gx: 0.5, gy: 0.55, gridStep: 90 });
    label(ctx, "最后，记住这一句", 120, 185, { size: 20, color: C.lime });

    const a1 = at(t, 0.0, 0.4);
    const a2 = at(t, 0.08, 0.4);
    const collapse = at(t, 4.0, 0.4);

    ctx.save();
    ctx.globalAlpha = a1 * (1 - collapse);
    txt(ctx, "模型", 120, 320, { size: 24, color: C.mute, spacing: 3 });
    txt(ctx, "聪明", 110, 600, { size: 196, family: "serif", weight: 700, color: C.paper, spacing: -6 });
    txt(ctx, "决定 AI 的上限", 130, 672, { size: 30, color: C.paperDim, spacing: 1 });
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = a2 * (1 - collapse);
    txt(ctx, "推理框架", 1000, 320, { size: 24, color: C.lime, spacing: 3 });
    txt(ctx, "用得起", 980, 600, { size: 196, family: "serif", weight: 700, color: C.lime, spacing: -6 });
    txt(ctx, "决定有多少人能用上", 1000, 672, { size: 30, color: C.paperDim, spacing: 1 });
    ctx.restore();

    const fp = at(t, 4.3, 0.5);
    if (fp > 0) {
      ctx.save();
      ctx.globalAlpha = fp;
      txt(ctx, "让智能，用得起。", 960, 560, {
        size: 104, family: "serif", weight: 700, color: C.paper, align: "center", spacing: -1,
      });
      rule(ctx, 960 - 160 * fp, 606, 960 + 160 * fp, 606, C.lime, 5);
      txt(ctx, "DeepSeek 这次开源的，是后半句。", 960, 690, {
        size: 32, color: C.paperDim, align: "center", spacing: 0.5,
      });
      ctx.restore();
    }
  },
};
