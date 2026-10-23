import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile } from "remotion";
import { Spark, Whale } from "../art";
import { useBeatFrame } from "../kit";
import { FPB } from "../timing";
import { At, Badge, Chroma, CL, EBACK, EIO, EO, In, Kinetic, lerp, Note, progAt, Shockwave } from "../fx";
import { FONT, K, M, ModelKey } from "../theme3";

const TIME = K.time;

// ───────── Today: the answer, and what it rests on ─────────

export const Today: React.FC = () => (
  <AbsoluteFill>
    <Shockwave at={0.6} color={K.green} size={1800} />
    <At x={960} y={330} center>
      <Kinetic at={0} size={56} weight={700} parts={["所以，", { t: "今天", c: K.gold }, "的答案是："]} />
    </At>
    <At x={960} y={520} center>
      <Chroma at={0.6} amount={16}>
        <In at={0.6} from="slam" dur={0.5}>
          <div style={{ fontFamily: FONT, fontSize: 124, fontWeight: 900, letterSpacing: -3, whiteSpace: "nowrap" }}>
            最聪明的 AI，反而<span style={{ color: K.green }}>最便宜</span>
          </div>
        </In>
      </Chroma>
    </At>
    <At x={960} y={690} center>
      <In at={1.8}>
        <div style={{ fontSize: 38, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>前提：包月用满 · 算上你的时间</div>
      </In>
    </At>
    <At x={330} y={880} center>
      <In at={1.2} from="left">
        <Spark size={160} mood="party" />
      </In>
    </At>
    <At x={1590} y={880} center>
      <In at={1.5} from="right">
        <Whale size={190} mood="sweat" />
      </In>
    </At>
  </AbsoluteFill>
);

// ───────── Future: why today's answer won't last ─────────

const A_AT = 2.4; // cheaper every year
const B_AT = 8.4; // usage up a thousandfold
const C_AT = 14; // the ranking keeps changing

const TAGS = [
  { when: "今年", v: "¥100", s: 1, at: A_AT + 0.8 },
  { when: "明年", v: "约 ¥7.7", s: 0.7, at: A_AT + 1.8 },
  { when: "后年", v: "约 ¥0.6", s: 0.5, at: A_AT + 2.8 },
];

const USE = [
  { when: "2024 年初", v: "1,000 亿", h: 4, at: B_AT + 0.8 },
  { when: "2025 年底", v: "100 万亿", h: 429, at: B_AT + 1.4 },
  { when: "2026 年 3 月", v: "超 140 万亿", h: 600, at: B_AT + 2.0 },
];

const RANK: ModelKey[] = ["opus", "dsflash", "sol", "argon", "qwen", "kimi"];
// Successive orders (model index per slot) for the shuffle.
const ORDERS = [
  [0, 1, 2, 3, 4, 5],
  [2, 4, 0, 5, 1, 3],
  [5, 0, 3, 1, 2, 4],
  [1, 3, 5, 2, 4, 0],
];
const SHUFFLE = [C_AT + 1.2, C_AT + 2.6, C_AT + 4];

export const Future: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const showA = progAt(frame, A_AT, 0.5) * (1 - progAt(frame, B_AT - 0.4, 0.4));
  const showB = progAt(frame, B_AT, 0.5) * (1 - progAt(frame, C_AT - 0.4, 0.4));
  const showC = progAt(frame, C_AT, 0.5);
  // Slot of each model: springs from one order to the next.
  // What a rank row shows: the model in that slot and how far the row has flipped (-90°…90°).
  const rowAt = (slot: number) => {
    let k = 0;
    let p = 0;
    SHUFFLE.forEach((at, i) => {
      const q = progAt(frame, at + slot * 0.08, 0.6, EIO);
      if (q > 0) {
        k = i;
        p = q;
      }
    });
    const m = RANK[p < 0.5 ? ORDERS[k][slot] : ORDERS[Math.min(k + 1, ORDERS.length - 1)][slot]];
    return { m, angle: p < 0.5 ? p * 180 : (p - 1) * 180 };
  };
  return (
    <AbsoluteFill>
      <At x={960} y={520} center>
        <Kinetic at={0} out={A_AT - 0.5} size={110} parts={["但这只是", { t: "今天", c: K.gold }, "的答案"]} />
      </At>

      {/* A. the same intelligence gets about 13× cheaper a year */}
      {showA > 0 ? (
        <AbsoluteFill style={{ opacity: showA }}>
          <At x={960} y={170} center>
            <Kinetic at={A_AT} size={76} parts={["同样聪明的 AI，", { t: "每年便宜约 13 倍", c: K.green }]} />
          </At>
          {TAGS.map((t, i) => {
            const p = progAt(frame, t.at, 0.6, EBACK);
            const c = i === 0 ? K.claude : K.green;
            return (
              <React.Fragment key={t.when}>
                <At x={420 + i * 540} y={540} center>
                  <div style={{ opacity: Math.min(1, p * 2), transform: `scale(${t.s * (0.6 + 0.4 * p)})`, textAlign: "center" }}>
                    <div style={{ padding: "26px 46px", borderRadius: 24, border: `4px solid ${c}`, background: `${c}1a`, boxShadow: `0 0 50px ${c}33` }}>
                      <div style={{ fontSize: 40, fontWeight: 700, color: K.muted }}>{t.when}</div>
                      <div style={{ fontSize: 110, fontWeight: 900, color: i === 0 ? K.claudeHi : K.green, whiteSpace: "nowrap", letterSpacing: -3 }}>{t.v}</div>
                    </div>
                  </div>
                </At>
                {i > 0 ? (
                  <At x={420 + i * 540 - 270} y={540} center>
                    <div style={{ opacity: progAt(frame, t.at - 0.3, 0.4), fontSize: 52, fontWeight: 900, color: K.green, whiteSpace: "nowrap" }}>÷ 13</div>
                  </At>
                ) : null}
              </React.Fragment>
            );
          })}
          <At x={960} y={800} center>
            <In at={A_AT + 3.4}>
              <div style={{ fontSize: 38, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>今天花 ¥100 的活，照这个速度，后年只要几毛钱</div>
            </In>
          </At>
          <Note>Epoch AI《The plunging price of thought》（2026-09）：做到同一水平的花费（含用掉的 token），2023 年以来每年降约 13 倍 · 往后按同样速度推算</Note>
        </AbsoluteFill>
      ) : null}

      {/* B. daily token use in China, up more than a thousandfold in two years */}
      {showB > 0 ? (
        <AbsoluteFill style={{ opacity: showB }}>
          <Rising t={b - B_AT} />
          <At x={960} y={170} center>
            <Kinetic at={B_AT} size={76} parts={["中国每天用掉的 token，", { t: "两年涨了 1,000 多倍", c: K.gold }]} />
          </At>
          {USE.map((u, i) => {
            const p = progAt(frame, u.at, 1, EO);
            const x = 560 + i * 400;
            const h = Math.max(4, u.h * p);
            return (
              <React.Fragment key={u.when}>
                <div style={{ position: "absolute", left: x - 110, top: 900 - h, width: 220, height: h, borderRadius: "14px 14px 4px 4px", background: `linear-gradient(180deg, ${K.gold}, ${K.claude})`, boxShadow: `0 0 60px ${K.gold}44`, opacity: Math.min(1, p * 3) }} />
                <At x={x} y={900 - h - 44} center>
                  <div style={{ opacity: p, fontSize: i === 2 ? 56 : 44, fontWeight: 900, color: i === 0 ? K.fg : K.gold, whiteSpace: "nowrap" }}>{u.v}</div>
                </At>
                <At x={x} y={940} center>
                  <div style={{ opacity: Math.min(1, p * 2), fontSize: 30, fontWeight: 700, color: K.muted, whiteSpace: "nowrap" }}>{u.when}</div>
                </At>
              </React.Fragment>
            );
          })}
          <Note>国家数据局（2026-03-24 国新办发布会）：全国日均 token 调用量，2024 年初约 1,000 亿，2025 年底 100 万亿，2026 年 3 月超 140 万亿</Note>
        </AbsoluteFill>
      ) : null}

      {/* C. who is cheapest and who is smartest keeps changing */}
      {showC > 0 ? (
        <AbsoluteFill style={{ opacity: showC }}>
          <At x={960} y={170} center>
            <Kinetic at={C_AT} size={76} parts={["明年谁最便宜、谁最聪明，", { t: "可能都换了", c: K.gold }]} />
          </At>
          {[0, 1, 2, 3, 4, 5].map((slot) => (
            <At key={slot} x={610} y={340 + slot * 104} center>
              <div style={{ fontSize: 40, fontWeight: 900, color: slot === 0 ? K.gold : K.dim, opacity: progAt(frame, C_AT + 0.3, 0.5) }}>#{slot + 1}</div>
            </At>
          ))}
          {[0, 1, 2, 3, 4, 5].map((slot) => {
            const row = rowAt(slot);
            const y = 340 + slot * 104;
            const p = progAt(frame, C_AT + 0.3 + slot * 0.12, 0.6, EO);
            return (
              <div key={slot} style={{ position: "absolute", left: 690, top: y - 42, height: 84, width: 640, opacity: p, transform: `translateX(${(1 - p) * 80}px)`, perspective: 600 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 22, height: 84, transform: `rotateX(${row.angle}deg)`, transformOrigin: "50% 50%" }}>
                  <Badge m={row.m} size={64} />
                  <span style={{ fontFamily: FONT, fontSize: 42, fontWeight: 900, whiteSpace: "nowrap", color: K.fg }}>{M[row.m].name}</span>
                </div>
              </div>
            );
          })}
          <At x={1420} y={340} center>
            <In at={C_AT + 1.2} from="scale">
              <div style={{ fontSize: 120, fontWeight: 900, color: K.gold }}>？</div>
            </In>
          </At>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// Token particles rising behind the usage bars.
const Rising: React.FC<{ t: number }> = ({ t }) => {
  const frame = useBeatFrame();
  if (t < 0) return null;
  const n = Math.round(interpolate(t, [0, 4], [30, 220], CL));
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const sp = 3 + random(`rv${i}`) * 9;
        const x = random(`rx${i}`) * 1920;
        const y = 1100 - ((random(`ry${i}`) * 1200 + frame * sp) % 1200);
        const s = 5 + random(`rs${i}`) * 10;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: s, height: s, borderRadius: 2, background: [K.gold, K.claude, K.deepseek, K.fg][i % 4], opacity: 0.12 + random(`ro${i}`) * 0.25 }} />;
      })}
    </>
  );
};

// ───────── Collapse: whoever is cheapest, the line that stays is yours ─────────

// Opus's bill from the chapter before (token ¥346, your time ¥1,610), with tokens 13× cheaper each year.
const YEARS = [
  { when: "今年", token: 346, share: "82%" },
  { when: "明年", token: 26.6, share: "98%" },
  { when: "后年", token: 2, share: "99.9%" },
];
const STEP = [1, 2.8, 4.6];
const BAR_X = 470;
const PX = 0.56;

export const Collapse: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  let k = 0;
  STEP.forEach((at, i) => {
    if (b >= at) k = i;
  });
  let token = YEARS[0].token;
  STEP.forEach((at, i) => {
    if (i > 0) token = lerp(token, YEARS[i].token, progAt(frame, at, 0.7, EIO));
  });
  const enter = progAt(frame, 0.6, 1, EO);
  const tw = token * PX * enter;
  const pw = 1610 * PX * enter;
  const yearIn = progAt(frame, STEP[k], 0.4, EO);
  return (
    <AbsoluteFill>
      <At x={960} y={200} center>
        <Kinetic at={0} size={80} parts={["可不管谁最便宜——"]} />
      </At>
      <At x={300} y={500} center>
        <div style={{ opacity: enter, fontSize: 60, fontWeight: 900, color: K.gold, transform: `translateY(${(1 - yearIn) * 30}px)`, whiteSpace: "nowrap" }}>{YEARS[k].when}</div>
      </At>
      <div style={{ position: "absolute", left: BAR_X, top: 445, height: 110, width: tw, background: `linear-gradient(90deg, ${K.claude}99, ${K.claude})`, borderRadius: "14px 0 0 14px", opacity: enter }} />
      <div style={{ position: "absolute", left: BAR_X + tw, top: 445, height: 110, width: pw, background: `linear-gradient(90deg, ${TIME}aa, ${TIME})`, borderRadius: tw < 4 ? 14 : "0 14px 14px 0", boxShadow: `0 0 50px ${TIME}66`, opacity: enter, display: "flex", alignItems: "center", paddingLeft: 26, boxSizing: "border-box" }}>
        <span style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: "#120A22", whiteSpace: "nowrap" }}>你的时间</span>
      </div>
      <At x={BAR_X + 6} y={432}>
        <div style={{ opacity: enter * (token > 5 ? 1 : 0.55), fontSize: 30, fontWeight: 900, color: K.claudeHi, whiteSpace: "nowrap", transform: "translateY(-100%)" }}>token</div>
      </At>
      <At x={BAR_X + tw + pw + 40} y={500}>
        <div style={{ opacity: enter, transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.muted }}>你的时间占账单</div>
          <div style={{ fontSize: 72, fontWeight: 900, color: K.timeHi }}>{YEARS[k].share}</div>
        </div>
      </At>
      <At x={960} y={790} center>
        <Chroma at={7} amount={14}>
          <In at={7} from="slam" dur={0.5}>
            <div style={{ fontFamily: FONT, fontSize: 104, fontWeight: 900, whiteSpace: "nowrap", letterSpacing: -2 }}>
              AI 越便宜，<span style={{ color: K.timeHi, textShadow: `0 0 50px ${TIME}88` }}>你的时间</span>越贵
            </div>
          </In>
        </Chroma>
      </At>
      <Note>以上面 Opus 的账单为例：你的时间不变，token 按每年便宜 13 倍推算</Note>
    </AbsoluteFill>
  );
};

