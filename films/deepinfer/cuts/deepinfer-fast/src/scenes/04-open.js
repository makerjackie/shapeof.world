import { C, W, H, txt, rule, rect, outline, at, easeOutBack, clamp, stamp } from "../lib/engine.js";
import { backdrop, check } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "open",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.13)", gx: 0.7, gy: 0.3, gridStep: 90 });
    txt(ctx, "开源 / OPEN SOURCE", 108, 200, { size: 18, family: "mono", color: C.lime, spacing: 4 });
    txt(ctx, "把方法，交给所有人。", 108, 280, { size: 56, weight: 700, color: C.paper, spacing: 1, alpha: at(t, 0.02, 0.2) });

    const p = easeOutBack(at(t, 0.05, 0.4));
    ctx.save();
    ctx.globalAlpha = clamp(at(t, 0.05, 0.2));
    ctx.translate(544, 500 + (1 - p) * 120);
    ctx.rotate(-0.016);
    ctx.translate(-544, -500);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 14;
    rect(ctx, 108, 330, 872, 380, "#F3EEE3", 14);
    ctx.restore();
    txt(ctx, "github.com/deepseek-ai/DeepInfer", 140, 388, { size: 19, family: "mono", color: "#59645D" });
    txt(ctx, "PUBLIC", 946, 388, { size: 15, family: "mono", color: "#3F5B2E", align: "right", spacing: 3 });
    rule(ctx, 140, 406, 950, 406, "#CFC8B8", 1);
    txt(ctx, "DeepInfer", 136, 500, { size: 72, family: "mono", weight: 700, color: "#101817", spacing: -3 });
    txt(ctx, "高性能、大规模推理框架", 140, 550, { size: 26, weight: 500, color: "#3D4842" });
    rect(ctx, 140, 590, 210, 50, "#101817", 25);
    txt(ctx, "APACHE-2.0", 245, 623, { size: 18, family: "mono", weight: 700, color: C.lime, align: "center", spacing: 3 });
    txt(ctx, "可商用", 372, 623, { size: 20, weight: 600, color: "#2F3A34" });
    txt(ctx, "PART OF DEEPSEEK'S PRODUCTION STACK", 140, 680, { size: 12, family: "mono", color: "#788078", spacing: 2 });
    ctx.restore();

    const lp = at(t, 0.9, 0.25);
    if (lp > 0) {
      ctx.save();
      ctx.globalAlpha = lp;
      stamp(ctx, "APACHE 2.0", 870, 750, -0.08, C.lime, 1);
      ctx.restore();
    }

    const words = [
      { at: 1.0, cn: "看", en: "READ" },
      { at: 1.5, cn: "改", en: "MODIFY" },
      { at: 2.0, cn: "商用", en: "COMMERCIAL" },
    ];
    const w = words.filter((x) => t >= x.at).at(-1);
    if (w) {
      const q = at(t, w.at, 0.16);
      ctx.save();
      ctx.globalAlpha = q;
      txt(ctx, w.cn, 1280, 560, {
        size: w.cn.length > 1 ? 150 : 190, weight: 700, color: C.lime, spacing: 4,
      });
      txt(ctx, w.en, 1300, 640, { size: 20, family: "mono", color: C.mute, spacing: 4 });
      check(ctx, 1710, 470, 28, C.lime, 0.9);
      ctx.restore();
    }

    const bp = at(t, 2.8, 0.25);
    if (bp > 0) {
      ctx.save();
      ctx.globalAlpha = bp;
      rule(ctx, 108, 800, 1800, 800, C.line, 1);
      txt(ctx, "Apache-2.0：能看、能改、能商用。", 108, 870, { size: 44, weight: 600, color: C.paper, spacing: 1 });
      ctx.restore();
    }

    cutFlash(ctx, t, [1.0, 1.5, 2.0]);
  },
};
