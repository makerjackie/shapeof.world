import { C, W, H, txt, rule, rect, outline, at, clamp, token, glow } from "../lib/engine.js";
import { backdrop, check } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

const BX = 160, BY = 360, BW = 680, BH = 420;

export default {
  id: "control",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.11)", gx: 0.4, gy: 0.4, gridStep: 90 });
    txt(ctx, "为什么重要？", 108, 210, { size: 22, family: "mono", color: C.cyan, spacing: 4, alpha: at(t, 0.02, 0.15) });
    slam(ctx, "02  控制权", 104, 300, { size: 64, weight: 700, color: C.paper, spacing: 2 }, at(t, 0.05, 0.2));

    const bp = at(t, 0.05, 0.3);
    ctx.save();
    ctx.globalAlpha = bp;
    ctx.strokeStyle = C.lime;
    ctx.lineWidth = 2;
    ctx.setLineDash([9, 11]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.roundRect(BX - 36, BY - 34, BW + 72, BH + 68, 14);
    ctx.stroke();
    rect(ctx, BX, BY, BW, BH, "rgba(13,21,23,0.94)", 8);
    outline(ctx, BX, BY, BW, BH, C.paperDim, 1.6, 8);
    for (let r = 0; r < 5; r++) {
      for (let f = 0; f < 3; f++) {
        const x = BX + 26 + r * 128;
        const y = BY + 26 + f * 128;
        rect(ctx, x, y, 96, 92, "#0A1113", 3);
        outline(ctx, x, y, 96, 92, C.line, 1, 3);
        for (let k = 0; k < 3; k++) {
          ctx.fillStyle = Math.sin(t * 5 + r + f + k) > 0 ? C.cyan : C.dim;
          ctx.fillRect(x + 12, y + 14 + k * 20, 40, 3);
        }
      }
    }
    ctx.restore();

    if (t > 0.4) {
      for (let i = 0; i < 16; i++) {
        const x = BX + 10 + tri(t * 160 + i * 71, BW - 20);
        const y = BY + 10 + tri(t * 110 + i * 43, BH - 20);
        token(ctx, x, y, 7, i % 3 === 0 ? C.cyan : C.lime, 0.6);
      }
    }

    // cloud
    ctx.save();
    ctx.globalAlpha = at(t, 0.2, 0.3) * 0.8;
    ctx.translate(1480, 420);
    ctx.fillStyle = "#1A2426";
    ctx.beginPath();
    ctx.arc(-58, 12, 38, 0, Math.PI * 2);
    ctx.arc(-8, -18, 48, 0, Math.PI * 2);
    ctx.arc(48, 8, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-58, 8, 104, 40);
    txt(ctx, "云厂商", 0, 76, { size: 18, color: C.mute, align: "center", spacing: 2 });
    ctx.restore();

    // model move
    const mp = clamp((t - 0.3) / 0.6);
    if (mp > 0) {
      const x = lerp(1480, 500, mp);
      const y = lerp(450, 600, mp) - Math.sin(mp * Math.PI) * 80;
      ctx.save();
      glow(ctx, x, y, 80, "rgba(201,245,109,0.28)", 0.7);
      rect(ctx, x - 50, y - 30, 100, 60, C.lime, 7);
      txt(ctx, "模型", x, y + 9, { size: 22, weight: 700, color: "#0A120E", align: "center", spacing: 2 });
      ctx.restore();
    }

    if (t > 1.3) {
      slam(ctx, "数据不出门", 1120, 560, { size: 82, weight: 700, color: C.paper, spacing: 1 }, at(t, 1.32, 0.2));
      check(ctx, 1100, 540, 26, C.lime, at(t, 1.32, 0.2));
    }
    if (t > 2.3) {
      slam(ctx, "不被锁死", 1120, 690, { size: 82, weight: 700, color: C.lime, spacing: 1 }, at(t, 2.32, 0.2));
      check(ctx, 1100, 670, 26, C.lime, at(t, 2.32, 0.2));
    }
    txt(ctx, "钥匙，在自己手里。", 108, 900, { size: 40, weight: 600, color: C.paperDim, spacing: 1, alpha: at(t, 2.8, 0.2) });

    cutFlash(ctx, t, [1.3, 2.3]);
  },
};

function tri(v, size) {
  const p = ((v / size) % 2 + 2) % 2;
  return (p <= 1 ? p : 2 - p) * size;
}
function lerp(a, b, t) { return a + (b - a) * t; }