// ───────── Scarce: tokens multiply, your time doesn't ─────────

const Hourglass: React.FC<{ p: number }> = ({ p }) => {
  const top = 1 - p;
  return (
    <svg width={300} height={420} viewBox="0 0 300 420" style={{ overflow: "visible" }}>
      <defs>
        <clipPath id="hg-top">
          <path d="M40 30 L260 30 C260 120 175 170 155 205 L145 205 C125 170 40 120 40 30 Z" />
        </clipPath>
        <clipPath id="hg-bot">
          <path d="M145 215 L155 215 C175 250 260 300 260 390 L40 390 C40 300 125 250 145 215 Z" />
        </clipPath>
      </defs>
      <rect x={20} y={10} width={260} height={20} rx={8} fill="rgba(255,255,255,0.75)" />
      <rect x={20} y={390} width={260} height={20} rx={8} fill="rgba(255,255,255,0.75)" />
      <rect x={40} y={205 - 175 * top} width={220} height={175 * top} fill={TIME} clipPath="url(#hg-top)" />
      <rect x={40} y={390 - 175 * p} width={220} height={175 * p} fill={TIME} clipPath="url(#hg-bot)" />
      {p > 0 && p < 1 ? <rect x={147} y={205} width={6} height={185 - 175 * p} fill={TIME} opacity={0.9} /> : null}
      <path
        d="M40 30 L260 30 C260 120 175 170 155 210 C175 250 260 300 260 390 L40 390 C40 300 125 250 145 210 C125 170 40 120 40 30 Z"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.7)"
        strokeWidth={5}
      />
    </svg>
  );
};

