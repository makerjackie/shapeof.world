import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, measure, glow } from "../lib/engine.js";
import { backdrop, label, card, gpu, flow, wire, tokenStream, ring, bracketBox } from "../lib/parts.js";

const NODES = Array.from({ length: 15 }, (_, i) => {
  const a = (i / 15) * Math.PI * 2 + 0.4;
  const r = 74 + ((i * 37) % 42);
  return { x: 540 + Math.cos(a) * r * 1.32, y: 402 + Math.sin(a) * r * 0.78, i };
});

export default {
  id: "brain",
  draw(ctx, t, s) {
    backdrop(ctx, t, { glowColor: "rgba(201,245,109,0.08)", gx: 0.5, gy: 0.24, gridStep: 80 });
    label(ctx, "先分清两个东西", 90, 210, { size: 20, color: C.lime });
    txt(ctx, "模型 × 推理框架 = 能用的 AI", 90, 275, {
      size: 46, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.02, 0.3),
    });

    // ---- model / brain ----
    const bp = at(t, 0.0, 0.24);
    ctx.save();
    ctx.globalAlpha = bp;
    card(ctx, 300, 330, 480, 270, { fill: "rgba(16,24,26,0.72)", border: C.line, r: 20, alpha: bp });
    txt(ctx, "模型 = 大脑", 328, 372, { size: 26, weight: 600, color: C.paper, alpha: bp });
    txt(ctx, "MODEL / THINKS", 752, 372, { size: 15, family: "mono", color: C.mute, align: "right", spacing: 2, alpha: bp });
    ctx.restore();

    NODES.forEach((n, i) => {
      const p = at(t, 0.05 + i * 0.018, 0.3);
      const pulse = 0.6 + 0.4 * Math.sin(t * 2.4 + i * 0.7);
      ctx.save();
      ctx.globalAlpha = p;
      ctx.strokeStyle = C.limeDim;
      ctx.lineWidth = 1;
      ctx.globalAlpha = p * 0.28;
      ctx.beginPath();
      ctx.moveTo(540, 402);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
      if (i % 3 === 0) {
        const m = NODES[(i + 4) % NODES.length];
        ctx.beginPath(); ctx.moveTo(n.x, n.y); ctx.lineTo(m.x, m.y); ctx.stroke();
      }
      ctx.globalAlpha = p * 0.7;
      ctx.fillStyle = C.lime;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 3 + pulse * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    glow(ctx, 540, 402, 150, "rgba(201,245,109,0.2)", 0.6 * bp);
    txt(ctx, "会思考", 540, 560, {
      size: 24, color: C.mute, align: "center", spacing: 3, alpha: bp,
    });

    // ---- engine ----
    const ep = at(t, 0.04, 0.3);
    if (ep <= 0) return;
    ctx.save();
    ctx.globalAlpha = ep;
    card(ctx, 80, 640, 920, 600, { fill: "rgba(12,19,21,0.86)", border: C.line, r: 22, alpha: ep });
    txt(ctx, "推理框架 = 调度系统", 110, 688, { size: 27, weight: 600, color: C.lime, alpha: ep });
    txt(ctx, "INFERENCE FRAMEWORK / SERVES", 970, 688, { size: 15, family: "mono", color: C.mute, align: "right", spacing: 2, alpha: ep });
    rule(ctx, 110, 710, 970, 710, C.line, 1, ep);

    txt(ctx, "请求", 112, 748, { size: 17, family: "mono", color: C.mute, spacing: 2, alpha: ep });
    txt(ctx, "调度", 366, 748, { size: 17, family: "mono", color: C.mute, spacing: 2, alpha: ep });
    txt(ctx, "GPU 池", 604, 748, { size: 17, family: "mono", color: C.mute, spacing: 2, alpha: ep });

    // request cards
    const cards = [
      { y: 792, label: "一个人" },
      { y: 884, label: "一家人" },
      { y: 976, label: "一万人" },
    ];
    cards.forEach((c, i) => {
      const p = at(t, 0.04 + i * 0.13, 0.28);
      ctx.save();
      ctx.globalAlpha = ep * p;
      rect(ctx, 110, c.y, 150, 70, i === 2 ? "rgba(201,245,109,0.10)" : "rgba(255,255,255,0.035)", 10);
      outline(ctx, 110, c.y, 150, 70, i === 2 ? C.lime : C.line, 1.2, 10);
      for (let k = 0; k < 3; k++) {
        const w = [86, 60, 104][k];
        rect(ctx, 124, c.y + 19 + k * 14, w, 4, i === 2 ? C.lime : C.paperDim, 2);
      }
      txt(ctx, c.label, 240, c.y + 68, { size: 14, family: "mono", color: i === 2 ? C.lime : C.mute, align: "right", spacing: 1 });
      ctx.restore();
    });

    // scheduler
    const sc = { x: 406, y: 930, r: 62 };
    ctx.save();
    ctx.globalAlpha = ep;
    ctx.strokeStyle = C.line;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, sc.r, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 3; i++) {
      const a = t * 1.6 + (i * Math.PI * 2) / 3;
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(sc.x, sc.y, sc.r, a, a + 0.6);
      ctx.stroke();
    }
    ctx.fillStyle = C.lime;
    ctx.beginPath(); ctx.arc(sc.x, sc.y, 7, 0, Math.PI * 2); ctx.fill();
    txt(ctx, "排队 / 拼车 / 先猜后验", sc.x, sc.y + sc.r + 34, {
      size: 15, color: C.mute, align: "center", spacing: 1,
    });
    ctx.restore();

    // gpu pool
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        const idx = r * 4 + c;
        const x = 596 + c * 76;
        const y = 790 + r * 76;
        const on = t > 1.0 + idx * 0.05;
        const heat = on ? clamp(0.18 + 0.22 * Math.abs(Math.sin(t * 2 + idx))) : 0;
        gpu(ctx, x, y, 62, 62, { heat, alpha: ep * (on ? 1 : 0.25), color: C.lime });
      }
    }
    txt(ctx, "让每张卡都不闲着", 752, 1090, { size: 15, color: C.mute, align: "center", spacing: 1, alpha: ep });

    // wires
    const wireP = at(t, 0.7, 0.45);
    wire(ctx, [[262, 827], [330, 827], [330, 930], [344, 930]], { color: C.line, width: 2, alpha: ep * wireP });
    wire(ctx, [[468, 930], [520, 930], [520, 800], [588, 800]], { color: C.line, width: 2, alpha: ep * wireP });
    flow(ctx, [[262, 827], [330, 827], [330, 930], [344, 930]], t, { count: 4, speed: 0.5, size: 6, alpha: ep * wireP * 0.9 });
    flow(ctx, [[468, 930], [520, 930], [520, 800], [588, 800]], t, { count: 6, speed: 0.6, size: 6, alpha: ep * wireP * 0.9 });

    // output
    const op = at(t, 1.9, 0.5);
    wire(ctx, [[900, 1020], [940, 1020], [940, 1120], [110, 1120]], { color: C.line, width: 2, alpha: ep * op });
    tokenStream(ctx, 130, 1146, t, { rows: 2, color: C.lime, alpha: ep * op * 0.95, density: 1.1, width: 780 });
    txt(ctx, "成千上万人，共用一套回答流水线", 540, 1214, {
      size: 20, color: C.paperDim, align: "center", spacing: 1, alpha: ep * at(t, 4.6, 0.4),
    });
    ctx.restore();

    const tp = at(t, 5.2, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rule(ctx, 90, 1320, 990, 1320, C.line, 1);
      txt(ctx, "大脑一次只想一件事；调度系统，让它一次接住所有人。", 90, 1382, {
        size: 28, color: C.paperDim, spacing: 0.5,
      });
      ctx.restore();
    }
  },
};
