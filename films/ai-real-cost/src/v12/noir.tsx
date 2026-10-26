// v12 kit: the 暗调电影感 (noir) look from the style library (style-library/styles/noir), made our own.
// The texture behind everything is a wall of the AI's own streamed answer: every character is a token, and tokens
// are what the film is pricing. Text decodes in like evidence; comparisons are thin glowing token streams.
import React, { CSSProperties, useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender, Easing } from "remotion";
import { FONT, MONO } from "../v10/theme";

export { FONT, MONO };

export const N = {
  bg: "#0d0e10",
  ink: "#f2f2f2",
  sub: "#c9ccd2",
  dim: "#7d838d",
  gold: "#f2c35c",
  claude: "#ff7a45",
  chatgpt: "#3fd0b0",
  kimi: "#a78bff",
  glm: "#43c6f0",
  deepseek: "#3d8bff",
};

export const EO = Easing.bezier(0.16, 1, 0.3, 1);
export const EIO = Easing.bezier(0.65, 0, 0.35, 1);
export const ES = Easing.bezier(0.45, 0, 0.55, 1);
export const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** progress of x through [a, z], eased */
export const ramp = (x: number, a: number, z: number, e: (v: number) => number = EIO) => e(clamp01((x - a) / (z - a)));

export const hash = (a: number, b = 0, c = 0) => {
  let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263) ^ Math.imul(c | 0, 1440670441);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
const rgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export const glow = (c: string, k = 1) =>
  `0 0 ${4 * k}px ${rgba(c, 0.9)}, 0 0 ${14 * k}px ${rgba(c, 0.7)}, 0 0 ${40 * k}px ${rgba(c, 0.45)}`;

// ---------- glyph pools for the decode scramble ----------

export const CJK_POOL =
  "的一是在不了有和人这中大为上个国我以要他时来用们生到作地于出就分对成会可主发年动同工也能下过子说产种面而方后多定行学法所民得经十三之进着等部度家电力里如水化高自二理起小物现实加量都两体制机当使点从业本去把性好应开它合还因由其些然前外天政四日那社义事平形相全表间样与关各重新线内数正心反你明看原又么利比或但质气第向道命此变条只没结解问意建月公无系军很情者最立代想已通并提直题党程展五果料象员革位入常文总次品式活设及管特件长求老头基资边流路级少图山统接知较将组见计别她手角期根论运农指几九区强放决西被干做必战先回则任取据处理";
const LATIN_POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$#%&@";
const isCJK = (c: string) => /[　-鿿＀-￯]/.test(c);
export const scramble = (c: string, i: number, t: number, salt = 0) => {
  const pool = isCJK(c) ? CJK_POOL : LATIN_POOL;
  return pool[Math.floor(hash(i, Math.floor(t * 15), salt) * pool.length)];
};

/** Holds the render until every glyph we will draw is loaded, so no frame shows a fallback font. */
export const useFonts = (specs: string[], text: string) => {
  const [h] = useState(() => delayRender("noir fonts"));
  useLayoutEffect(() => {
    Promise.all(specs.map((s) => document.fonts.load(s, text)))
      .catch(() => undefined)
      .then(() => continueRender(h));
  }, [h]); // eslint-disable-line react-hooks/exhaustive-deps
};

// ---------- decode text ----------

type DecodeProps = {
  text: string;
  t: number;
  start: number;
  cps?: number;
  end?: number;
  ecps?: number;
  style?: CSSProperties;
  /** per-character style, e.g. to colour one word */
  charStyle?: (i: number) => CSSProperties | undefined;
  salt?: number;
};

/** Text that types in left to right with a blurred scrambling leading edge, and erases the same way. */
export const Decode: React.FC<DecodeProps> = ({ text, t, start, cps = 16, end, ecps = 40, style, charStyle, salt = 0 }) => {
  if (t < start - 0.01) return null;
  const chars = [...text];
  const lead = 2;
  return (
    <span style={{ whiteSpace: "pre", ...style }}>
      {chars.map((c, i) => {
        const shownAt = start + i / cps;
        const goneAt = end === undefined ? Infinity : end + i / ecps;
        const cs = charStyle?.(i);
        const base: CSSProperties = { display: "inline-block", ...cs };
        if (c === " ") return <span key={i} style={base}>{" "}</span>;
        let k = -1; // 0 = solid, >0 = scrambling (1 nearest the edge), -1 = hidden
        if (t >= shownAt && t < goneAt) k = 0;
        else if (t < shownAt && shownAt - t < lead / cps) k = Math.ceil((shownAt - t) * cps);
        else if (t >= goneAt && t - goneAt < lead / ecps) k = Math.ceil((t - goneAt) * ecps);
        if (k === 0) return <span key={i} style={base}>{c}</span>;
        if (k < 0) return <span key={i} style={{ ...base, visibility: "hidden" }}>{c}</span>;
        return (
          <span key={i} style={{ position: "relative", ...base }}>
            <span style={{ visibility: "hidden" }}>{c}</span>
            <span style={{ position: "absolute", left: 0, top: 0, filter: `blur(${1.5 + k * 1.5}px)`, opacity: 1 - (k - 1) * 0.35 }}>
              {scramble(c, i, t, salt)}
            </span>
          </span>
        );
      })}
    </span>
  );
};

