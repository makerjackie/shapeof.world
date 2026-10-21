import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, glow } from "../lib/engine.js";
import { backdrop, label, wire, flow } from "../lib/parts.js";

export default {
  id: "chips",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.78, gy: 0.35, gridStep: 90 });
    ctx.save();
    ctx.globalAlpha = 0.08;
    const g = ctx.createLinearGradient(1300, 0, W, 0);
    g.addColorStop(0, "rgba(121,221,230,0)");
    g.addColorStop(1, "rgba(121,221,230,0.8)");
    ctx.fillStyle = g;
    ctx.fillRect(1300, 0, W - 1300, H);
    ctx.restore();

    label(ctx, "为什么重要 / 03 选择权", 120, 185, { size: 20, color: C.lime });
    txt(ctx, "AI 的底座，只有一条路吗？", 120, 265, { size: 54, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    const np = at(t, 0.12, 0.35);
    ctx.save();
    ctx.globalAlpha = np;
    rect(ctx, 820, 330, 280, 90, "rgba(201,245,109,0.07)", 10);
    outline(ctx, 820, 330, 280, 90, C.lime, 1.5, 10);
    txt(ctx, "DeepInfer", 960, 374, { size: 28, family: "mono", weight: 700, color: C.lime, align: "center", spacing: 0 });
    txt(ctx, "同一套引擎", 960, 402, { size: 13, family: "mono", color: C.mute, align: "center", spacing: 2 });
    ctx.restore();

    const rightOn = at(t, 3.1, 0.4);
    wire(ctx, [[870, 420], [870, 480], [460, 480], [460, 540]], { color: C.line, width: 2, alpha: 0.9 });
    wire(ctx, [[1050, 420], [1050, 480], [1460, 480], [1460, 540]], { color: rightOn > 0 ? C.cyan : C.line, width: 2, alpha: 0.9 });
    flow(ctx, [[870, 420], [870, 480], [460, 480], [460, 540]], t, { count: 5, speed: 0.7, size: 6, color: C.lime, alpha: 0.9 });
    flow(ctx, [[1050, 420], [1050, 480], [1460, 480], [1460, 540]], t, { count: 5, speed: 0.7, size: 6, color: C.cyan, alpha: rightOn * 0.9 });

    bigChip(ctx, 180, 540, 560, 300, C.lime, 1, "NVIDIA", "SM100");
    bigChip(ctx, 1180, 540, 560, 300, C.cyan, rightOn, "HUAWEI", "昇腾 950");

    txt(ctx, "已经支持", 460, 884, { size: 20, color: C.lime, align: "center", spacing: 2 });
    txt(ctx, "也已经支持", 1460, 884, { size: 20, color: C.cyan, align: "center", spacing: 2, alpha: rightOn });

    const sp = at(t, 2.9, 0.3);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      rect(ctx, 1390, 450, 100, 44, "rgba(121,221,230,0.10)", 22);
      outline(ctx, 1390, 450, 100, 44, C.cyan, 1.2, 22);
      const kx = 1408 + rightOn * 36;
      ctx.fillStyle = C.cyan;
      ctx.beginPath(); ctx.arc(kx, 472, 14, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    const tp = at(t, 4.8, 0.45);
    if (tp > 0) {
      ctx.save();
      ctx.globalAlpha = tp;
      rule(ctx, 120, 940, 1800, 940, C.line, 1);
      txt(ctx, "不只一条路。", 120, 1010, { size: 64, family: "serif", weight: 700, color: C.paper, spacing: -1 });
      txt(ctx, "供应链，多一个选项。", 620, 1000, { size: 28, color: C.mute, spacing: 0.5 });
      ctx.restore();
    }
  },
};

function bigChip(ctx, x, y, w, h, color, on, vendor, model) {
  ctx.save();
  ctx.globalAlpha = 0.25 + on * 0.75;
  rect(ctx, x, y, w, h, "#0B1214", 16);
  outline(ctx, x, y, w, h, color, 2, 16);
  ctx.fillStyle = color;
  for (let i = 0; i < 9; i++) {
    const px = x + 36 + i * 58;
    ctx.globalAlpha = (0.25 + on * 0.75) * 0.9;
    ctx.fillRect(px, y - 12, 5, 12);
    ctx.fillRect(px, y + h, 5, 12);
  }
  ctx.globalAlpha = 0.25 + on * 0.75;
  outline(ctx, x + 26, y + 26, w - 52, h - 52, color, 1.2, 8);
  ctx.globalAlpha = (0.25 + on * 0.75) * (0.08 + on * 0.1);
  ctx.fillStyle = color;
  ctx.fillRect(x + 40, y + 40, w - 80, h - 80);
  ctx.globalAlpha = 0.25 + on * 0.75;
  txt(ctx, vendor, x + w / 2, y + 150, { size: 22, family: "mono", color, align: "center", spacing: 4 });
  txt(ctx, model, x + w / 2, y + 214, { size: 54, weight: 700, color: C.paper, align: "center", spacing: 1 });
  if (on > 0.4) glow(ctx, x + w / 2, y + h / 2, 200, color === C.lime ? "rgba(201,245,109,0.16)" : "rgba(121,221,230,0.16)", on * 0.7);
  ctx.restore();
}
