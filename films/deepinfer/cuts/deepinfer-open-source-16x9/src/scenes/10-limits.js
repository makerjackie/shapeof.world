import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp } from "../lib/engine.js";
import { backdrop, label, check, cross } from "../lib/parts.js";

const HAVE = [
  { text: "推理引擎 DeepInfer", note: "框架代码，Apache-2.0", at: 1.2 },
  { text: "编解码 deepseek-recipe", note: "请求与输出对齐官方", at: 2.1 },
];
const NEED = [
  { text: "模型文件", note: "权重和框架是两回事", at: 3.8 },
  { text: "KV 缓存系统", note: "长对话怎么存，要自己搭", at: 4.9 },
  { text: "PD 分离 / 负载均衡", note: "大规模服务还要这些", at: 6.0 },
];

export default {
  id: "limits",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(255,93,71,0.08)", gx: 0.5, gy: 0.3, gridStep: 90 });
    label(ctx, "但别误会 / THE BOUNDARY", 120, 185, { size: 20, color: C.amber });

    const cp = at(t, 0.02, 0.35);
    ctx.save();
    ctx.globalAlpha = clamp(at(t, 0.02, 0.25));
    ctx.translate(960, 520 + (1 - easeOut(cp)) * 30);
    ctx.rotate(-0.005);
    ctx.translate(-960, -520);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 32;
    ctx.shadowOffsetY = 14;
    rect(ctx, 110, 240, 1700, 560, "#F1ECDF", 14);
    ctx.restore();

    txt(ctx, "开源的边界", 150, 310, { size: 40, weight: 700, color: "#121A17", spacing: 0.5 });
    txt(ctx, "据 DeepInfer README：这是离线推理版本，完整服务还需自备。", 1770, 306, {
      size: 17, color: "#6E7870", align: "right", spacing: 0.3,
    });

    txt(ctx, "这次给你", 150, 382, { size: 18, family: "mono", color: "#3F6B2E", spacing: 3 });
    txt(ctx, "还得自己配", 1000, 382, { size: 18, family: "mono", color: "#B3402E", spacing: 3 });

    HAVE.forEach((row, i) => {
      const y = 450 + i * 110;
      ctx.save();
      ctx.globalAlpha = 0.13;
      rule(ctx, 150, y - 34, 900, y - 34, "#D8D1C1", 1);
      txt(ctx, row.text, 204, y + 12, { size: 32, weight: 600, color: "#1A2420", spacing: 0.5 });
      txt(ctx, row.note, 204, y + 44, { size: 17, color: "#707A72", spacing: 0.5 });
      ctx.restore();
    });
    NEED.forEach((row, i) => {
      const y = 450 + i * 110;
      ctx.save();
      ctx.globalAlpha = 0.13;
      rule(ctx, 1000, y - 34, 1770, y - 34, "#D8D1C1", 1);
      txt(ctx, row.text, 1054, y + 12, { size: 32, weight: 600, color: "#1A2420", spacing: 0.5 });
      txt(ctx, row.note, 1054, y + 44, { size: 17, color: "#707A72", spacing: 0.5 });
      ctx.restore();
    });

    HAVE.forEach((row, i) => {
      const p = at(t, row.at, 0.35);
      if (p <= 0) return;
      const y = 450 + i * 110;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate((1 - p) * 16, 0);
      rule(ctx, 150, y - 34, 900, y - 34, "#D8D1C1", 1);
      check(ctx, 168, y, 22, "#3F6B2E");
      txt(ctx, row.text, 204, y + 12, { size: 32, weight: 600, color: "#1A2420", spacing: 0.5 });
      txt(ctx, row.note, 204, y + 44, { size: 17, color: "#707A72", spacing: 0.5 });
      ctx.restore();
    });

    NEED.forEach((row, i) => {
      const p = at(t, row.at, 0.35);
      if (p <= 0) return;
      const y = 450 + i * 110;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate((1 - p) * 16, 0);
      rule(ctx, 1000, y - 34, 1770, y - 34, "#D8D1C1", 1);
      cross(ctx, 1018, y, 22, "#B3402E");
      txt(ctx, row.text, 1054, y + 12, { size: 32, weight: 600, color: "#1A2420", spacing: 0.5 });
      txt(ctx, row.note, 1054, y + 44, { size: 17, color: "#707A72", spacing: 0.5 });
      ctx.restore();
    });

    ctx.restore();

    const fp = at(t, 7.4, 0.5);
    if (fp > 0) {
      ctx.save();
      ctx.globalAlpha = fp;
      rule(ctx, 120, 880, 1800, 880, C.line, 1);
      txt(ctx, "开源", 122, 990, { size: 92, family: "serif", weight: 700, color: C.paper, spacing: -2 });
      txt(ctx, "≠", 320, 988, { size: 88, weight: 700, color: C.red, spacing: 0 });
      txt(ctx, "免费", 450, 990, { size: 92, family: "serif", weight: 700, color: C.amber, spacing: -2 });
      txt(ctx, "代码可以免费，算力不行。", 700, 982, { size: 28, color: C.paperDim, spacing: 0.5 });

      rect(ctx, 1620, 936, 160, 48, "rgba(255,93,71,0.08)", 8);
      outline(ctx, 1620, 936, 160, 48, C.red, 1.4, 8);
      txt(ctx, "GPU", 1700, 969, { size: 24, family: "mono", weight: 700, color: C.red, align: "center", spacing: 2 });
      txt(ctx, "显卡还是要钱", 1800, 900, { size: 24, color: C.mute, align: "right", spacing: 1 });
      ctx.restore();
    }
  },
};