const TOKEN_COLORS = [K.claude, K.gold, K.deepseek, K.fg, K.green];

export const Scarce: React.FC = () => {
  const frame = useBeatFrame();
  const b = frame / FPB;
  const n = Math.round(interpolate(b, [0, 6], [60, 260], CL));
  const sand = progAt(frame, 0, 12, (t) => t);
  return (
    <AbsoluteFill>
      {Array.from({ length: n }).map((_, i) => {
        const speed = 4 + random(`v${i}`) * 14;
        const size = 6 + random(`s${i}`) * 14;
        const y = random(`y${i}`) * 1080;
        const x = ((random(`x${i}`) * 2200 + frame * speed) % 2200) - 140;
        // Tokens part around the hourglass instead of crossing it.
        const dx = x - 960;
        const dy = y - 560;
        const push = Math.max(0, 1 - Math.hypot(dx / 260, dy / 300));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y + Math.sign(dy || 1) * push * 220,
              width: size,
              height: size,
              borderRadius: 3,
              background: TOKEN_COLORS[i % TOKEN_COLORS.length],
              opacity: 0.18 + random(`o${i}`) * 0.3,
            }}
          />
        );
      })}
      <At x={960} y={560} center>
        <In at={0.5} from="scale">
          <Hourglass p={sand} />
        </In>
      </At>
      <At x={960} y={170} center>
        <Kinetic at={0} out={3.6} size={84} parts={["token 会越来越", { t: "多", c: K.gold }]} />
      </At>
      <At x={960} y={170} center>
        <Kinetic at={4} size={84} parts={["唯一不会变多的——"]} />
      </At>
      <At x={960} y={900} center>
        <Chroma at={6}>
          <In at={6} from="slam" dur={0.5}>
            <div style={{ fontFamily: FONT, fontSize: 132, fontWeight: 900, color: TIME, whiteSpace: "nowrap", textShadow: `0 0 60px ${TIME}88` }}>是你的时间</div>
          </In>
        </Chroma>
      </At>
    </AbsoluteFill>
  );
};

