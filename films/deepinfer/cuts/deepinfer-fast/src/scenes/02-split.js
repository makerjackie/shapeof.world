import { C, W, H, txt, rule, rect, outline, at, clamp, token, glow } from "../lib/engine.js";
import { backdrop, card, gpu, flow, wire } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "split",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.08)", gx: 0.5, gy: 0.3, gridStep: 90 });
    txt(ctx, "模型  ×  推理框架", 108, 230, { size: 44, weight: 600, color: C.paper, spacing: 1, alpha: at(t, 0.02, 0.2) });

    // left card
    ctx.save();
    ctx.globalAlpha = at(t, 0.05, 0.2);
    card(ctx, 108, 300, 760, 430, { fill: "rgba(16,24,26,0.8)", border: C.line, r: 16, alpha: 1 });
    txt(ctx, "模型", 140, 380, { size: 64, weight: 700, color: C.paper, spacing: 1 });
    txt(ctx, "大脑", 140, 450, { size: 34, color: C.mute, spacing: 3 });
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.3;
      const r = 70 + (i * 29) % 42;
      const x = 520 + Math.cos(a) * r * 1.3;
      const y = 500 + Math.sin(a) * r * 0.72;
      ctx.save();
      ctx.globalAlpha *= 0.3;
      ctx.strokeStyle = C.limeDim;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(520, 500); ctx.lineTo(x, y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.lime;
      ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    glow(ctx, 520, 500, 160, "rgba(201,245,109,0.2)", 0.6);
    txt(ctx, "会思考", 520, 670, { size: 26, color: C.mute, align: "center", spacing: 3 });
    ctx.restore();

    // right card
    ctx.save();
    ctx.globalAlpha = at(t, 0.15, 0.2);
    card(ctx, 1040, 300, 760, 430, { fill: "rgba(12,19,21,0.9)", border: C.line, r: 16, alpha: 1 });
    txt(ctx, "推理框架", 1072, 380, { size: 58, weight: 700, color: C.lime, spacing: 1 });
    txt(ctx, "调度系统", 1072, 448, { size: 30, color: C.mute, spacing: 3 });
    const blocks = [
      { x: 1080, label: "请求" },
      { x: 1300, label: "调度" },
      { x: 1540, label: "GPU" },
    ];
    blocks.forEach((b, i) => {
      const w = i === 2 ? 210 : 180;
      rect(ctx, b.x, 520, w, 120, i === 1 ? "rgba(201,245,109,0.1)" : "rgba(255,255,255,0.04)", 8);
      outline(ctx, b.x, 520, w, 120, i === 1 ? C.lime : C.line, 1.2, 8);
      txt(ctx, b.label, b.x + w / 2, 596, { size: 26, weight: 600, color: i === 1 ? C.lime : C.paper, align: "center", spacing: 2 });
      if (i < 2) {
        const x1 = b.x + w, x2 = blocks[i + 1].x;
        wire(ctx, [[x1, 580], [x2, 580]], { color: C.line, width: 1.5, alpha: 0.8 });
        flow(ctx, [[x1, 580], [x2, 580]], t, { count: 3, speed: 1.2, size: 4, color: C.lime, alpha: 0.9 });
      }
    });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) gpu(ctx, 1552 + j * 46, 540 + i * 40, 34, 34, { heat: 0.3, alpha: 0.9 });
    txt(ctx, "接得住", 1660, 688, { size: 22, color: C.mute, align: "center", spacing: 2 });
    ctx.restore();

    // bottom beats
    const a1 = at(t, 1.2, 0.2) * (1 - at(t, 2.9, 0.15));
    if (a1 > 0) {
      ctx.save(); ctx.globalAlpha = a1;
      txt(ctx, "一个人用，没问题。", 108, 860, { size: 62, weight: 500, color: C.paperDim, spacing: 1 });
      ctx.restore();
    }
    if (t > 2.9) {
      ctx.save();
      ctx.globalAlpha = at(t, 2.92, 0.18);
      rect(ctx, 80, 790, 1760, 170, "rgba(7,11,12,0.85)", 8);
      txt(ctx, "一万人一起用呢？", 108, 900, { size: 96, weight: 700, color: C.lime, spacing: 1 });
      for (let i = 0; i < 22; i++) {
        token(ctx, 1300 + (i * 37) % 480, 810 + (i * 53) % 120, 9, C.lime, 0.5);
      }
      ctx.restore();
    }

    cutFlash(ctx, t, [2.9]);
  },
};
