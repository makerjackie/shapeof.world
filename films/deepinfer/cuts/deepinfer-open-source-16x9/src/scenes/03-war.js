import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, measure } from "../lib/engine.js";
import { backdrop, label, gpu } from "../lib/parts.js";

export default {
  id: "war",
  draw(ctx, t) {
    const flood = easeOut(at(t, 2.8, 1.6));
    const shake = flood * 2.0;
    ctx.save();
    ctx.translate(Math.sin(t * 33) * shake, Math.cos(t * 41) * shake * 0.5);

    backdrop(ctx, t, { glowColor: "rgba(255,93,71,0.10)", gx: 0.78, gy: 0.3, gridStep: 90 });
    label(ctx, "一个人，和一万人", 120, 185, { size: 20, color: C.amber });

    txt(ctx, "1", 120, 370, { size: 140, family: "mono", weight: 700, color: C.paper, spacing: -6 });
    txt(ctx, "个人提问，很简单。", 260, 340, { size: 36, color: C.mute, spacing: 1 });
    txt(ctx, "真的吗？", 260, 392, { size: 40, weight: 600, color: C.lime, spacing: 1, alpha: at(t, 2.0, 0.4) });

    const n = Math.round(1 + 9999 * easeOut(at(t, 3.0, 1.4)));
    txt(ctx, n.toLocaleString("en-US"), 1040, 370, {
      size: 126, family: "mono", weight: 700, color: flood > 0.25 ? C.red : C.paper, spacing: -5,
    });
    txt(ctx, "个请求，同时到达", 1050, 416, { size: 28, color: C.mute, spacing: 1 });
    txt(ctx, "（示意）", 1050, 450, { size: 15, family: "mono", color: C.dim, spacing: 2 });

    // queue
    txt(ctx, "排队", 120, 500, { size: 16, family: "mono", color: C.mute, spacing: 3 });
    rule(ctx, 120, 766, 650, 766, C.line, 1);
    for (let c = 0; c < 8; c++) {
      const x = 126 + c * 64;
      const filled = Math.round(11 * clamp(flood * (0.55 + ((c * 13) % 8) / 12)));
      for (let r = 0; r < 11; r++) {
        const on = r < filled;
        const hot = on && (r + c) % 8 === 0;
        ctx.save();
        ctx.globalAlpha = on ? 0.9 : 0.12;
        ctx.fillStyle = hot ? C.red : on ? C.lime : C.dim;
        ctx.beginPath();
        ctx.roundRect(x, 748 - r * 24, 42, 16, 3);
        ctx.fill();
        ctx.restore();
      }
    }

    // gpu array
    txt(ctx, "GPU 池", 1200, 500, { size: 16, family: "mono", color: C.mute, spacing: 3 });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const i = r * 6 + c;
        const on = t > 0.2 + i * 0.025;
        const hot = i === 2 || i === 9 || i === 17;
        const heat = on ? clamp(0.12 + flood * (hot ? 0.72 : 0.24 + 0.12 * Math.abs(Math.sin(t * 1.7 + i)))) : 0;
        gpu(ctx, 1236 + c * 76, 520 + r * 68, 58, 58, { heat, alpha: on ? 1 : 0.2 });
      }
    }
    txt(ctx, flood > 0.7 ? "有的过载，有的闲着" : "还够用", 1600, 812, {
      size: 18, color: flood > 0.7 ? C.red : C.mute, align: "center", spacing: 1,
    });

    const sp = at(t, 6.0, 0.4);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      txt(ctx, "这，就是调度战争。", 120, 842, { size: 48, weight: 700, color: C.paper, spacing: 1 });
      rule(ctx, 120, 862, 120 + 520 * sp, 862, C.red, 4);
      ctx.restore();
    }

    const qs = [
      { at: 7.3, q: "先算谁？", sub: "请求要排队，顺序就是体验", color: C.amber },
      { at: 8.6, q: "显存怎么分？", sub: "装不下，就得等", color: C.cyan },
      { at: 9.9, q: "哪张卡闲着？", sub: "闲一张，就是浪费一张", color: C.red },
    ];
    qs.forEach((item, i) => {
      const p = at(t, item.at, 0.35);
      if (p <= 0) return;
      const x = 120 + i * 560;
      const y = 890;
      ctx.save();
      ctx.globalAlpha = p;
      rect(ctx, x - (1 - p) * 20, y, 520, 84, "rgba(10,16,17,0.9)", 8);
      outline(ctx, x - (1 - p) * 20, y, 520, 84, item.color, 1.5, 8);
      txt(ctx, `0${i + 1}`, x + 18, y + 34, { size: 16, family: "mono", color: item.color, weight: 700, spacing: 1 });
      txt(ctx, item.q, x + 62, y + 52, { size: 32, weight: 600, color: C.paper, spacing: 0.5 });
      txt(ctx, item.sub, x + 62, y + 76, { size: 16, color: C.mute, spacing: 0.5 });
      ctx.restore();
    });

    ctx.restore();
  },
};
