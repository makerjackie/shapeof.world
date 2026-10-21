import { C, W, H, txt, rule, rect, outline, at, easeOut, clamp, measure, token, glow, stamp } from "../lib/engine.js";
import { backdrop, label, gpu, flow, wire, bracketBox } from "../lib/parts.js";

export default {
  id: "war",
  draw(ctx, t) {
    const flood = easeOut(at(t, 1.6, 1.4));
    const shake = flood * 2.2;
    ctx.save();
    ctx.translate(Math.sin(t * 37) * shake, Math.cos(t * 43) * shake * 0.6);

    backdrop(ctx, t, { glowColor: "rgba(255,93,71,0.10)", gx: 0.8, gy: 0.3, gridStep: 90 });
    label(ctx, "一个人，和一万人", 90, 210, { size: 20, color: C.amber });

    // left: the one
    txt(ctx, "1", 100, 390, { size: 156, family: "mono", weight: 700, color: C.paper, spacing: -6 });
    txt(ctx, "个人提问", 110, 442, { size: 28, color: C.mute, spacing: 2 });
    txt(ctx, "很简单", 110, 500, { size: 40, weight: 600, color: C.lime, spacing: 1 });

    // right: the flood
    const n = Math.round(1 + 9999 * easeOut(at(t, 1.75, 1.3)));
    const num = n.toLocaleString("en-US");
    txt(ctx, num, 560, 390, {
      size: fit(ctx, num, 420, 132), family: "mono", weight: 700, color: flood > 0.3 ? C.red : C.paper, spacing: -5,
    });
    txt(ctx, "个请求，一起到达", 566, 442, { size: 26, color: C.mute, spacing: 2 });
    txt(ctx, "（示意）", 566, 476, { size: 16, family: "mono", color: C.dim, spacing: 2 });

    // queues
    txt(ctx, "排队", 100, 560, { size: 17, family: "mono", color: C.mute, spacing: 3 });
    rule(ctx, 100, 1136, 520, 1136, C.line, 1);
    for (let c = 0; c < 8; c++) {
      const x = 106 + c * 52;
      const cap = 12;
      const filled = Math.round(cap * clamp(flood * (0.6 + ((c * 13) % 7) / 10)));
      for (let r = 0; r < cap; r++) {
        const on = r < filled;
        const hot = on && (r + c) % 7 === 0;
        ctx.save();
        ctx.globalAlpha = on ? 0.9 : 0.12;
        ctx.fillStyle = hot ? C.red : on ? C.lime : C.dim;
        ctx.beginPath();
        ctx.roundRect(x, 1112 - r * 27, 34, 18, 4);
        ctx.fill();
        ctx.restore();
      }
    }


    // gpu array
    txt(ctx, "GPU 池", 620, 560, { size: 17, family: "mono", color: C.mute, spacing: 3 });
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const i = r * 4 + c;
        const on = t > 0.6 + i * 0.04;
        const hot = i === 2 || i === 7 || i === 11;
        const heat = on ? clamp(0.15 + flood * (hot ? 0.7 : 0.22 + 0.12 * Math.abs(Math.sin(t * 1.8 + i)))) : 0;
        gpu(ctx, 620 + c * 86, 590 + r * 86, 70, 70, { heat, alpha: on ? 1 : 0.2 });
      }
    }
    txt(ctx, flood > 0.7 ? "有的过载，有的闲着" : "还够用", 790, 980, {
      size: 19, color: flood > 0.7 ? C.red : C.mute, align: "center", spacing: 1,
    });

    // big stamp
    const sp = at(t, 2.4, 0.35);
    if (sp > 0) {
      ctx.save();
      ctx.globalAlpha = sp;
      ctx.translate(720, 1162);
      ctx.rotate(-0.035);
      txt(ctx, "这，就是调度战争。", 0, 0, {
        size: 54, weight: 700, color: C.paper, align: "center", spacing: 1,
      });
      rule(ctx, -250, 20, 250, 20, C.red, 6, sp);
      ctx.restore();
    }

    // three questions, like console alerts
    const qs = [
      { at: 3.6, q: "先算谁？", sub: "请求要排队，顺序就是体验", y: 1245, color: C.amber },
      { at: 5.1, q: "显存怎么分？", sub: "显存 = 显卡的内存，装不下就得等", y: 1330, color: C.cyan },
      { at: 6.5, q: "哪张卡闲着？", sub: "闲一张，就是浪费一张", y: 1415, color: C.red },
    ];
    qs.forEach((item, i) => {
      const p = at(t, item.at, 0.35);
      if (p <= 0) return;
      ctx.save();
      ctx.globalAlpha = p;
      const x = 90 + (1 - p) * 40;
      rect(ctx, x, item.y, 900, 68, "rgba(10,16,17,0.9)", 8);
      outline(ctx, x, item.y, 900, 68, item.color, 1.5, 8);
      txt(ctx, String(i + 1).padStart(2, "0"), x + 20, item.y + 44, {
        size: 20, family: "mono", color: item.color, weight: 700, spacing: 1,
      });
      txt(ctx, item.q, x + 70, item.y + 44, { size: 32, weight: 600, color: C.paper, spacing: 1 });
      txt(ctx, item.sub, x + 360, item.y + 43, { size: 19, color: C.mute, spacing: 0.5 });
      ctx.restore();
    });

    ctx.restore();
  },
};

function fit(ctx, str, max, size) {
  let s = size;
  while (s > 40 && measure(ctx, str, s, { family: "mono", weight: 700, spacing: -5 }) > max) s -= 4;
  return s;
}
