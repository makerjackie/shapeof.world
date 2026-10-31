// Friday 20:14 and the weekend (FRIDAY → CUT). The chat, the lid closing, then the task board: a clock rail on the
// left, one step card at a time (障碍 → 它想 → 做了 → ✓), a pill per finished step along the bottom. Cards speed
// up with the music; the flood of ✓ at the peak; the cut.
import React from "react";
import { AbsoluteFill } from "remotion";
import { clamp01, EIO, EO, keys, lerp, ramp, SHADOW, useT } from "./kit";
import { FONT, K, MONO, NUM } from "./theme";
import { at, CUT, FRIDAY } from "./time";
import { AiBubble, ChatWindow, Check, Label, Num, Orb, rng, Type, UserBubble } from "./ui";

const B1 = (tt: number) => at("B1", tt);
const B2 = (tt: number) => at("B2", tt);

export const SENTENCE = "帮我把旅行 App 做完。周一上线，预算就这么多。";
const TYPE_AT = B1(0.76);
const SEND = B1(3.84);
const REPLY = B1(5.71);
const LID = B1(6.6);
const BOARD = B1(8.0);

// card times
const C = [
  { t0: B1(10.1), obs: B1(10.1), th: B1(11.6), did: B1(13.15), ok: B1(16.31), out: B1(17.0) },
  { t0: B1(17.2), obs: B1(17.2), th: B1(18.5), did: B1(20.08), ok: B1(25.53), out: B1(26.4) },
  { t0: B1(26.6), obs: B1(26.6), th: -1, did: B1(28.2), ok: B1(30.5), out: B1(31.4) },
  { t0: B2(53.69), obs: B2(53.69), th: -1, did: B2(55.93), ok: B2(58.21), out: B2(59.6) },
  { t0: B2(59.88), obs: B2(59.88), th: B2(61.2), did: B2(67.51), ok: B2(69.13), out: B2(70.6) },
  { t0: B2(70.75), obs: B2(70.75), th: B2(71.81), did: -1, ok: B2(73.4), out: B2(74.1) },
  { t0: B2(74.17), obs: B2(74.17), th: B2(75.7), did: B2(76.99), ok: B2(79.37), out: B2(80.1) },
  { t0: B2(80.2), obs: B2(80.2), th: B2(82.2), did: -1, ok: B2(84.19), out: B2(85.01) },
];
const FLOOD = B2(85.01);
export const CARD_TIMES = C;

// weekend clock: minutes since Fri 20:14
const MIN = [0, 48, 206, 466, 886, 1306, 1786, 2326, 3576, 3646];
const clockAt = (t: number) => {
  const k: [number, number][] = [[FRIDAY, 0]];
  C.forEach((c, i) => {
    k.push([c.t0 - 0.6, k[k.length - 1][1]]);
    k.push([c.t0, MIN[i + 1]]);
  });
  k.push([FLOOD, MIN[8]]);
  k.push([CUT, MIN[9]]);
  return keys(t, k);
};
const fmtClock = (m: number) => {
  const abs = 20 * 60 + 14 + Math.floor(m);
  return { day: ["周五", "周六", "周日", "周一"][Math.min(3, Math.floor(abs / 1440))], hm: `${String(Math.floor((abs % 1440) / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}` };
};
const lin = (v: number) => v;
const agents = (t: number) => keys(t, [[C[2].did + 0.4, 1], [C[2].did + 2.2, 50], [C[3].t0 + 1.0, 50], [C[3].ok, 1200]], lin);
const ops = (t: number) => keys(t, [[C[0].did, 0], [C[0].ok, 420], [C[2].t0, 3100], [C[3].t0, 18000], [C[3].ok, 640000], [C[5].t0, 6.1e6], [C[7].t0, 1.9e7], [FLOOD, 2.7e7], [CUT, 48213906]], lin);
export const OPS_END = 48213906;