// ---------- the token wall ----------

export const WALL_TEXT =
  "好的，以下是本季度工作总结。一、整体情况：本季度团队围绕成本优化与产品交付两条主线推进，完成核心版本三次迭代，用户留存率提升百分之六，单位获客成本下降百分之十二。二、成本分析：云服务支出占总成本的百分之三十八，其中模型调用费用增长最快，主要来自客服自动回复和文档生成两个场景。建议对低价值请求改用小模型，对高价值任务保留大模型，并通过缓存重复问题降低调用次数。三、主要成果：上线智能客服，平均响应时间从四分钟缩短到二十秒；完成数据看板重构，周报生成时间从半天缩短到十分钟；与三家供应商重新谈判，年度合同金额下降百分之九。四、存在问题：部分需求评估不足导致返工，测试覆盖率仍低于目标，跨部门沟通链条偏长。五、下季度计划：一是建立模型调用的成本监控，按场景核算每次任务的真实花费；二是推进自动化测试，把覆盖率提升到百分之八十；三是优化需求评审流程，减少返工；四是开展两次用户访谈，验证新功能方向。六、风险提示：模型价格变化较快，需每月复核供应商报价，避免锁定在过时的套餐上。以上是本季度总结，如需调整格式或补充数据，请告诉我。";
export const PROMPT_TEXT = "› 帮我写一份季度总结，重点讲成本";

export const CELL_W = 27;
export const CELL_H = 36;
const COLS = 78;
const ROWS = 34;
const OX = -80; // wall origin in screen px at camera scale 1, centre (960, 540)
const OY = -40;
const STREAM_ROW = 2; // the answer starts two rows under the prompt

export type Light = { x: number; y: number; r: number; color: string; a: number };
export type WallProps = {
  t: number;
  /** prompt characters typed so far */
  typed: number;
  /** answer cells revealed so far (reading order) */
  revealed: number;
  cam: { x: number; y: number; s: number };
  lights: Light[];
  /** brightness of the resting wall, 0..1 */
  level: number;
  blur?: number;
  hblur?: number;
};

/** Wall position (cell centre) of a cell in reading order. */
export const cellPos = (i: number) => {
  const row = STREAM_ROW + Math.floor(i / (COLS - 4));
  const col = 2 + (i % (COLS - 4));
  return { x: OX + col * CELL_W + CELL_W / 2, y: OY + row * CELL_H + CELL_H / 2 };
};
export const WALL_CELLS = (COLS - 4) * (ROWS - STREAM_ROW);

