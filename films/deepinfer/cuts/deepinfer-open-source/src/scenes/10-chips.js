import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, glow, token } from "../lib/engine.js";
import { backdrop, label, wire, flow, check } from "../lib/parts.js";

export default {
  id: "chips",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.78, gy: 0.35, gridStep: 90 });
    // right side tint
    ctx.save();
    ctx.globalAlpha = 0.1;
    const g = ctx.createLinearGradient(700, 0, W, 0);
    g.addColorStop(0, "rgba(121,221,230,0)");
    g.addColorStop(1, "rgba(121,221,230,0.7)");
    ctx.fillStyle = g;
    ctx.fillRect(700, 0, W - 700, H);
    ctx.restore();

    label(ctx, "为什么重要 / 03 选择权", 90, 205, { size: 20, color: C.lime });
    txt(ctx, "AI 的底座，只有一条路吗？", 90, 285, {
      size: 46, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35),
    });

    // engine node
    const np = at(t, 0.5, 0.4);
    if (np > 0) {
      ctx.save();
      ctx.globalAlpha = np;
      rect(ctx, 420, 344, 240, 92, "rgba(201,245,109,0.07)", 10);
      outline(ctx, 420, 344, 240, 92, C.lime, 1.6, 10);
      txt(ctx, "DeepInfer", 540, 388, { size: 28, family: "mono", weight: 700, color: C.lime, align: "center", spacing: 0 });
      txt(ctx, "同一套引擎", 540, 416, { size: 14, family: "mono", color: C.mute, align: "center", spacing: 2 });
      ctx.restore();
    }

    const rightOn = at(t, 2.5, 0.4);
    wire(ctx, [[466, 436], [466, 500], [276, 500], [276, 560]], { color: C.line, width: 2, alpha: 0.9 });
    wire(ctx, [[614, 436], [614, 500], [804, 500], [804, 560]], { color: rightOn > 0 ? C.cyan : C.line, width: 2, alpha: 0.9 });
    flow(ctx, [[466, 436], [466, 500], [276, 500], [276, 560]], t, { count: 5, speed: 0.7, size: 6, color: C.lime, alpha: 0.9 });
    flow(ctx, [[614, 436], [614, 500], [804, 500], [804, 560]], t, { count: 5, speed: 0.7, size: 6, color: C.cyan, alpha: rightOn * 0.9 });

    bigChip(ctx, 111, 590, 330, 320, C.lime, 1, "NVIDIA", "SM100");
    bigChip(ctx, 639, 590, 330, 320, C.cyan, rightOn, "HUAWEI", "昇腾 950");

    txt(ctx, "已经支持", 276, 966, { size: 20, color: C.lime, align: "center", spacing: 2, alpha: 0.9 });
    txt(ctx, "也已经支持", 804, 966, { size: 20, color: C.cyan, align: "center", spacing: 2, alpha: rightOn });

    // switch
    const sp = at(t, 2.2, 0.3);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      rect(ctx, 758, 470, 92, 46, "rgba(121,221,230,0.10)", 23);
      outline(ctx, 758, 470, 92, 46, C.cyan, 1.2, 23);
      const kx = 776 + rightOn * 34;
      ctx.fillStyle = C.cyan;
      ctx.beginPath(); ctx.arc(kx, 493, 15, 0, Math.PI * 2); ctx.fill();
      txt(ctx, "切换", 804, 544, { size: 13, family: "mono", color: C.cyan, align: "center", spacing: 2 });
      ctx.restore();
    }

    // statement
    const tp = at(t, 3.9, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rule(ctx, 90, 1040, 990, 1040, C.line, 1);
      txt(ctx, "不只", 92, 1190, { size: 132, family: "serif", weight: 700, color: C.paper, spacing: -2 });
      txt(ctx, "一条路。", 360, 1190, { size: 132, family: "serif", weight: 700, color: C.lime, spacing: -2 });
      txt(ctx, "供应链，多一个选项。", 96, 1258, { size: 32, color: C.paperDim, spacing: 0.5 });
      ctx.restore();
    }

    const bp = at(t, 5.2, 0.4);
    if (bp > 0) {
      ctx.save();
      ctx.globalAlpha = bp;
      rule(ctx, 90, 1330, 990, 1330, C.line, 1);
      txt(ctx, "同一套代码 / 两条硬件路线", 90, 1386, { size: 22, color: C.paperDim, spacing: 1 });
      txt(ctx, "NVIDIA · ASCEND", 990, 1386, { size: 18, family: "mono", color: C.mute, align: "right", spacing: 2 });
      ctx.restore();
    }

    // tiny route marks
    ctx.save();
    ctx.globalAlpha = 0.5;
    for (let i = 0; i < 8; i++) {
      rule(ctx, 1010, 240 + i * 44, 1018 + (i % 3) * 10, 240 + i * 44, C.cyan, 1);
    }
    ctx.restore();
  },
};

function bigChip(ctx, x, y, w, h, color, on, vendor, model) {
  ctx.save();
  ctx.globalAlpha = 0.25 + on * 0.75;
  const pad = 26;
  rect(ctx, x, y, w, h, "#0B1214", 16);
  outline(ctx, x, y, w, h, color, 2, 16);
  // pins
  ctx.fillStyle = color;
  for (let i = 0; i < 7; i++) {
    const px = x + 34 + i * 42;
    ctx.globalAlpha = (0.25 + on * 0.75) * 0.9;
    ctx.fillRect(px, y - 12, 5, 12);
    ctx.fillRect(px, y + h, 5, 12);
  }
  ctx.globalAlpha = 0.25 + on * 0.75;
  // die
  outline(ctx, x + pad, y + pad, w - pad * 2, h - pad * 2, color, 1.2, 8);
  ctx.globalAlpha = (0.25 + on * 0.75) * (0.1 + on * 0.12);
  ctx.fillStyle = color;
  ctx.fillRect(x + pad + 10, y + pad + 10, w - pad * 2 - 20, h - pad * 2 - 20);
  ctx.globalAlpha = 0.25 + on * 0.75;
  txt(ctx, vendor, x + w / 2, y + 150, { size: 22, family: "mono", color, align: "center", spacing: 4 });
  txt(ctx, model, x + w / 2, y + 214, { size: 54, weight: 700, color: C.paper, align: "center", spacing: 1 });
  if (on > 0.4) {
    glow(ctx, x + w / 2, y + h / 2, 150, color === C.lime ? "rgba(201,245,109,0.18)" : "rgba(121,221,230,0.18)", on * 0.7);
  }
  ctx.restore();
}