// ───────── Brand outro: "AI 的真实价格" rolls into "世界的形状" ─────────

const SIZE = 190;
const FLIP = 3;

// One slot of the title: `from` rolls up and out, `to` rolls in from below.
const Slot: React.FC<{ from: string; to: string; wFrom: number; wTo: number; q: number }> = ({ from, to, wFrom, wTo, q }) => (
  <span style={{ display: "inline-block", position: "relative", width: lerp(wFrom, wTo, q), height: SIZE * 1.2, overflow: "hidden", verticalAlign: "top" }}>
    <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: -q * SIZE * 1.3 }}>{from}</span>
    <span style={{ position: "absolute", left: 0, right: 0, textAlign: "center", top: (1 - q) * SIZE * 1.3 }}>{to}</span>
  </span>
);

export const BrandOutro: React.FC = () => {
  const frame = useBeatFrame();
  const settle = progAt(frame, 0, 1.2, EO);
  const q1 = progAt(frame, FLIP, 0.9, EIO);
  const q2 = progAt(frame, FLIP + 0.25, 0.9, EIO);
  const mark = progAt(frame, FLIP + 0.9, 1.6, EBACK);
  const glow = Math.max(0, 1 - (frame - (FLIP + 0.9) * FPB) / 18);
  const ruleW = lerp(SIZE * 6.2, SIZE * 4.9, q2) * progAt(frame, 0.4, 1, EO);
  const subOut = 1 - progAt(frame, FLIP - 0.5, 0.4);
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <At x={960} y={300} center>
          <div style={{ position: "relative", width: 230, height: 230 }}>
            <div style={{ position: "absolute", inset: -170, borderRadius: "50%", background: `radial-gradient(circle, ${K.gold}${Math.round(glow * 90).toString(16).padStart(2, "0")} 0%, transparent 60%)` }} />
            <div style={{ position: "absolute", inset: -6, borderRadius: "50%", boxShadow: "0 0 0 2px rgba(245,242,235,0.35), 0 0 40px rgba(245,242,235,0.12)", opacity: Math.min(1, mark * 1.6), transform: `scale(${0.55 + 0.45 * mark})` }} />
            <Img
              src={staticFile("mark-disc.png")}
              style={{ width: 230, height: 230, borderRadius: "50%", opacity: Math.min(1, mark * 1.6), transform: `translateY(${(1 - Math.min(1, mark)) * -120}px) scale(${0.55 + 0.45 * mark})` }}
            />
          </div>
        </At>
      ) : null}
      <At x={960} y={590} center>
        <div style={{ transform: `scale(${1.15 - 0.15 * settle})`, opacity: settle, fontFamily: FONT, fontSize: SIZE, fontWeight: 900, letterSpacing: -4, whiteSpace: "nowrap", lineHeight: 1.2, display: "flex" }}>
          <Slot from="AI" to="世界" wFrom={SIZE * 1.35} wTo={SIZE * 2} q={q1} />
          <span>的</span>
          <Slot from="真实价格" to="形状" wFrom={SIZE * 4} wTo={SIZE * 2} q={q2} />
        </div>
      </At>
      <div style={{ position: "absolute", left: 960 - ruleW / 2, top: 720, width: ruleW, height: 10, borderRadius: 5, background: `linear-gradient(90deg, ${K.claude}, ${K.gold})` }} />
      <At x={960} y={800} center>
        <In at={1.5}>
          <div style={{ opacity: subOut, fontSize: 34, fontWeight: 500, color: K.muted, whiteSpace: "nowrap" }}>数据截至 2026 年 10 月 23 日 · 来源见视频简介</div>
        </In>
      </At>
      <At x={960} y={810} center>
        <In at={FLIP + 1.5}>
          <div style={{ fontSize: 56, fontWeight: 900, whiteSpace: "nowrap" }}>看见世界如何运行</div>
        </In>
      </At>
      <At x={960} y={925} center>
        <In at={FLIP + 2}>
          <div style={{ fontSize: 38, fontWeight: 700, color: K.muted, letterSpacing: 3, whiteSpace: "nowrap" }}>MakerJackie</div>
        </In>
      </At>
    </AbsoluteFill>
  );
};