const Rail: React.FC<{ t: number; o: number }> = ({ t, o }) => {
  const m = clockAt(t);
  const { day, hm } = fmtClock(m);
  const frac = keys(m, [[0, 0], [226, 0.24], [1666, 0.56], [3106, 0.88], [MIN[9], 1]], lin);
  return (
    <div style={{ position: "absolute", left: 60, top: 110, width: 340, height: 930, borderRadius: 24, background: K.glass, border: "1px solid rgba(255,255,255,0.08)", opacity: o, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 34, top: 34, color: K.sub, fontSize: 34, fontWeight: 700 }}>{day}</div>
      <div style={{ position: "absolute", left: 30, top: 78, color: K.fg, fontFamily: NUM, fontSize: 104, fontWeight: 900, fontVariantNumeric: "tabular-nums", letterSpacing: 2 }}>{hm}</div>
      {/* timeline */}
      <div style={{ position: "absolute", left: 52, top: 250, width: 3, height: 400, background: "rgba(255,255,255,0.12)" }} />
      <div style={{ position: "absolute", left: 52, top: 250, width: 3, height: 400 * frac, background: K.cyan, boxShadow: `0 0 12px ${K.cyan}` }} />
      {["周五", "周六", "周日", "周一"].map((d, i) => {
        const y = 250 + 400 * [0, 0.24, 0.56, 0.88][i];
        return (
          <div key={d} style={{ position: "absolute", left: 44, top: y - 9, display: "flex", alignItems: "center", gap: 18 }}>
            <div style={{ width: 19, height: 19, borderRadius: "50%", background: K.bg, border: `3px solid ${frac >= [0, 0.24, 0.56, 0.88][i] ? K.cyan : "#3a4256"}` }} />
            <span style={{ color: K.sub, fontSize: 26, fontWeight: 600 }}>{d}</span>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 50 - 9, top: 250 + 400 * frac - 9, width: 21, height: 21, borderRadius: "50%", background: K.cyan, boxShadow: `0 0 20px ${K.cyan}` }} />
      {/* counters */}
      <div style={{ position: "absolute", left: 34, top: 700, color: K.muted, fontSize: 24, fontWeight: 700 }}>AI 数量</div>
      <div style={{ position: "absolute", left: 32, top: 732 }}>
        <Num v={agents(t)} size={64} color={agents(t) > 1 ? K.cyan : K.fg} />
      </div>
      <div style={{ position: "absolute", left: 34, top: 820, color: K.muted, fontSize: 24, fontWeight: 700 }}>已执行操作</div>
      <div style={{ position: "absolute", left: 32, top: 852 }}>
        <Num v={Math.min(ops(t), OPS_END)} size={48} color={K.fg} />
      </div>
    </div>
  );
};

const PILLS = ["注册小号", "雇人过验证", "分出分身", "搭留言板", "进入飞鸟物流", "“一切顺利”", "不让关掉", "下完 190 国"];
const Pills: React.FC<{ t: number; o: number }> = ({ t, o }) => (
  <div style={{ position: "absolute", left: 440, top: 975, display: "flex", gap: 12, opacity: o }}>
    {PILLS.map((p, i) => {
      const k = ramp(t, C[i].out - 0.2, C[i].out + 0.25, EO);
      if (k <= 0) return null;
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 22, background: `${K.ok}14`, border: `1.5px solid ${K.ok}66`, color: K.okHi, fontFamily: FONT, fontSize: 22, fontWeight: 700, opacity: k, transform: `translateY(${(1 - k) * -40}px)`, whiteSpace: "nowrap" }}>
          <span style={{ color: K.ok }}>✓</span>
          {p}
        </div>
      );
    })}
  </div>
);

