import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, label } from "../lib/parts.js";

export default {
  id: "close",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.10)", gx: 0.5, gy: 0.62, gridStep: 0 });
    // horizon
    const hp = at(t, 0.3, 0.8);
    rule(ctx, 90, 1330, 90 + 900 * hp, 1330, C.line, 1, 0.7);

    label(ctx, "最后，记住这一句", 90, 210, { size: 20, color: C.lime });

    const a1 = at(t, 0.1, 0.45);
    const a2 = at(t, 0.62, 0.45);
    const collapse = at(t, 3.85, 0.35);

    // top word
    ctx.save();
    ctx.globalAlpha = a1 * (1 - collapse);
    txt(ctx, "模型", 90, 330, { size: 24, color: C.mute, spacing: 3 });
    txt(ctx, "聪明", 80, 610, {
      size: 214, family: "serif", weight: 700, color: C.paper, spacing: -6,
    });
    txt(ctx, "决定 AI 的上限", 96, 690, { size: 30, color: C.paperDim, spacing: 1 });
    ctx.restore();

    // bottom word
    ctx.save();
    ctx.globalAlpha = a2 * (1 - collapse);
    txt(ctx, "推理框架", 90, 820, { size: 24, color: C.lime, spacing: 3 });
    txt(ctx, "用得起", 80, 1100, {
      size: 214, family: "serif", weight: 700, color: C.lime, spacing: -6,
    });
    txt(ctx, "决定有多少人能用上", 96, 1180, { size: 30, color: C.paperDim, spacing: 1 });
    ctx.restore();

    // final statement
    const fp = at(t, 4.15, 0.45);
    if (fp > 0) {
      ctx.save();
      ctx.globalAlpha = fp;
      txt(ctx, "让智能", 90, 860, { size: 76, family: "serif", weight: 700, color: C.paper, spacing: -1 });
      txt(ctx, "用得起。", 90, 962, { size: 76, family: "serif", weight: 700, color: C.lime, spacing: -1 });
      rule(ctx, 90, 1010, 90 + 250 * fp, 1010, C.lime, 4);
      txt(ctx, "DeepSeek 这次开源的，是后半句。", 94, 1094, { size: 32, color: C.paperDim, spacing: 0.5 });
      ctx.restore();
    }

    // signature block
    const sp = at(t, 5.4, 0.5);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      rule(ctx, 90, 1320, 990, 1320, C.line, 1);
      txt(ctx, "github.com/deepseek-ai/DeepInfer", 90, 1372, {
        size: 22, family: "mono", color: C.paperDim, spacing: 0.5,
      });
      txt(ctx, "Apache-2.0", 990, 1372, { size: 18, family: "mono", color: C.lime, align: "right", spacing: 2 });
      txt(ctx, "世界的形状  /  SHAPE OF THE WORLD", 90, 1418, {
        size: 18, family: "mono", color: C.mute, spacing: 3,
      });
      txt(ctx, "看见世界如何运行", 990, 1418, { size: 20, color: C.mute, align: "right", spacing: 2 });
      ctx.restore();
    }

    // small vertical measure
    ctx.save();
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < 16; i++) {
      rule(ctx, 1010, 260 + i * 38, 1018 + (i % 4 === 0 ? 12 : 0), 260 + i * 38, C.dim, 1);
    }
    ctx.restore();
  },
};
