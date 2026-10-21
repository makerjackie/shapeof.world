import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, token, glow } from "../lib/engine.js";
import { backdrop, label, wire, flow, check, cross } from "../lib/parts.js";

const BX = 210, BY = 400, BW = 660, BH = 620;

export default {
  id: "control",
  draw(ctx, t) {
    backdrop(ctx, t, { glowColor: "rgba(121,221,230,0.10)", gx: 0.5, gy: 0.4, gridStep: 90 });
    label(ctx, "为什么重要 / 02 控制权", 90, 205, { size: 20, color: C.cyan });
    txt(ctx, "把模型，搬进自己的机房。", 90, 285, {
      size: 44, weight: 600, color: C.paper, spacing: 0.5, alpha: at(t, 0.1, 0.35),
    });

    // boundary
    const bp = at(t, 0.8, 0.6);
    if (bp > 0) {
      ctx.save();
      ctx.globalAlpha = bp;
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 12]);
      ctx.lineDashOffset = -t * 26;
      ctx.beginPath();
      ctx.roundRect(BX - 44, BY - 42, BW + 88, BH + 84, 18);
      ctx.stroke();
      ctx.restore();
      txt(ctx, "自己的边界", BX - 40, BY - 64, { size: 16, family: "mono", color: C.lime, spacing: 2, alpha: bp });
    }

    // building
    const bd = at(t, 0.4, 0.55);
    if (bd > 0) {
      ctx.save();
      ctx.globalAlpha = bd;
      rect(ctx, BX, BY, BW, BH, "rgba(13,21,23,0.92)", 10);
      outline(ctx, BX, BY, BW, BH, C.paperDim, 2, 10);
      // roof
      rect(ctx, BX - 18, BY - 16, BW + 36, 16, C.paperDim, 4);
      // floors
      for (let f = 1; f < 4; f++) rule(ctx, BX, BY + (BH / 4) * f, BX + BW, BY + (BH / 4) * f, C.line, 1);
      // racks
      for (let f = 0; f < 4; f++) {
        for (let r = 0; r < 6; r++) {
          const x = BX + 32 + r * 100;
          const y = BY + 26 + f * (BH / 4);
          rect(ctx, x, y, 76, 96, "#0A1113", 4);
          outline(ctx, x, y, 76, 96, C.line, 1, 4);
          for (let k = 0; k < 4; k++) {
            const on = Math.sin(t * 3 + r * 0.9 + f * 1.3 + k) > 0.2;
            ctx.fillStyle = on ? C.cyan : C.dim;
            ctx.globalAlpha = bd * (on ? 0.8 : 0.35);
            ctx.fillRect(x + 10, y + 12 + k * 18, 40, 3);
            ctx.globalAlpha = bd;
          }
        }
      }
      ctx.restore();
    }

    // data bouncing inside
    if (t > 2.3) {
      for (let i = 0; i < 18; i++) {
        const speed = 90 + (i % 5) * 22;
        const x = BX + 20 + tri(t * speed + i * 73, BW - 40);
        const y = BY + 20 + tri(t * (speed * 0.7) + i * 41, BH - 40);
        token(ctx, x, y, 8, i % 3 === 0 ? C.cyan : C.lime, 0.55);
      }
    }

    // cloud and lock chain
    const cp = at(t, 1.0, 0.5);
    if (cp > 0) {
      ctx.save();
      ctx.globalAlpha = cp * 0.9;
      ctx.translate(870, 252);
      ctx.fillStyle = "#1A2426";
      ctx.beginPath();
      ctx.arc(-58, 10, 38, 0, Math.PI * 2);
      ctx.arc(-10, -18, 48, 0, Math.PI * 2);
      ctx.arc(44, 6, 40, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-58, 8, 102, 38);
      txt(ctx, "云厂商", 0, 72, { size: 20, color: C.mute, align: "center", spacing: 2 });
      ctx.restore();
    }
    // model moves in
    const mp = clamp((t - 1.4) / 1.5);
    if (mp > 0) {
      const x = lerp(842, 540, easeOut(mp));
      const y = lerp(300, 760, easeOut(mp)) - Math.sin(mp * Math.PI) * 120;
      ctx.save();
      ctx.globalAlpha = 1 - at(t, 3.2, 0.4) * 0.15;
      glow(ctx, x, y, 90, "rgba(201,245,109,0.3)", 0.7);
      rect(ctx, x - 52, y - 34, 104, 68, C.lime, 8);
      txt(ctx, "模型", x, y + 10, { size: 24, weight: 700, color: "#0A120E", align: "center", spacing: 2 });
      ctx.restore();
    }

    // labels
    txt(ctx, "自己的机房", 540, 1100, { size: 22, color: C.paperDim, align: "center", spacing: 2, alpha: at(t, 2.6, 0.4) });
    const bp2 = at(t, 4.6, 0.4);
    if (bp2 > 0) {
      ctx.save();
      ctx.globalAlpha = bp2;
      check(ctx, 130, 1140, 20, C.lime);
      txt(ctx, "数据不出门，服务在自己手里", 162, 1149, { size: 27, color: C.paper, spacing: 0.5 });
      check(ctx, 130, 1204, 20, C.lime);
      txt(ctx, "不用被一家云厂商锁死", 162, 1213, { size: 27, color: C.paper, spacing: 0.5 });
      rule(ctx, 90, 1270, 990, 1270, C.line, 1);
      txt(ctx, "钥匙，在自己手里。", 90, 1340, { size: 38, weight: 600, color: C.lime, spacing: 1 });
      txt(ctx, "开源，把选择权交回你手里。", 90, 1394, { size: 24, color: C.mute, spacing: 0.5 });
      // key glyph
      ctx.save();
      ctx.translate(860, 1324);
      ctx.strokeStyle = C.lime;
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(-40, 0, 18, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-22, 0); ctx.lineTo(56, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(40, 0); ctx.lineTo(40, 16); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(56, 0); ctx.lineTo(56, 20); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }
  },
};

function tri(v, size) {
  const p = ((v / size) % 2 + 2) % 2;
  return (p <= 1 ? p : 2 - p) * size;
}
function lerp(a, b, t) { return a + (b - a) * t; }
