import { C, W, H, txt, rule, at, easeOut, clamp, glow } from "../lib/engine.js";
import { backdrop } from "../lib/parts.js";
import { mark } from "../lib/assets.js";

export default {
  id: "outro",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.11)", gx: 0.5, gy: 0.38, gridStep: 0 });
    rule(ctx, 90, 300, 90 + 900 * at(t, 0.1, 0.6), 300, C.lime, 2, 0.55);

    // The episode title hands over to the brand.
    const ep = at(t, 0.05, 0.25) * (1 - at(t, 0.7, 0.35));
    if (ep > 0) {
      ctx.save();
      ctx.globalAlpha = ep;
      txt(ctx, "EP. 01", W / 2, 700, { size: 18, family: "mono", color: C.lime, align: "center", spacing: 5 });
      txt(ctx, "DeepInfer 开源了什么", W / 2, 768, {
        size: 46, weight: 600, color: C.paper, align: "center", spacing: 1,
      });
      ctx.restore();
    }

    // Brand name
    const bp = at(t, 0.85, 0.55);
    if (bp > 0) {
      ctx.save();
      ctx.globalAlpha = bp;
      ctx.translate(0, (1 - easeOut(bp)) * 26);
      txt(ctx, "世界的形状", W / 2, 906, {
        size: 108, family: "serif", weight: 700, color: C.paper, align: "center", spacing: 2,
      });
      txt(ctx, "SHAPE OF THE WORLD", W / 2, 966, {
        size: 18, family: "mono", color: C.mute, align: "center", spacing: 6,
      });
      rule(ctx, W / 2 - 230, 1004, W / 2 + 230, 1004, C.line, 1, bp);
      ctx.restore();
    }

    // Mark
    const lp = at(t, 1.45, 0.55);
    if (lp > 0 && mark.complete) {
      ctx.save();
      ctx.globalAlpha = lp;
      const size = 214;
      const s = 0.92 + easeOut(lp) * 0.08;
      glow(ctx, W / 2, 592, 180, "rgba(201,245,109,0.15)", 0.5 * lp);
      ctx.drawImage(mark, W / 2 - (size * s) / 2, 592 - (size * s) / 2, size * s, size * s);
      ctx.restore();
    }

    // Tagline + credit
    const tp = at(t, 2.15, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      txt(ctx, "看见世界如何运行", W / 2, 1086, {
        size: 34, weight: 500, color: C.paper, align: "center", spacing: 2,
      });
      txt(ctx, "SEE HOW THE WORLD WORKS", W / 2, 1130, {
        size: 15, family: "mono", color: C.mute, align: "center", spacing: 4,
      });
      rule(ctx, W / 2 - 120, 1170, W / 2 + 120, 1170, C.line, 1, tp);
      txt(ctx, "制作 MakerJackie  /  by MakerJackie", W / 2, 1230, {
        size: 20, color: C.mute, align: "center", spacing: 1,
      });
      ctx.restore();
    }

    // Source, quietly.
    const sp = at(t, 2.65, 0.45);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      rule(ctx, 90, 1390, 990, 1390, C.line, 1);
      txt(ctx, "github.com/deepseek-ai/DeepInfer", 90, 1442, {
        size: 19, family: "mono", color: C.paperDim, spacing: 0.5,
      });
      txt(ctx, "Apache-2.0", 990, 1442, { size: 16, family: "mono", color: C.lime, align: "right", spacing: 2 });
      ctx.restore();
    }

    // A hairline that closes the film.
    rule(ctx, 90, 1550, 90 + 900 * at(t, 2.85, 0.5), 1550, C.line, 1, 0.55);
  },
};
