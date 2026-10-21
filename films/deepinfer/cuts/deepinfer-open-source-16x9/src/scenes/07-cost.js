import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow } from "../lib/engine.js";
import { backdrop, label, gpu } from "../lib/parts.js";

export default {
  id: "cost",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(255,180,92,0.10)", gx: 0.2, gy: 0.3, gridStep: 90 });
    label(ctx, "为什么重要 / 01 成本", 120, 185, { size: 20, color: C.amber });
    txt(ctx, "同样的卡，同样的电，回答更多。", 120, 265, { size: 54, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    gpu(ctx, 120, 360, 210, 150, { heat: 0.42, label: "" });
    txt(ctx, "同一张卡", 120, 548, { size: 20, color: C.mute, spacing: 2 });
    for (let i = 0; i < 5; i++) {
      const h = 14 + i * 11;
      rect(ctx, 120 + i * 40, 700 - h, 22, h, i < 4 ? C.amber : C.red, 3);
    }
    txt(ctx, "同一度电", 120, 740, { size: 20, color: C.mute, spacing: 2 });
    glow(ctx, 225, 435, 160, "rgba(255,180,92,0.14)", 0.5);

    const bands = [
      { y: 360, title: "普通调度", sub: "一次只服务一小批", color: C.paperDim, dense: false, at: 0.1 },
      { y: 540, title: "DeepInfer", sub: "拼请求 · 先猜后验 · 不让卡闲着", color: C.lime, dense: true, at: 0.25 },
    ];
    bands.forEach((b) => {
      const p = at(t, b.at, 0.45);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      rect(ctx, 560, b.y, 1240, 140, "rgba(13,20,22,0.85)", 12);
      outline(ctx, 560, b.y, 1240, 140, b.dense ? C.lime : C.line, b.dense ? 1.5 : 1.1, 12);
      rect(ctx, 560, b.y, 5, 140, b.color, 2);
      txt(ctx, b.title, 590, b.y + 52, { size: b.dense ? 30 : 28, weight: 600, color: b.color, spacing: 0.5 });
      txt(ctx, b.sub, 590, b.y + 88, { size: 17, color: C.mute, spacing: 0.5 });
      const rows = b.dense ? 4 : 3;
      const n = b.dense ? 14 : 5;
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < n; i++) {
          const ph = (t * (b.dense ? 0.65 : 0.3) + i * (1 / n) + r * 0.09) % 1;
          const x = 980 + ph * 760;
          const y = b.y + 26 + r * 26;
          token(ctx, x, y, 9, b.color, (1 - ph) * (b.dense ? 0.95 : 0.6));
        }
      }
      ctx.restore();
    });
    txt(ctx, "相对量级，仅为示意", 1800, 712, { size: 13, family: "mono", color: C.dim, align: "right", spacing: 1 });

    const tp = at(t, 3.8, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rect(ctx, 120, 760, 1680, 128, "rgba(16,24,26,0.9)", 14);
      outline(ctx, 120, 760, 1680, 128, C.line, 1.2, 14);
      txt(ctx, "token = AI 说话的最小单位", 150, 812, { size: 28, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, "AI 每吐一个字，背后都在数 token。", 150, 852, { size: 19, color: C.mute, spacing: 0.5 });
      const word = ["你", "好", "，", "世", "界"];
      word.forEach((ch, i) => {
        rect(ctx, 620 + i * 52, 800, 42, 42, "rgba(201,245,109,0.12)", 6);
        outline(ctx, 620 + i * 52, 800, 42, 42, C.lime, 1.2, 6);
        txt(ctx, ch, 641 + i * 52, 831, { size: 23, weight: 600, color: C.paper, align: "center" });
      });
      txt(ctx, "它便宜了，AI 才会便宜。", 1770, 838, { size: 22, color: C.lime, align: "right", spacing: 0.5 });
      ctx.restore();
    }

    const pp = at(t, 7.0, 0.5);
    if (pp > 0) {
      ctx.save();
      ctx.globalAlpha = pp;
      rule(ctx, 120, 920, 1800, 920, C.line, 1);
      txt(ctx, "更", 122, 985, { size: 92, family: "serif", weight: 700, color: C.paper, spacing: -2 });
      txt(ctx, "便宜", 224, 985, { size: 92, family: "serif", weight: 700, color: C.lime, spacing: -2 });
      txt(ctx, "同样的算力，服务更多的人", 480, 972, { size: 26, color: C.mute, spacing: 0.5 });
      ctx.save();
      ctx.translate(1580, 950);
      ctx.rotate(0.12);
      rect(ctx, -82, -40, 164, 104, "#F3EEE3", 10);
      txt(ctx, "¥", -16, 30, { size: 48, family: "serif", weight: 700, color: "#1A2420", align: "center" });
      txt(ctx, "↓", 42, 24, { size: 38, weight: 700, color: "#3F6B2E", align: "center" });
      ctx.restore();
      ctx.restore();
    }
  },
};
