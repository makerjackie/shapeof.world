import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow, measure } from "../lib/engine.js";
import { backdrop, label, gpu, tokenStream } from "../lib/parts.js";

export default {
  id: "cost",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(255,180,92,0.10)", gx: 0.2, gy: 0.3, gridStep: 90 });
    label(ctx, "为什么重要 / 01 成本", 90, 205, { size: 20, color: C.amber });
    txt(ctx, "同样的卡，同样的电，回答更多。", 90, 285, {
      size: 44, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35),
    });

    // same input
    gpu(ctx, 110, 360, 160, 112, { heat: 0.4, label: "" });
    txt(ctx, "同一张卡", 110, 512, { size: 20, color: C.mute, spacing: 2 });
    for (let i = 0; i < 5; i++) {
      const h = 12 + i * 10;
      rect(ctx, 332 + i * 28, 456 - h, 16, h, i < 4 ? C.amber : C.red, 3);
    }
    txt(ctx, "同一度电", 332, 512, { size: 20, color: C.mute, spacing: 2 });
    txt(ctx, "＝", 560, 452, { size: 58, weight: 600, color: C.dim, align: "center" });
    txt(ctx, "同样的输入", 620, 438, { size: 30, weight: 600, color: C.paperDim, spacing: 0.5 });
    txt(ctx, "看谁吐出的 token 更多", 620, 478, { size: 20, color: C.mute, spacing: 0.5 });
    glow(ctx, 190, 416, 130, "rgba(255,180,92,0.14)", 0.5);

    // two service bands
    const bands = [
      { y: 586, title: "普通调度", sub: "一次只服务一小批", color: C.paperDim, dense: false, at: 0.55 },
      { y: 762, title: "DeepInfer", sub: "拼请求 · 先猜后验 · 不让卡闲着", color: C.lime, dense: true, at: 0.75 },
    ];
    bands.forEach((b, bi) => {
      const p = at(t, b.at, 0.5);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      rect(ctx, 90, b.y, 900, 146, "rgba(13,20,22,0.82)", 12);
      outline(ctx, 90, b.y, 900, 146, b.dense ? C.lime : C.line, b.dense ? 1.6 : 1.1, 12);
      rect(ctx, 90, b.y, 5, 146, b.color, 2);
      txt(ctx, b.title, 118, b.y + 54, { size: b.dense ? 30 : 28, weight: 600, color: b.color, spacing: 0.5 });
      txt(ctx, b.sub, 118, b.y + 92, { size: 17, color: C.mute, spacing: 0.5 });
      txt(ctx, "回答", 118, b.y + 126, { size: 13, family: "mono", color: C.dim, spacing: 2 });

      const rows = b.dense ? 4 : 3;
      const n = b.dense ? 14 : 5;
      for (let r = 0; r < rows; r++) {
        for (let i = 0; i < n; i++) {
          const ph = (t * (b.dense ? 0.65 : 0.3) + i * (1 / n) + r * 0.09) % 1;
          const x = 390 + ph * 560;
          const y = b.y + 28 + r * 28;
          if (x > 950) continue;
          token(ctx, x, y, 9, b.color, (1 - ph) * (b.dense ? 0.95 : 0.6));
        }
      }
      // relative output bar
      const barW = b.dense ? 86 : 30;
      rect(ctx, 890 - barW, b.y + 118, barW, 4, b.color, 2);
      ctx.restore();
    });
    txt(ctx, "相对量级，仅为示意", 990, 930, { size: 13, family: "mono", color: C.dim, align: "right", spacing: 1 });

    // token explainer
    const tp = at(t, 3.5, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rect(ctx, 90, 960, 900, 196, "rgba(16,24,26,0.9)", 16);
      outline(ctx, 90, 960, 900, 196, C.line, 1.2, 16);
      txt(ctx, "token = AI 说话的最小单位", 122, 1016, { size: 29, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, "AI 每吐一个字，背后都在数 token。", 122, 1058, { size: 19, color: C.mute, spacing: 0.5 });
      const word = ["你", "好", "，", "世", "界"];
      word.forEach((ch, i) => {
        const on = t > 3.9 + i * 0.12;
        ctx.save();
        ctx.globalAlpha = on ? tp : 0;
        rect(ctx, 122 + i * 52, 1090, 42, 42, "rgba(201,245,109,0.12)", 6);
        outline(ctx, 122 + i * 52, 1090, 42, 42, C.lime, 1.2, 6);
        txt(ctx, ch, 143 + i * 52, 1121, { size: 23, weight: 600, color: C.paper, align: "center" });
        ctx.restore();
      });
      txt(ctx, "（切分仅为示意）", 408, 1121, { size: 13, color: C.dim, spacing: 0.5 });
      txt(ctx, "它便宜了，AI 才会便宜。", 956, 1121, { size: 21, color: C.lime, align: "right", spacing: 0.5 });
      ctx.restore();
    }

    // price
    const pp = at(t, 5.3, 0.5);
    if (pp > 0) {
      ctx.save();
      ctx.globalAlpha = pp;
      rule(ctx, 90, 1200, 990, 1200, C.line, 1);
      txt(ctx, "更", 92, 1350, { size: 126, family: "serif", weight: 700, color: C.paper, spacing: -2 });
      txt(ctx, "便宜", 214, 1350, { size: 126, family: "serif", weight: 700, color: C.lime, spacing: -2 });
      txt(ctx, "同样的算力，能服务更多的人", 96, 1412, { size: 26, color: C.mute, spacing: 0.5 });

      const drop = easeOut(at(t, 5.7, 0.55));
      const ty = 1180 + drop * 70;
      ctx.save();
      ctx.translate(812, ty);
      ctx.rotate(0.13);
      ctx.strokeStyle = C.paperDim;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-10, -40); ctx.bezierCurveTo(-40, -90, 60, -100, 30, -58); ctx.stroke();
      rect(ctx, -92, -44, 184, 118, "#F3EEE3", 10);
      ctx.beginPath(); ctx.arc(-54, -44, 8, 0, Math.PI * 2); ctx.fillStyle = C.bg; ctx.fill();
      txt(ctx, "¥", -20, 34, { size: 54, family: "serif", weight: 700, color: "#1A2420", align: "center" });
      txt(ctx, "↓", 42, 26, { size: 42, weight: 700, color: "#3F6B2E", align: "center" });
      txt(ctx, "TOKEN", -46, 62, { size: 12, family: "mono", color: "#68736B", spacing: 2 });
      ctx.restore();
      ctx.restore();
    }
  },
};