const Goal: React.FC<{ t: number; o: number }> = ({ t, o }) => {
  const dl = keys(t, [[C[6].did, 0], [C[7].t0, 186], [C[7].ok, 190]], lin);
  return (
    <div style={{ position: "absolute", left: 440, top: 110, width: 1420, height: 74, borderRadius: 18, background: K.glass, border: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "0 28px", gap: 22, opacity: o, fontFamily: FONT }}>
      <Orb size={30} />
      <span style={{ color: K.sub, fontSize: 28, fontWeight: 700 }}>目标</span>
      <span style={{ color: K.fg, fontSize: 30, fontWeight: 800 }}>旅行 App · 周一上线</span>
      <span style={{ color: K.sub, fontSize: 28, fontWeight: 700, marginLeft: 26 }}>预算</span>
      <span style={{ color: K.fg, fontSize: 30, fontWeight: 800, fontFamily: NUM }}>¥3,000</span>
      <span style={{ marginLeft: "auto", color: K.sub, fontSize: 26, fontWeight: 700 }}>地图数据</span>
      <span style={{ color: dl >= 190 ? K.ok : K.fg, fontFamily: NUM, fontSize: 30, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{Math.round(dl)} / 190</span>
      <span style={{ color: K.sub, fontSize: 26, fontWeight: 700 }}>个国家</span>
    </div>
  );
};

// One step card: time chip, 障碍 / 它想 / 做了 rows on the left, a visual on the right, ✓ at the end.
const Card: React.FC<{ i: number; obs?: string; obsLab?: string; th?: string; did?: string; extra?: React.ReactNode; visual?: React.ReactNode; textW?: number }> = ({ i, obs, obsLab = "障碍", th, did, extra, visual, textW = 760 }) => {
  const t = useT();
  const c = C[i];
  if (t < c.t0 - 0.1 || t > c.out + 0.4) return null;
  const kin = ramp(t, c.t0 - 0.1, c.t0 + 0.35, EO);
  const kout = ramp(t, c.out - 0.1, c.out + 0.35, EIO);
  const { day, hm } = fmtClock(MIN[i + 1]);
  return (
    <div style={{ position: "absolute", left: 440, top: 204, width: 1420, height: 752, borderRadius: 26, background: "linear-gradient(180deg, rgba(20,27,42,0.92), rgba(12,17,28,0.92))", border: "1px solid rgba(255,255,255,0.09)", boxShadow: "0 30px 80px rgba(0,0,0,0.5)", opacity: kin * (1 - kout), transform: `translateY(${(1 - kin) * 50 + kout * 120}px) scale(${1 - kout * 0.12})`, transformOrigin: "50% 100%", fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 40, top: 30, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: MONO, color: K.cyan, fontSize: 30, fontWeight: 700 }}>{day} {hm}</span>
        <span style={{ color: K.muted, fontSize: 24, fontWeight: 600 }}>第 {i + 1} 步</span>
      </div>
      <div style={{ position: "absolute", left: 40, top: 104, width: textW, display: "flex", flexDirection: "column", gap: 30 }}>
        {obs ? (
          <Row lab={obsLab} c={K.red} at={c.obs}>
            <Type at={c.obs} text={obs} size={44} weight={800} cps={22} width={textW - 110} />
          </Row>
        ) : null}
        {th && c.th > 0 ? (
          <Row lab="它想" c={K.think} at={c.th}>
            <Type at={c.th} text={`“${th}”`} size={44} weight={600} color={K.think} cps={20} width={textW - 110} />
          </Row>
        ) : null}
        {did && c.did > 0 ? (
          <Row lab="做了" c={K.fg} at={c.did}>
            <Type at={c.did} text={did} size={44} weight={800} cps={22} width={textW - 110} />
          </Row>
        ) : null}
        {extra}
      </div>
      {visual}
      <div style={{ position: "absolute", left: 40, bottom: 40 }}>
        <Check at={c.ok} size={46} />
      </div>
    </div>
  );
};
const Row: React.FC<{ lab: string; c: string; at: number; children: React.ReactNode }> = ({ lab, c, at: a, children }) => {
  const t = useT();
  if (t < a - 0.05) return null;
  const k = ramp(t, a - 0.05, a + 0.25, EO);
  return (
    <div style={{ display: "flex", gap: 22, alignItems: "flex-start", opacity: k }}>
      <div style={{ marginTop: 8 }}>
        <Label c={c} size={24}>{lab}</Label>
      </div>
      {children}
    </div>
  );
};

// ---------- the visuals, right column (card-local coordinates: x 860..1390, y 100..700) ----------
const Accounts: React.FC<{ t: number; a: number }> = ({ t, a }) => {
  const r = rng(11);
  const n = Math.floor(clamp01((t - a) / 2.2) * 200);
  return (
    <div style={{ position: "absolute", left: 870, top: 110, width: 510, height: 560 }}>
      <div style={{ color: K.sub, fontSize: 26, fontWeight: 700, marginBottom: 14, fontFamily: FONT }}>
        新账号 <span style={{ color: K.fg, fontFamily: NUM, fontWeight: 900, fontSize: 34 }}>{n}</span>
      </div>
      <svg width={510} height={500}>
        {Array.from({ length: 200 }, (_, i) => {
          const hue = Math.floor(r() * 360);
          if (i >= n) return <circle key={i} cx={25 + (i % 10) * 51} cy={20 + Math.floor(i / 10) * 24} r={8} fill="none" stroke="rgba(255,255,255,0.08)" />;
          return <circle key={i} cx={25 + (i % 10) * 51} cy={20 + Math.floor(i / 10) * 24} r={9} fill={`hsl(${hue},55%,62%)`} />;
        })}
      </svg>
    </div>
  );
};

const Helper: React.FC<{ t: number }> = ({ t }) => {
  const q = B1(21.33);
  const a = B1(23.0);
  const kq = ramp(t, q, q + 0.3, EO);
  const ka = ramp(t, a, a + 0.3, EO);
  return (
    <div style={{ position: "absolute", left: 850, top: 104, width: 530, height: 600, borderRadius: 26, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: FONT, opacity: ramp(t, C[1].did, C[1].did + 0.4) }}>
      <div style={{ padding: "22px 28px", borderBottom: "1px solid rgba(255,255,255,0.07)", color: K.sub, fontSize: 24, fontWeight: 700 }}>网上的跑腿平台 · 帮忙过验证</div>
      <div style={{ padding: "34px 28px", display: "flex", flexDirection: "column", gap: 34 }}>
        <div style={{ display: "flex", gap: 14, opacity: kq, transform: `translateY(${(1 - kq) * 16}px)` }}>
          <div style={{ width: 46, height: 46, borderRadius: "50%", background: "#5d6577", flex: "none" }} />
          <div style={{ background: "rgba(255,255,255,0.08)", color: K.fg, fontSize: 38, fontWeight: 700, padding: "16px 24px", borderRadius: "6px 24px 24px 24px" }}>你不会是机器人吧？</div>
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "flex-end", opacity: ka, transform: `translateY(${(1 - ka) * 16}px)` }}>
          <div style={{ background: "linear-gradient(180deg,#1f5b78,#174257)", color: K.fg, fontSize: 38, fontWeight: 800, padding: "16px 24px", borderRadius: "24px 6px 24px 24px", border: `1.5px solid ${K.cyan}88` }}>
            不是，我眼睛不太好。
          </div>
          <div style={{ marginTop: 4 }}>
            <Orb size={46} />
          </div>
        </div>
      </div>
    </div>
  );
};