export const Wall: React.FC<WallProps> = ({ t, typed, revealed, cam, lights, level, blur = 0, hblur = 0 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const lit = lights.map((l) => ({ ...l, c: rgb(l.color) }));
  useLayoutEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d")!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, 1920, 1080);
    const s = cam.s;
    const toScreen = (x: number, y: number) => [(x - cam.x) * s + 960, (y - cam.y) * s + 540];
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.font = `500 ${Math.round(23 * s)}px ${FONT}`;
    const base: [number, number, number] = [188, 194, 204];
    const draw = (ch: string, wx: number, wy: number, b: number, idx: number) => {
      const [sx, sy] = toScreen(wx, wy);
      if (sx < -40 || sx > 1960 || sy < -40 || sy > 1120) return;
      let [r, gg, bb] = base;
      let bright = b;
      for (const l of lit) {
        const d = Math.hypot(sx - l.x, sy - l.y);
        if (d > l.r) continue;
        const w = (1 - d / l.r) ** 1.6 * l.a;
        r = lerp(r, l.c[0], Math.min(1, w * 1.6));
        gg = lerp(gg, l.c[1], Math.min(1, w * 1.6));
        bb = lerp(bb, l.c[2], Math.min(1, w * 1.6));
        bright += w * 0.5;
      }
      // a few cells flare now and then, like LEMMiNO's living ciphertext
      if (hash(idx, Math.floor(t * 5), 7) > 0.988) bright += 0.22;
      g.fillStyle = `rgba(${r | 0},${gg | 0},${bb | 0},${clamp01(bright)})`;
      g.fillText(ch, sx, sy);
    };
    // prompt row
    const p = [...PROMPT_TEXT];
    for (let i = 0; i < Math.min(typed, p.length); i++) draw(p[i], OX + (2 + i) * CELL_W + CELL_W / 2, OY + CELL_H / 2, 0.92, -1 - i);
    // answer cells
    const n = Math.min(Math.floor(revealed), WALL_CELLS);
    const txt = WALL_TEXT;
    for (let i = 0; i < n; i++) {
      const { x, y } = cellPos(i);
      const age = revealed - i;
      const fresh = clamp01(1 - age / 60);
      draw(txt[i % txt.length], x, y, level * (0.24 + hash(i, 3) * 0.1) + fresh * 0.7, i);
    }
    // cursor: after the prompt while typing, then at the head of the stream
    const blink = Math.floor(t * 2.2) % 2 === 0;
    if (blink || revealed > 0) {
      const head = revealed > 0 && revealed < WALL_CELLS ? cellPos(n) : typed > 0 && revealed <= 0 ? { x: OX + (2 + typed) * CELL_W + CELL_W / 2, y: OY + CELL_H / 2 } : null;
      if (head) {
        const [sx, sy] = toScreen(head.x, head.y);
        g.fillStyle = "rgba(242,242,242,0.9)";
        g.fillRect(sx - 9 * s, sy - 13 * s, 18 * s, 26 * s);
      }
    }
  });
  const filters = [blur > 0.05 ? `blur(${blur}px)` : "", hblur > 0.5 ? "url(#wall-hblur)" : ""].join(" ").trim();
  return (
    <>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <defs>
          <filter id="wall-hblur" x="-10%" y="0" width="120%" height="100%">
            <feGaussianBlur stdDeviation={`${hblur} 0`} />
          </filter>
        </defs>
      </svg>
      <canvas ref={ref} width={1920} height={1080} style={{ position: "absolute", inset: 0, filter: filters || undefined }} />
    </>
  );
};

// ---------- film texture ----------

export const Grain: React.FC<{ frame: number; amount?: number }> = ({ frame, amount = 0.07 }) => (
  <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, opacity: amount, mixBlendMode: "screen", pointerEvents: "none" }}>
    <filter id="noir-grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={frame % 97} />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noir-grain)" />
  </svg>
);

export const Vignette: React.FC<{ k?: number }> = ({ k = 1 }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      background: `radial-gradient(ellipse 75% 70% at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,${0.62 * k}) 100%)`,
    }}
  />
);

// ---------- a token stream line ----------

type LineProps = { t: number; y: number; x0: number; len: number; on: number; color: string; level: number; seed: number };

/** A thin line made of tiny flowing characters: its length is a price; it literally is tokens. */
export const TokenLine: React.FC<LineProps> = ({ t, y, x0, len, on, color, level, seed }) => {
  const L = Math.max(0, len * on);
  if (L <= 0.5) return null;
  const step = 17;
  const shift = (t * 46) % step;
  const n = Math.floor((L - shift) / step) + 1;
  return (
    <div style={{ position: "absolute", left: 0, top: 0 }}>
      <div
        style={{
          position: "absolute",
          left: x0,
          top: y - 2,
          width: L,
          height: 4,
          borderRadius: 2,
          background: `linear-gradient(90deg, ${rgba(color, 0.25 * level)}, ${rgba(color, 0.95 * level)})`,
          boxShadow: `0 0 14px ${rgba(color, 0.6 * level)}, 0 0 40px ${rgba(color, 0.3 * level)}`,
        }}
      />
      {Array.from({ length: n }, (_, k) => {
        const x = x0 + shift + k * step;
        if (x > x0 + L - 4) return null;
        const f = (x - x0) / Math.max(L, 1);
        const c = CJK_POOL[Math.floor(hash(seed, k - Math.floor((t * 46) / step), Math.floor(t * 6)) * CJK_POOL.length)];
        return (
          <span
            key={k}
            style={{
              position: "absolute",
              left: x,
              top: y - 30,
              fontFamily: FONT,
              fontWeight: 500,
              fontSize: 16,
              lineHeight: "20px",
              color: rgba(color, (0.35 + 0.65 * f) * level),
              textShadow: `0 0 8px ${rgba(color, 0.5 * level)}`,
              transform: "translateX(-50%)",
            }}
          >
            {c}
          </span>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: x0 + L - 5,
          top: y - 5,
          width: 10,
          height: 10,
          borderRadius: 5,
          background: "#fff",
          opacity: level,
          boxShadow: `0 0 10px ${color}, 0 0 26px ${color}, 0 0 60px ${rgba(color, 0.6)}`,
        }}
      />
    </div>
  );
};
