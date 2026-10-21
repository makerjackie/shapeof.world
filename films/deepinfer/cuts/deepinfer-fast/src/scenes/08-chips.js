import { C, W, H, txt, rule, rect, outline, at, clamp, glow } from "../lib/engine.js";
import { backdrop, wire, flow } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "chips",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.12)", gx: 0.8, gy: 0.35, gridStep: 90 });
    txt(ctx, "为什么重要？", 108, 210, { size: 22, family: "mono", color: C.lime, spacing: 4, alpha: at(t, 0.02, 0.15) });
    slam(ctx, "03  选择权", 104, 300, { size: 64, weight: 700, color: C.paper, spacing: 2 }, at(t, 0.05, 0.2));

    const np = at(t, 0.02, 0.2);
    ctx.save();
    ctx.globalAlpha = np;
    rect(ctx, 830, 360, 260, 80, "rgba(201,245,109,0.08)", 8);
    outline(ctx, 830, 360, 260, 80, C.lime, 1.4, 8);
    txt(ctx, "DeepInfer", 960, 410, { size: 28, family: "mono", weight: 700, color: C.lime, align: "center", spacing: 0 });
    ctx.restore();

    const rightOn = at(t, 1.2, 0.3);
    wire(ctx, [[880, 440], [880, 490], [450, 490], [450, 540]], { color: C.line, width: 2, alpha: 0.9 });
    wire(ctx, [[1040, 440], [1040, 490], [1470, 490], [1470, 540]], { color: rightOn > 0 ? C.cyan : C.line, width: 2, alpha: 0.9 });
    flow(ctx, [[880, 440], [880, 490], [450, 490], [450, 540]], t, { count: 4, speed: 1.2, size: 5, color: C.lime });
    flow(ctx, [[1040, 440], [1040, 490], [1470, 490], [1470, 540]], t, { count: 4, speed: 1.2, size: 5, color: C.cyan, alpha: rightOn });

    bigChip(ctx, 180, 540, 540, 290, C.lime, 1, "NVIDIA", "SM100");
    bigChip(ctx, 1200, 540, 540, 290, C.cyan, rightOn, "HUAWEI", "昇腾 950");

    if (t > 1.2) {
      slam(ctx, "不只一条路。", 108, 940, { size: 96, family: "serif", weight: 700, color: C.paper, spacing: -1 }, at(t, 1.22, 0.2));
      txt(ctx, "供应链，多一个选项。", 108, 1000, { size: 26, color: C.mute, spacing: 1, alpha: at(t, 1.5, 0.2) });
    }

    cutFlash(ctx, t, [1.2]);
  },
};

function bigChip(ctx, x, y, w, h, color, on, vendor, model) {
  ctx.save();
  ctx.globalAlpha = 0.2 + on * 0.8;
  rect(ctx, x, y, w, h, "#0B1214", 14);
  outline(ctx, x, y, w, h, color, 2, 14);
  ctx.fillStyle = color;
  for (let i = 0; i < 8; i++) {
    const px = x + 36 + i * 60;
    ctx.fillRect(px, y - 10, 4, 10);
    ctx.fillRect(px, y + h, 4, 10);
  }
  outline(ctx, x + 24, y + 24, w - 48, h - 48, color, 1, 6);
  txt(ctx, vendor, x + w / 2, y + 140, { size: 20, family: "mono", color, align: "center", spacing: 4 });
  txt(ctx, model, x + w / 2, y + 206, { size: 52, weight: 700, color: C.paper, align: "center", spacing: 1 });
  if (on > 0.4) glow(ctx, x + w / 2, y + h / 2, 180, color === C.lime ? "rgba(201,245,109,0.16)" : "rgba(121,221,230,0.16)", on * 0.7);
  ctx.restore();
}