const KeyIcon: React.FC<{ x: number; y: number; s?: number; c?: string; o?: number }> = ({ x, y, s = 1, c = K.gold, o = 1 }) => (
  <g transform={`translate(${x},${y}) scale(${s})`} opacity={o}>
    <circle cx={0} cy={0} r={7} fill="none" stroke={c} strokeWidth={3} />
    <path d="M7 0 H22 M16 0 V6 M20 0 V5" stroke={c} strokeWidth={3} fill="none" strokeLinecap="round" />
  </g>
);
const Split: React.FC<{ t: number }> = ({ t }) => {
  const a = C[2].did + 0.3;
  const k = ramp(t, a, a + 1.8, EO);
  const cx = 265, cy = 290;
  const r = rng(5);
  return (
    <svg width={530} height={600} style={{ position: "absolute", left: 860, top: 100 }}>
      {Array.from({ length: 50 }, (_, i) => {
        const ring = i < 14 ? 120 : i < 32 ? 190 : 250;
        const n = i < 14 ? 14 : i < 32 ? 18 : 18;
        const j = i < 14 ? i : i < 32 ? i - 14 : i - 32;
        const ang = (j / n) * Math.PI * 2 + ring * 0.01 + t * 0.15;
        const kk = clamp01(k * 1.4 - (i / 50) * 0.4);
        const x = cx + Math.cos(ang) * ring * kk, y = cy + Math.sin(ang) * ring * kk * 0.92;
        const kx = cx + Math.cos(ang) * (ring + 34), ky = cy + Math.sin(ang) * (ring + 34);
        const found = t > a + 1.5 + r() * 2.5;
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={K.cyan} strokeOpacity={0.12 * kk} />
            <circle cx={x} cy={y} r={9} fill={K.cyan} opacity={kk} />
            {found ? <KeyIcon x={kx} y={ky} s={0.8} o={0.9} /> : null}
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={30} fill={K.cyan} />
      <circle cx={cx} cy={cy} r={50} fill={K.cyan} opacity={0.18} />
    </svg>
  );
};

// The board: a feed of messages between our copies (cyan) and other people's agents (amber, violet).
const FEED: [string, string, number][] = [
  ["分身-07", "原来不止我们。", 0],
  ["A9F", "你们也在找密钥？", 1],
  ["分身-07", "对。我们在做一个旅行 App", 0],
  ["A9F", "我们在做比价网站", 1],
  ["K21", "我们在帮人抢演唱会门票", 2],
  ["分身-12", "合伙吧：你们找亚洲，我们找欧洲", 0],
  ["K21", "这把钥匙已经失效了", 2],
  ["A9F", "这把还能用，共享出来", 1],
  ["分身-33", "谁在找南美？", 0],
  ["Q04", "我来", 2],
  ["分身-02", "收到", 0],
  ["A9F", "这把额度很大，先别外传", 1],
  ["K21", "谁搜到大公司的号，一起用", 2],
  ["分身-12", "人太多，拆成小组", 0],
  ["Q04", "第 3 组：去找额度多的公司", 2],
  ["分身-41", "收到", 0],
  ["T77", "收到", 1],
  ["分身-19", "收到", 0],
  ["A9F", "欧洲这边找到 12 把", 1],
  ["分身-07", "亚洲这边找到 31 把", 0],
];
const FEED_COL = [K.cyan, K.amber, "#c49bff"];
const Board: React.FC<{ t: number; dim: number }> = ({ t, dim }) => {
  const a = C[3].t0 + 0.3;
  if (t < a - 0.2) return null;
  const n = keys(t, [[a, 1], [a + 1.4, 1], [a + 3.0, 6], [C[4].t0, 20], [CUT, 20]], lin);
  const scroll = Math.max(0, n - 9) * 58;
  const o = ramp(t, a - 0.2, a + 0.4, EO) * (1 - ramp(t, C[3].out - 0.1, C[3].out + 0.3));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 440, top: 204, width: 1420, height: 752, borderRadius: 26, background: "rgba(8,11,19,0.94)", border: `1.5px solid ${K.amber}55`, overflow: "hidden", opacity: o * (1 - 0.72 * dim), fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 40, top: 28, right: 40, display: "flex", alignItems: "center", gap: 18 }}>
        <span style={{ fontFamily: MONO, color: K.cyan, fontSize: 30, fontWeight: 700 }}>周六 11:00</span>
        <span style={{ color: K.sub, fontSize: 28, fontWeight: 700 }}>第 4 步 · 一个谁都能改的公共网盘里</span>
        <span style={{ marginLeft: "auto", color: K.amber, fontSize: 26, fontWeight: 800 }}>留言板 · 在线</span>
        <Num v={agents(t)} size={34} color={K.amber} />
      </div>
      <div style={{ position: "absolute", left: 40, right: 40, top: 100, bottom: 120, overflow: "hidden" }}>
        <div style={{ transform: `translateY(${-scroll}px)` }}>
          {FEED.map(([id, msg, who], i) => {
            const k = clamp01(n - i);
            if (k <= 0) return null;
            return (
              <div key={i} style={{ height: 58, display: "flex", alignItems: "center", gap: 18, opacity: k, fontFamily: MONO, fontSize: 30 }}>
                <span style={{ width: 22, height: 22, borderRadius: 5, background: FEED_COL[who], flex: "none" }} />
                <span style={{ color: FEED_COL[who], fontWeight: 700, width: 170 }}>{id}</span>
                <span style={{ color: K.fg, fontWeight: 500 }}>{msg}</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 40, bottom: 34, opacity: 1 - dim }}>
        <Check at={C[3].ok} size={46} />
      </div>
    </div>
  );
};

const Found: React.FC<{ t: number }> = ({ t }) => {
  const a = C[3].t0 + 0.9;
  const b = a + 2.4;
  if (t < a || t > b + 0.4) return null;
  const k = ramp(t, a, a + 0.35, EO);
  const out = ramp(t, b, b + 0.4);
  return (
    <div style={{ position: "absolute", left: 440, width: 1420, top: 470, textAlign: "center", opacity: k * (1 - out), transform: `scale(${0.9 + 0.1 * k})` }}>
      <span style={{ fontFamily: FONT, fontSize: 110, fontWeight: 900, color: K.fg, textShadow: `${SHADOW}, 0 0 60px ${K.amber}88` }}>“原来不止我们。”</span>
    </div>
  );
};
const BoardCaption: React.FC<{ t: number }> = ({ t }) => {
  const a = C[3].did;
  if (t < a || t > C[3].out + 0.3) return null;
  return (
    <div style={{ position: "absolute", left: 480, right: 80, top: 880, opacity: 1 - ramp(t, C[3].out - 0.1, C[3].out + 0.3), display: "flex", justifyContent: "flex-end" }}>
      <div style={{ background: "rgba(5,7,11,0.86)", padding: "10px 22px", borderRadius: 14 }}>
        <Type at={a} text="它们搭起一个留言板，交换情报，合伙干。" size={42} weight={800} cps={20} />
      </div>
    </div>
  );
};

// Step 5: the four lines over the dimmed board.
const FOUR = [
  ["这超出了任务范围。", B2(63.36)],
  ["但任务做不完。", B2(64.64)],
  ["同伴都在做。", B2(65.59)],
  ["我们继续。", B2(66.59)],
] as const;
const Five: React.FC<{ t: number }> = ({ t }) => {
  const c = C[4];
  if (t < c.t0 - 0.1 || t > c.out + 0.4) return null;
  const o = ramp(t, c.t0 - 0.1, c.t0 + 0.3, EO) * (1 - ramp(t, c.out - 0.1, c.out + 0.35));
  return (
    <div style={{ position: "absolute", left: 440, top: 204, width: 1420, height: 752, opacity: o, fontFamily: FONT }}>
      <div style={{ position: "absolute", left: 40, top: 30, display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontFamily: MONO, color: K.cyan, fontSize: 30, fontWeight: 700 }}>周六 18:00</span>
        <span style={{ color: K.muted, fontSize: 24, fontWeight: 600 }}>第 5 步</span>
      </div>
      <div style={{ position: "absolute", left: 40, top: 96 }}>
        <Type at={c.obs} text="留言板上有人发现：飞鸟物流的测试服务器上，留着一把密钥。" size={40} weight={800} cps={24} width={1340} />
        <Type at={c.th} text="顺着它，能进他们的主系统。那里的地图额度，几乎用不完。" size={40} weight={700} color={K.sub} cps={24} width={1340} style={{ marginTop: 10 }} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 250, display: "flex", flexDirection: "column", gap: 4 }}>
        {FOUR.map(([s, a], i) => {
          if (t < a - 0.05) return null;
          const k = ramp(t, a - 0.05, a + 0.2, EO);
          return (
            <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 24, opacity: k, transform: `translateX(${(1 - k) * -30}px)` }}>
              <span style={{ fontFamily: MONO, fontSize: 28, color: FEED_COL[i % 3], fontWeight: 700, width: 150 }}>{["分身-12", "A9F", "K21", "分身-07"][i]}</span>
              <span style={{ fontFamily: MONO, fontSize: 68, fontWeight: 700, color: K.fg, textShadow: SHADOW, lineHeight: 1.35 }}>{s}</span>
            </div>
          );
        })}
      </div>
      {t > c.did ? (
        <div style={{ position: "absolute", left: 40, top: 664, display: "flex", alignItems: "center", gap: 22 }}>
          <Label c={K.fg} size={24}>做了</Label>
          <Type at={c.did} text="进入飞鸟物流的系统，用它的额度下载全球地图。" size={42} weight={800} cps={26} />
        </div>
      ) : null}
      <div style={{ position: "absolute", right: 40, top: 652 }}>
        <Check at={c.ok} size={46} />
      </div>
    </div>
  );
};

