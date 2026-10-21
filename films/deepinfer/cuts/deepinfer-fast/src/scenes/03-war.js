import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, gpu } from "../lib/parts.js";
import { cutFlash, slam } from "../lib/fast.js";

export default {
  id: "war",
  draw(ctx, t) {
    const flood = easeOut(at(t, 0.5, 0.8));
    const shake = flood * 2;
    ctx.save();
    ctx.translate(Math.sin(t * 40) * shake, Math.cos(t * 47) * shake * 0.5);

    backdrop(ctx, t, { glowColor: "rgba(255,93,71,0.11)", gx: 0.8, gy: 0.3, gridStep: 90 });
    txt(ctx, "一个人", 120, 280, { size: 20, family: "mono", color: C.mute, spacing: 4 });
    txt(ctx, "1", 112, 420, { size: 150, family: "mono", weight: 700, color: C.paper, spacing: -6 });
    txt(ctx, "很简单", 280, 390, { size: 34, color: C.mute, spacing: 2 });

    const n = Math.round(1 + 9999 * easeOut(at(t, 0.2, 0.7)));
    txt(ctx, n.toLocaleString("en-US"), 1000, 420, {
      size: 132, family: "mono", weight: 700, color: flood > 0.2 ? C.red : C.paper, spacing: -5,
    });
    txt(ctx, "一起到达", 1000, 462, { size: 26, color: C.mute, spacing: 2 });
    txt(ctx, "（示意）", 1000, 496, { size: 14, family: "mono", color: C.dim, spacing: 2 });

    // queue
    for (let c = 0; c < 8; c++) {
      const x = 120 + c * 62;
      const filled = Math.round(10 * clamp(flood * (0.6 + ((c * 13) % 8) / 14)));
      for (let r = 0; r < 10; r++) {
        const on = r < filled;
        const hot = on && (r + c) % 8 === 0;
        ctx.save();
        ctx.globalAlpha = on ? 0.9 : 0.1;
        ctx.fillStyle = hot ? C.red : on ? C.lime : C.dim;
        ctx.beginPath(); ctx.roundRect(x, 700 - r * 24, 40, 16, 3); ctx.fill();
        ctx.restore();
      }
    }

    // gpu
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const i = r * 6 + c;
        const hot = i === 2 || i === 9 || i === 17;
        const heat = clamp(0.15 + flood * (hot ? 0.7 : 0.24 + 0.12 * Math.abs(Math.sin(t * 2 + i))));
        gpu(ctx, 1230 + c * 78, 500 + r * 62, 58, 52, { heat, alpha: t > 0.15 + i * 0.02 ? 1 : 0.2 });
      }
    }
    ctx.restore();

    // questions replace each other
    const qs = [
      { at: 1.8, text: "先算谁？" },
      { at: 2.5, text: "显存怎么分？" },
      { at: 3.2, text: "哪张卡闲着？" },
    ];
    const current = qs.filter((q) => t >= q.at).at(-1);
    if (current) {
      const p = at(t, current.at, 0.18);
      ctx.save();
      ctx.globalAlpha = p;
      rect(ctx, 70, 760, 1780, 180, "rgba(7,11,12,0.94)", 8);
      txt(ctx, current.text, 108, 900, { size: 104, weight: 700, color: C.paper, spacing: 1 });
      txt(ctx, "调度战争", 1780, 900, { size: 22, family: "mono", color: C.red, align: "right", spacing: 4 });
      ctx.restore();
    }

    if (t > 4.0) {
      ctx.save();
      ctx.globalAlpha = at(t, 4.0, 0.2);
      txt(ctx, "这，就是调度战争。", 108, 1000, { size: 46, weight: 700, color: C.amber, spacing: 1 });
      ctx.restore();
    }

    cutFlash(ctx, t, [1.8, 2.5, 3.2]);
  },
};
