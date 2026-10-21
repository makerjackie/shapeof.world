import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, glow } from "../lib/engine.js";
import { backdrop, label, check, cross } from "../lib/parts.js";

const ROWS = [
  { ok: true, text: "推理引擎 DeepInfer", note: "框架代码，开源", at: 1.0 },
  { ok: true, text: "编解码组件 deepseek-recipe", note: "MIT 许可", at: 1.7 },
  { ok: false, text: "模型文件", note: "权重和框架是两回事", at: 3.4 },
  { ok: false, text: "KV 缓存系统", note: "长对话怎么存，要自己搭", at: 4.5 },
  { ok: false, text: "PD 分离 / 负载均衡", note: "大规模服务还要这些", at: 5.5 },
];

export default {
  id: "limits",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(255,93,71,0.08)", gx: 0.5, gy: 0.3, gridStep: 90 });
    label(ctx, "但别误会 / THE BOUNDARY", 90, 205, { size: 20, color: C.amber });

    const cp = easeOut(at(t, 0.35, 0.55));
    ctx.save();
    ctx.globalAlpha = clamp(at(t, 0.35, 0.4));
    ctx.translate(540, 250 + (1 - cp) * 40);
    ctx.rotate(-0.006);
    ctx.translate(-540, -250);

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 36;
    ctx.shadowOffsetY = 16;
    rect(ctx, 70, 250, 940, 710, "#F1ECDF", 14);
    ctx.restore();

    txt(ctx, "开源的边界", 112, 325, { size: 42, weight: 700, color: "#121A17", spacing: 0.5 });
    txt(ctx, "WHAT YOU STILL NEED", 960, 323, { size: 14, family: "mono", color: "#7B847C", align: "right", spacing: 2 });

    // Ghost the sheet so it reads as a checklist from the first frame.
    ROWS.forEach((row, i) => {
      const y = 410 + i * 96;
      ctx.save();
      ctx.globalAlpha = 0.12;
      rule(ctx, 108, y - 46, 972, y - 46, "#D8D1C1", 1);
      txt(ctx, row.text, 164, y + 14, { size: 34, weight: 600, color: "#1A2420", spacing: 0.5 });
      txt(ctx, row.note, 708, y + 12, { size: 19, color: "#707A72", spacing: 0.5 });
      ctx.restore();
    });

    ROWS.forEach((row, i) => {
      const p = at(t, row.at, 0.35);
      if (p <= 0) return;
      const y = 410 + i * 96;
      ctx.save();
      ctx.globalAlpha = p;
      ctx.translate((1 - p) * 20, 0);
      rule(ctx, 108, y - 46, 972, y - 46, "#D8D1C1", 1);
      if (row.ok) check(ctx, 126, y, 24, "#3F6B2E");
      else cross(ctx, 126, y, 24, "#B3402E");
      txt(ctx, row.text, 164, y + 14, { size: 34, weight: 600, color: "#1A2420", spacing: 0.5 });
      txt(ctx, row.note, 708, y + 12, { size: 19, color: "#707A72", spacing: 0.5 });
      ctx.restore();
    });

    txt(ctx, "据 DeepInfer README：这次是离线推理版本，完整服务还缺 KV 缓存、PD 分离和跨副本负载均衡。", 112, 924, {
      size: 17, color: "#6E7870", spacing: 0.3, alpha: at(t, 6.2, 0.4),
    });

    ctx.restore();

    // free != open
    const fp = at(t, 7.2, 0.5);
    if (fp > 0) {
      ctx.save();
      ctx.globalAlpha = fp;
      rule(ctx, 90, 1040, 990, 1040, C.line, 1);
      txt(ctx, "开源", 92, 1176, { size: 108, family: "serif", weight: 700, color: C.paper, spacing: -2 });
      txt(ctx, "≠", 330, 1172, { size: 104, weight: 700, color: C.red, spacing: 0 });
      txt(ctx, "免费", 474, 1176, { size: 108, family: "serif", weight: 700, color: C.amber, spacing: -2 });
      txt(ctx, "代码可以免费，算力不行。", 96, 1240, { size: 30, color: C.paperDim, spacing: 0.5 });

      // gpu + price
      ctx.save();
      ctx.translate(820, 1180);
      ctx.strokeStyle = C.paperDim;
      ctx.lineWidth = 2;
      ctx.strokeRect(-90, -54, 150, 108);
      ctx.fillStyle = "rgba(255,93,71,0.16)";
      ctx.fillRect(-74, -38, 118, 76);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(-90 + i * 40, -54); ctx.lineTo(-90 + i * 40, -66); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-90 + i * 40, 54); ctx.lineTo(-90 + i * 40, 66); ctx.stroke();
      }
      txt(ctx, "GPU", 60, 6, { size: 30, family: "mono", weight: 700, color: C.red, align: "right" });
      ctx.restore();
      txt(ctx, "显卡还是要钱", 960, 1300, { size: 26, color: C.mute, align: "right", spacing: 1 });
      ctx.restore();
    }
    const tp = at(t, 8.4, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rule(ctx, 90, 1370, 990, 1370, C.line, 1);
      txt(ctx, "能免费拿到的是代码，不是算力。", 90, 1428, { size: 25, color: C.paperDim, spacing: 0.5 });
      ctx.restore();
    }
  },
};