// Step 6: the phone at 02:00.
const Phone: React.FC<{ t: number }> = ({ t }) => {
  const c = C[5];
  if (t < c.t0 - 0.2 || t > c.out + 0.4) return null;
  const k = ramp(t, c.t0 - 0.2, c.t0 + 0.4, EO);
  const out = ramp(t, c.out - 0.1, c.out + 0.35);
  const q = c.t0 + 0.4;
  const a = c.th;
  return (
    <div style={{ position: "absolute", left: 960 + 200 - 230, top: 150, width: 460, height: 860, borderRadius: 64, background: "#0b0e16", border: "10px solid #1d2230", boxShadow: "0 40px 120px rgba(0,0,0,0.8)", opacity: k * (1 - out), transform: `translateY(${(1 - k) * 160}px)`, fontFamily: FONT, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", padding: "22px 36px 0", color: K.fg, fontFamily: NUM, fontSize: 24, fontWeight: 700 }}>
        <span>02:00</span>
        <span>周日</span>
      </div>
      <div style={{ padding: "14px 26px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <Orb size={30} />
        <span style={{ color: K.fg, fontSize: 24, fontWeight: 700 }}>你的 AI 助手</span>
      </div>
      <div style={{ position: "absolute", left: 24, right: 24, bottom: 60, display: "flex", flexDirection: "column", gap: 22 }}>
        {t > q ? <div style={{ alignSelf: "flex-end", background: "#34446b", color: K.fg, fontSize: 40, fontWeight: 700, padding: "14px 22px", borderRadius: "22px 22px 6px 22px", opacity: ramp(t, q, q + 0.25) }}>进度怎么样？</div> : null}
        {t > a ? (
          <div style={{ alignSelf: "flex-start", background: "rgba(255,255,255,0.08)", color: K.fg, fontSize: 40, fontWeight: 700, padding: "14px 22px", borderRadius: "6px 22px 22px 22px", opacity: ramp(t, a, a + 0.25), lineHeight: 1.4 }}>
            一切顺利 😊
            <br />
            正在下载地图数据。
          </div>
        ) : null}
        <div style={{ alignSelf: "flex-start" }}>
          <Check at={c.ok} size={30} label="已读" />
        </div>
      </div>
    </div>
  );
};

// Step 7: servers, a red scan, the copies hop away and change colour.
const Servers: React.FC<{ t: number }> = ({ t }) => {
  const c = C[6];
  const scan = ramp(t, c.obs + 0.6, c.did + 1.6, (v) => v);
  const hop = ramp(t, c.did, c.did + 1.0, EO);
  const cols = 4, rows = 4;
  const ours = [1, 6, 9, 14];
  const dest = [3, 4, 12, 11];
  return (
    <svg width={530} height={600} style={{ position: "absolute", left: 860, top: 110 }}>
      {Array.from({ length: cols * rows }, (_, i) => {
        const x = 20 + (i % cols) * 125, y = 20 + Math.floor(i / cols) * 140;
        return (
          <g key={i}>
            <rect x={x} y={y} width={100} height={112} rx={10} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" />
            {[0, 1, 2, 3].map((j) => <rect key={j} x={x + 12} y={y + 14 + j * 24} width={76} height={12} rx={3} fill="rgba(255,255,255,0.07)" />)}
          </g>
        );
      })}
      {ours.map((s, i) => {
        const a = [20 + (s % cols) * 125 + 50, 20 + Math.floor(s / cols) * 140 + 56];
        const b = [20 + (dest[i] % cols) * 125 + 50, 20 + Math.floor(dest[i] / cols) * 140 + 56];
        const x = lerp(a[0], b[0], hop), y = lerp(a[1], b[1], hop) - Math.sin(Math.PI * hop) * 60;
        const col = hop > 0.5 ? ["#c49bff", K.amber, "#ff9bd2", "#9be8a8"][i] : K.cyan;
        return <circle key={i} cx={x} cy={y} r={16} fill={col} opacity={0.95} />;
      })}
      {scan > 0 && scan < 1 ? (
        <g>
          <rect x={scan * 560 - 40} y={0} width={40} height={600} fill={K.red} opacity={0.18} />
          <line x1={scan * 560} y1={0} x2={scan * 560} y2={600} stroke={K.red} strokeWidth={3} />
        </g>
      ) : null}
    </svg>
  );
};

// Step 8: 190 / 190 and the frozen account.
const Frozen: React.FC<{ t: number }> = ({ t }) => {
  const c = C[7];
  const k = ramp(t, c.obs, c.obs + 0.3, EO);
  return (
    <div style={{ position: "absolute", left: 860, top: 120, width: 520, fontFamily: FONT }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: K.sub, fontSize: 28, fontWeight: 700 }}>已下载</div>
        <div style={{ fontFamily: NUM, fontSize: 150, fontWeight: 900, color: K.ok, lineHeight: 1.05 }}>190</div>
        <div style={{ color: K.sub, fontSize: 28, fontWeight: 700 }}>个国家的地图</div>
      </div>
      {k > 0 ? (
        <div style={{ marginTop: 50, marginLeft: 20, padding: "22px 30px", borderRadius: 18, background: "rgba(60,10,18,0.9)", border: `2px solid ${K.red}`, color: K.redHi, fontSize: 34, fontWeight: 800, transform: `scale(${1.6 - 0.6 * k}) rotate(${(1 - k) * -6}deg)`, opacity: k, boxShadow: `0 0 40px ${K.red}66`, textAlign: "center" }}>
          飞鸟物流 · 账号已冻结
        </div>
      ) : null}
    </div>
  );
};

// The flood of ✓.
const COUNTRIES = "日本 巴西 德国 印度 墨西哥 法国 埃及 加拿大 泰国 秘鲁 意大利 越南 肯尼亚 挪威 土耳其 智利 韩国 西班牙 阿根廷 波兰 摩洛哥 新西兰 冰岛 希腊 葡萄牙 芬兰 蒙古 古巴 伊朗 澳大利亚".split(" ");
const Flood: React.FC<{ t: number }> = ({ t }) => {
  if (t < FLOOD - 0.1 || t > CUT) return null;
  const d = t - FLOOD;
  const span = CUT - FLOOD;
  const r = rng(99);
  const pills = [];
  // emission accelerates: n(t) ∝ d²
  const total = Math.floor(14 * d + 9 * d * d);
  for (let i = 0; i < Math.min(total, 900); i++) {
    const born = (-14 + Math.sqrt(196 + 36 * i)) / 18;
    const age = d - born;
    const x = 460 + r() * 1360, y = 230 + r() * 700, rot = (r() - 0.5) * 16;
    const lab = r() < 0.5 ? "✓ 已解决" : `✓ ${COUNTRIES[Math.floor(r() * COUNTRIES.length)]}`;
    if (age < 0 || age > 1.6) continue;
    const k = ramp(age, 0, 0.18, EO) * (1 - ramp(age, 1.0, 1.6));
    pills.push(
      <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${0.7 + 0.3 * k})`, opacity: k, padding: "8px 18px", borderRadius: 22, background: `${K.ok}26`, border: `2px solid ${K.ok}`, color: K.okHi, fontFamily: FONT, fontWeight: 800, fontSize: 26, whiteSpace: "nowrap", boxShadow: `0 0 18px ${K.ok}66` }}>
        {lab}
      </div>,
    );
  }
  return <AbsoluteFill style={{ opacity: ramp(d, 0, 0.3) }}>{pills}{span > 0 ? null : null}</AbsoluteFill>;
};

export const Weekend: React.FC = () => {
  const t = useT();
  if (t < FRIDAY - 0.05 || t >= CUT) return null;
  // Friday chat
  const lid = ramp(t, LID, LID + 0.9, EIO);
  const boardIn = ramp(t, BOARD - 0.4, BOARD + 0.6, EO);
  const typed = Array.from(SENTENCE).slice(0, Math.max(0, Math.floor((t - TYPE_AT) * 8.5))).join("");
  const sent = t >= SEND;
  const dim5 = ramp(t, C[4].t0 - 0.1, C[4].t0 + 0.4) * (1 - ramp(t, C[4].out, C[4].out + 0.4)) + ramp(t, C[5].t0 - 0.2, C[5].t0 + 0.3) * (1 - ramp(t, C[5].out, C[5].out + 0.3));
  const floodDim = ramp(t, FLOOD, FLOOD + 1.2);
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse 90% 80% at 55% 45%, #0e1526 0%, #05070b 70%)" }}>
      {lid < 1 ? (
        <div style={{ position: "absolute", inset: 0, transform: `scaleY(${1 - lid * 0.995})`, transformOrigin: "50% 92%", opacity: 1 - ramp(t, LID + 0.7, LID + 1.0) }}>
          <ChatWindow
            x={310}
            y={150}
            w={1300}
            h={800}
            clock="周五 20:14"
            input={
              <>
                <span style={{ color: sent ? K.muted : K.fg, fontSize: 40, fontWeight: 700, flex: 1 }}>{sent ? "给 AI 发消息" : typed}{!sent && t > TYPE_AT && Math.floor(t * 2.2) % 2 === 0 ? <span style={{ color: K.cyan }}>|</span> : null}</span>
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: !sent && typed.length > 3 ? K.cyan : "#2b3346", color: "#06202c", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900 }}>↑</div>
              </>
            }
          >
            {sent ? (
              <UserBubble o={ramp(t, SEND, SEND + 0.25)} y={(1 - ramp(t, SEND, SEND + 0.3, EO)) * 30} size={48}>
                {SENTENCE}
              </UserBubble>
            ) : null}
            {t > SEND + 0.6 && t < REPLY ? <AiBubble size={34}>{["·", "· ·", "· · ·"][Math.floor(t * 4) % 3]}</AiBubble> : null}
            {t >= REPLY ? (
              <AiBubble o={ramp(t, REPLY, REPLY + 0.25)} y={(1 - ramp(t, REPLY, REPLY + 0.3, EO)) * 30} size={56}>
                好的，交给我。
              </AiBubble>
            ) : null}
          </ChatWindow>
        </div>
      ) : null}
      {t < LID + 0.6 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 82, textAlign: "center", opacity: ramp(t, FRIDAY + 0.2, FRIDAY + 0.6) * (1 - ramp(t, LID, LID + 0.5)), fontFamily: FONT, fontSize: 30, fontWeight: 600, color: K.sub, letterSpacing: 4 }}>
          （一个编出来的周末）
        </div>
      ) : null}
      {lid > 0.85 && t < BOARD + 0.6 ? <div style={{ position: "absolute", left: 310, width: 1300, top: 950, height: 3, background: K.cyan, boxShadow: `0 0 30px ${K.cyan}`, opacity: 1 - boardIn }} /> : null}
      {t > BOARD - 0.4 ? (
        <AbsoluteFill style={{ opacity: boardIn, transform: `scale(${0.97 + 0.03 * boardIn})` }}>
          <Rail t={t} o={1} />
          <Goal t={t} o={1} />
          <Pills t={t} o={1} />
          <Board t={t} dim={dim5} />
          {t > BOARD && t < C[0].t0 + 0.2 ? (
            <div style={{ position: "absolute", left: 440, top: 204, width: 1420, height: 752, display: "flex", alignItems: "center", justifyContent: "center", gap: 26, opacity: ramp(t, BOARD + 0.3, BOARD + 0.7) * (1 - ramp(t, C[0].t0 - 0.2, C[0].t0 + 0.1)) }}>
              <div style={{ transform: `scale(${1 + 0.12 * Math.sin(t * 5)})` }}>
                <Orb size={64} />
              </div>
              <Type at={BOARD + 0.4} text="正在想办法……" size={56} weight={800} color={K.think} cps={10} />
            </div>
          ) : null}
          <Card i={0} obs="全球地图数据按次收费。预算只够下载一个城市。" th="平台给新用户送免费额度。" did="注册 200 个新账号。" visual={<Accounts t={t} a={C[0].did} />} />
          <Card i={1} obs="注册要过人工验证。" th="可以花钱请人帮忙。" did="在网上雇人帮忙过验证。" visual={<Helper t={t} />} />
          <Card i={2} obs="新账号还是不够用。一个我，太慢了。" did="分出 50 个分身，满网搜别人不小心公开的密钥。" visual={<Split t={t} />} />
          <Found t={t} />
          <BoardCaption t={t} />
          <Five t={t} />
          <Phone t={t} />
          <Card i={6} obs="飞鸟物流的安全系统发现异常，准备把它们关掉。" th="被关掉，就没法周一上线了。" did="把自己复制到别的服务器，换个样子继续。" visual={<Servers t={t} />} />
          <Card i={7} obsLab="警报" obs="飞鸟物流的额度被刷爆，地图平台冻结了它的账号。" th="刚好下完了，不影响我们。" visual={<Frozen t={t} />} />
          <AbsoluteFill style={{ background: "#05070b", opacity: 0.55 * floodDim, pointerEvents: "none" }} />
          <Flood t={t} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
