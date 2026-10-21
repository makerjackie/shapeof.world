import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow } from "../lib/engine.js";
import { backdrop, label, check } from "../lib/parts.js";

const BX = 160, BY = 360, BW = 700, BH = 460;

export default {
  id: "control",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.5, gy: 0.4, gridStep: 90 });
    label(ctx, "为什么重要 / 02 控制权", 120, 185, { size: 20, color: C.cyan });
    txt(ctx, "把模型，搬进自己的机房。", 120, 265, { size: 54, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35) });

    const bp = at(t, 0.4, 0.5);
    if (bp > 0) {
      ctx.save();
      ctx.globalAlpha = bp;
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = -t * 24;
      ctx.beginPath();
      ctx.roundRect(BX - 40, BY - 38, BW + 80, BH + 76, 16);
      ctx.stroke();
      ctx.restore();
    }

    // building
    const bd = at(t, 0.1, 0.45);
    ctx.save();
    ctx.globalAlpha = bd;
    rect(ctx, BX, BY, BW, BH, "rgba(13,21,23,0.92)", 10);
    outline(ctx, BX, BY, BW, BH, C.paperDim, 2, 10);
    rect(ctx, BX - 16, BY - 14, BW + 32, 14, C.paperDim, 4);
    for (let f = 1; f < 4; f++) rule(ctx, BX, BY + (BH / 4) * f, BX + BW, BY + (BH / 4) * f, C.line, 1);
    for (let f = 0; f < 4; f++) {
      for (let r = 0; r < 6; r++) {
        const x = BX + 30 + r * 108;
        const y = BY + 20 + f * (BH / 4);
        rect(ctx, x, y, 84, 76, "#0A1113", 4);
        outline(ctx, x, y, 84, 76, C.line, 1, 4);
        for (let k = 0; k < 3; k++) {
          const on = Math.sin(t * 3 + r * 0.9 + f * 1.3 + k) > 0.2;
          ctx.fillStyle = on ? C.cyan : C.dim;
          ctx.globalAlpha = bd * (on ? 0.8 : 0.35);
          ctx.fillRect(x + 10, y + 12 + k * 18, 44, 3);
          ctx.globalAlpha = bd;
        }
      }
    }
    ctx.restore();

    if (t > 1.6) {
      for (let i = 0; i < 20; i++) {
        const speed = 70 + (i % 5) * 18;
        const x = BX + 12 + tri(t * speed + i * 71, BW - 24);
        const y = BY + 12 + tri(t * (speed * 0.7) + i * 43, BH - 24);
        token(ctx, x, y, 8, i % 3 === 0 ? C.cyan : C.lime, 0.55);
      }
    }

    // cloud
    const cp = at(t, 0.7, 0.45);
    if (cp > 0) {
      ctx.save();
      ctx.globalAlpha = cp * 0.9;
      ctx.translate(1480, 350);
      ctx.fillStyle = "#1A2426";
      ctx.beginPath();
      ctx.arc(-64, 12, 42, 0, Math.PI * 2);
      ctx.arc(-8, -20, 54, 0, Math.PI * 2);
      ctx.arc(54, 8, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-64, 10, 118, 44);
      txt(ctx, "云厂商", 0, 84, { size: 20, color: C.mute, align: "center", spacing: 2 });
      ctx.restore();
    }

    // model moves in
    const mp = clamp((t - 1.2) / 1.6);
    if (mp > 0) {
      const x = lerp(1480, 510, easeOut(mp));
      const y = lerp(390, 600, easeOut(mp)) - Math.sin(mp * Math.PI) * 140;
      ctx.save();
      ctx.globalAlpha = 1 - at(t, 3.6, 0.5) * 0.55;
      glow(ctx, x, y, 90, "rgba(201,245,109,0.28)", 0.7);
      rect(ctx, x - 56, y - 34, 112, 68, C.lime, 8);
      txt(ctx, "模型", x, y + 10, { size: 24, weight: 700, color: "#0A120E", align: "center", spacing: 2 });
      ctx.restore();
    }

    // checks
    const kp = at(t, 3.2, 0.4);
    if (kp > 0) {
      ctx.save();
      ctx.globalAlpha = kp;
      check(ctx, 1120, 590, 22, C.lime);
      txt(ctx, "数据不出门", 1154, 600, { size: 34, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, "模型在自家机房里跑。", 1154, 640, { size: 22, color: C.mute, spacing: 0.5 });
      check(ctx, 1120, 710, 22, C.lime);
      txt(ctx, "不被一家锁死", 1154, 720, { size: 34, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, "换云、换卡、换部署方式，自己说了算。", 1154, 760, { size: 22, color: C.mute, spacing: 0.5 });
      ctx.restore();
    }

    rule(ctx, 120, 840, 1800, 840, C.line, 1, at(t, 4.8, 0.4));
    txt(ctx, "钥匙，在自己手里。", 120, 916, { size: 44, weight: 600, color: C.lime, spacing: 1, alpha: at(t, 5.0, 0.4) });
  },
};

function tri(v, size) {
  const p = ((v / size) % 2 + 2) % 2;
  return (p <= 1 ? p : 2 - p) * size;
}
function lerp(a, b, t) { return a + (b - a) * t; }
