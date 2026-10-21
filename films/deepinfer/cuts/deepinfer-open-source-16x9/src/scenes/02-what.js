import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow } from "../lib/engine.js";
import { backdrop, label, card, gpu, flow, wire } from "../lib/parts.js";

const NODES = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2 + 0.3;
  const r = 82 + ((i * 31) % 46);
  return { x: 500 + Math.cos(a) * r * 1.35, y: 555 + Math.sin(a) * r * 0.78 };
});

export default {
  id: "what",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.08)", gx: 0.5, gy: 0.3, gridStep: 90 });
    label(ctx, "先分清两个东西", 120, 185, { size: 20, color: C.lime });
    txt(ctx, "模型，和跑模型的引擎。", 120, 265, { size: 56, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    // model card
    const lp = at(t, 0.12, 0.35);
    ctx.save();
    ctx.globalAlpha = lp;
    card(ctx, 120, 340, 760, 400, { fill: "rgba(16,24,26,0.75)", border: C.line, r: 18, alpha: lp });
    txt(ctx, "模型 = 大脑", 154, 398, { size: 42, weight: 600, color: C.paper, spacing: 0.5 });
    txt(ctx, "MODEL / THINKS", 846, 396, { size: 14, family: "mono", color: C.mute, align: "right", spacing: 2 });
    ctx.restore();

    NODES.forEach((n, i) => {
      const p = at(t, 0.28 + i * 0.022, 0.3);
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.2 + i * 0.6);
      ctx.save();
      ctx.globalAlpha = p * 0.28;
      ctx.strokeStyle = C.limeDim;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(500, 555); ctx.lineTo(n.x, n.y); ctx.stroke();
      if (i % 3 === 0) {
        const m = NODES[(i + 5) % NODES.length];
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
      }
      ctx.globalAlpha = p;
      ctx.fillStyle = C.lime;
      ctx.beginPath(); ctx.arc(n.x, n.y, 3 + pulse * 2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
    glow(ctx, 500, 555, 180, "rgba(201,245,109,0.18)", 0.5 * lp);
    txt(ctx, "会思考", 500, 690, { size: 26, color: C.mute, align: "center", spacing: 3, alpha: lp });

    // engine card
    const ep = at(t, 0.38, 0.35);
    ctx.save();
    ctx.globalAlpha = ep;
    card(ctx, 1040, 340, 760, 400, { fill: "rgba(12,19,21,0.86)", border: C.line, r: 18, alpha: ep });
    txt(ctx, "推理框架 = 调度系统", 1074, 398, { size: 40, weight: 600, color: C.lime, spacing: 0.5 });
    txt(ctx, "SERVES", 1766, 396, { size: 14, family: "mono", color: C.mute, align: "right", spacing: 2 });
    txt(ctx, "请求", 1080, 462, { size: 16, family: "mono", color: C.mute, spacing: 2 });
    txt(ctx, "调度", 1310, 462, { size: 16, family: "mono", color: C.mute, spacing: 2 });
    txt(ctx, "GPU 池", 1550, 462, { size: 16, family: "mono", color: C.mute, spacing: 2 });
    ctx.restore();

    // request stack
    for (let i = 0; i < 3; i++) {
      const p = at(t, 0.9 + i * 0.15, 0.3);
      ctx.save();
      ctx.globalAlpha = ep * p;
      const y = 490 + i * 66;
      rect(ctx, 1074, y, 150, 52, i === 2 ? "rgba(201,245,109,0.10)" : "rgba(255,255,255,0.035)", 8);
      outline(ctx, 1074, y, 150, 52, i === 2 ? C.lime : C.line, 1.1, 8);
      for (let k = 0; k < 2; k++) rect(ctx, 1088, y + 18 + k * 13, [88, 60][k], 3, i === 2 ? C.lime : C.paperDim, 2);
      ctx.restore();
    }

    // scheduler
    ctx.save();
    ctx.globalAlpha = ep;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(1330, 610, 54, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = t * 1.5 + (i * Math.PI * 2) / 3;
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(1330, 610, 54, a, a + 0.62); ctx.stroke();
    }
    ctx.fillStyle = C.lime;
    ctx.beginPath(); ctx.arc(1330, 610, 6, 0, Math.PI * 2); ctx.fill();
    txt(ctx, "排队 · 拼车", 1330, 690, { size: 16, color: C.mute, align: "center", spacing: 1 });
    ctx.restore();

    // gpu pool
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        const on = t > 1.7 + idx * 0.05;
        const heat = on ? 0.18 + 0.2 * Math.abs(Math.sin(t * 2 + idx)) : 0;
        gpu(ctx, 1540 + c * 60, 490 + r * 60, 46, 46, { heat, alpha: ep * (on ? 1 : 0.2) });
      }
    }
    txt(ctx, "每张卡都不闲着", 1660, 700, { size: 16, color: C.mute, align: "center", spacing: 1, alpha: ep });

    wire(ctx, [[1224, 540], [1270, 540], [1270, 610], [1276, 610]], { color: C.line, width: 2, alpha: ep * 0.8 });
    flow(ctx, [[1224, 540], [1270, 540], [1270, 610], [1276, 610]], t, { count: 4, speed: 0.5, size: 5, alpha: ep * 0.8 });
    wire(ctx, [[1384, 610], [1460, 610], [1460, 520], [1534, 520]], { color: C.line, width: 2, alpha: ep * 0.8 });
    flow(ctx, [[1384, 610], [1460, 610], [1460, 520], [1534, 520]], t, { count: 5, speed: 0.6, size: 5, alpha: ep * 0.8 });

    // bottom line, in three beats
    const a1 = at(t, 0.6, 0.35) * (1 - at(t, 3.5, 0.3));
    const a2 = at(t, 3.6, 0.35) * (1 - at(t, 6.9, 0.3));
    const a3 = at(t, 7.0, 0.4);
    if (a1 > 0) {
      ctx.save(); ctx.globalAlpha = a1;
      txt(ctx, "模型，是 AI 的大脑。", 120, 870, { size: 54, weight: 500, color: C.paperDim, spacing: 0.5 });
      ctx.restore();
    }
    if (a2 > 0) {
      ctx.save(); ctx.globalAlpha = a2;
      txt(ctx, "推理框架，让它同时接住所有人。", 120, 870, { size: 54, weight: 500, color: C.paper, spacing: 0.5 });
      ctx.restore();
    }
    if (a3 > 0) {
      ctx.save(); ctx.globalAlpha = a3;
      txt(ctx, "这次开源的，叫", 120, 850, { size: 40, color: C.mute, spacing: 1 });
      txt(ctx, "DeepInfer", 480, 858, { size: 80, family: "mono", weight: 700, color: C.lime, spacing: -1 });
      txt(ctx, "DeepSeek 的推理框架", 900, 858, { size: 32, color: C.paperDim, spacing: 1 });
      ctx.restore();
    }
  },
};
