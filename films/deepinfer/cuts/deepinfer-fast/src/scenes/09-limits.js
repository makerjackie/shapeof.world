import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp } from "../lib/engine.js";
import { backdrop, check, cross } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

const LEFT = [
  { text: "推理引擎", note: "DeepInfer", at: 0.7 },
  { text: "编解码", note: "deepseek-recipe", at: 1.1 },
];
const RIGHT = [
  { text: "模型文件", note: "另外拿", at: 0.9 },
  { text: "缓存 / 负载均衡", note: "自己配", at: 1.3 },
];

export default {
  id: "limits",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(255,93,71,0.08)", gx: 0.5, gy: 0.3, gridStep: 90 });

    const paperA = at(t, 0.02, 0.2) * (1 - at(t, 2.5, 0.2));
    if (paperA > 0) {
      ctx.save();
      ctx.globalAlpha = paperA;
      txt(ctx, "但别误会。", 108, 210, { size: 40, family: "serif", weight: 700, color: C.paper, spacing: 1 });
      rect(ctx, 108, 280, 1700, 470, "#F1ECDF", 12);
      txt(ctx, "这次给你", 140, 340, { size: 17, family: "mono", color: "#3F6B2E", spacing: 3 });
      txt(ctx, "还得自己配", 980, 340, { size: 17, family: "mono", color: "#B3402E", spacing: 3 });

      LEFT.forEach((row, i) => {
        const p = at(t, row.at, 0.2);
        if (p <= 0) return;
        const y = 430 + i * 120;
        check(ctx, 156, y, 22, "#3F6B2E", p);
        txt(ctx, row.text, 194, y + 12, { size: 38, weight: 600, color: "#1A2420", spacing: 1, alpha: p });
        txt(ctx, row.note, 194, y + 50, { size: 20, color: "#707A72", spacing: 1, alpha: p });
      });
      RIGHT.forEach((row, i) => {
        const p = at(t, row.at, 0.2);
        if (p <= 0) return;
        const y = 430 + i * 120;
        cross(ctx, 1006, y, 22, "#B3402E", p);
        txt(ctx, row.text, 1044, y + 12, { size: 38, weight: 600, color: "#1A2420", spacing: 1, alpha: p });
        txt(ctx, row.note, 1044, y + 50, { size: 20, color: "#707A72", spacing: 1, alpha: p });
      });
      txt(ctx, "据 DeepInfer README：完整服务还需自备。", 140, 710, { size: 16, color: "#6E7870", spacing: 0.5, alpha: at(t, 1.5, 0.2) });
      ctx.restore();
    }

    if (t > 2.5) {
      slam(ctx, "开源的是一套引擎", 104, 420, { size: 84, weight: 700, color: C.paper, spacing: 1 }, at(t, 2.52, 0.2));
      txt(ctx, "不是装好就能用的 AI。", 108, 510, { size: 44, color: C.paperDim, spacing: 1, alpha: at(t, 2.7, 0.2) });
    }

    if (t > 3.5) {
      slam(ctx, "开源", 104, 760, { size: 150, family: "serif", weight: 700, color: C.paper, spacing: -3 }, at(t, 3.52, 0.2));
      slam(ctx, "≠", 404, 756, { size: 140, weight: 700, color: C.red }, at(t, 3.55, 0.2));
      slam(ctx, "免费", 540, 760, { size: 150, family: "serif", weight: 700, color: C.amber, spacing: -3 }, at(t, 3.58, 0.2));
    }
    if (t > 5.1) {
      txt(ctx, "显卡还是要钱。", 108, 930, { size: 46, weight: 600, color: C.mute, spacing: 1, alpha: at(t, 5.12, 0.2) });
    }

    cutFlash(ctx, t, [2.5, 3.5]);
  },
};
