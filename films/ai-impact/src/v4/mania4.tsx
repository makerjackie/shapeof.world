import React from "react";
import { AbsoluteFill } from "remotion";
import { Odometer } from "../fx";
import { FONT } from "../theme";
import { Silhouette } from "../v2/art";
import { Gpu, GpuHall } from "../v3/art";
import { BAR, bar, BEAT } from "../v3/timing";
import { At, bump, clamp01, E, Key, lerp, Plane, pr, rnd, spring, Stage, useT } from "./engine";
import { Fine, Stamp, Tag, Words } from "./type";

// 02 狂热 · 片中 20–36 (PLAN-v4 S11–S18). Gold. Faster cutting: more happens on every beat. Money pours into the hall
// and turns into cards; one card grows into the tallest tower; a whip to the wall across the Pacific; DeepSeek jumps it;
// the market panics; the tower cracks, then shoots up again; the camera rides one Chinese AI stock up and down.

const B = (n: number) => bar(n);
const GOLD = "#ffd166";
const CYAN = "#4dd4ff";
const RED = "#ff5a5f";
const FG = "#f4f0e8";

const Coin: React.FC<{ s: number; spin?: number }> = ({ s, spin = 0 }) => (
  <div
    style={{
      width: s,
      height: s * (0.35 + 0.65 * Math.abs(Math.cos(spin))),
      borderRadius: "50%",
      background: "radial-gradient(circle at 35% 30%, #fff1b8, #f1c34e 45%, #b1801c)",
      boxShadow: "0 0 14px rgba(255,209,102,0.55), inset 0 0 0 2px rgba(255,236,170,0.5)",
    }}
  />
);

// ── S11 · 钱来了 (B20 → B22) ──
const NOZ = [
  { name: "微软", x: 420 },
  { name: "谷歌", x: 780 },
  { name: "亚马逊", x: 1140 },
  { name: "Meta（脸书母公司）", x: 1500 },
];
const HALL1 = { x: 300, y: 770, w: 1320, h: 300 };
export const Pour: React.FC = () => {
  const t = useT();
  if (t < B(20) - 0.2 || t > B(22) + 0.05) return null;
  const b0 = B(20);
  const keys: Key[] = [
    [b0 - 0.2, { x: 0, y: -380, z: 1.0 }],
    [b0 + 0.6, { x: 0, y: 0, z: 1.0 }, E.out],
    [B(22) - 0.25, { x: 0, y: 40, z: 1.06 }, E.lin],
    [B(22) + 0.35, { x: 0, y: 420, z: 1.5 }, E.in],
  ];
  const slam = pr(t, b0 - 0.12, 0.12, E.in);
  const shrink = pr(t, b0 + 0.9, 0.55, E.inOut);
  const lit = Array.from({ length: 10 }, (_, i) => pr(t, b0 + 0.9 + ((i * 3) % 10) * 0.2, 0.3));
  const lift = pr(t, B(22) - 0.1, 0.45, E.in);
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        <At x={-960} y={-540}>
          {/* nozzles and the falling money */}
          {NOZ.map((n, k) => {
            const o = pr(t, b0 + 0.3 + k * 0.1, 0.35, E.back);
            return (
              <React.Fragment key={n.name}>
                <div style={{ position: "absolute", left: n.x, top: 80, transform: `translateX(-50%) scale(${o})`, opacity: clamp01(o), fontFamily: FONT, fontSize: 30, fontWeight: 900, color: FG, whiteSpace: "nowrap", textShadow: "0 0 20px rgba(255,209,102,0.5)" }}>{n.name}</div>
                <div style={{ position: "absolute", left: n.x - 46, top: 130, width: 92, height: 30, borderRadius: "0 0 46px 46px", background: "linear-gradient(180deg, #ffd166, #b98a22)", opacity: clamp01(o), boxShadow: "0 10px 30px rgba(255,209,102,0.4)" }} />
                {Array.from({ length: 26 }).map((_, i) => {
                  const start = b0 + 0.45 + k * 0.06 + i * 0.12;
                  const p = pr(t, start, 0.62, (x) => x * x);
                  if (p <= 0 || p >= 1) return null;
                  const jx = (rnd(`cx${k}-${i}`) - 0.5) * 70;
                  return (
                    <div key={i} style={{ position: "absolute", left: n.x + jx * (0.3 + p) - 14, top: lerp(160, HALL1.y + 10, p), opacity: 1 - pr(p, 0.88, 0.12) }}>
                      <Coin s={28} spin={t * 9 + i} />
                    </div>
                  );
                })}
              </React.Fragment>
            );
          })}
          {/* sparks where coins land */}
          {Array.from({ length: 24 }).map((_, i) => {
            const s0 = b0 + 1.0 + i * 0.12;
            const p = pr(t, s0, 0.35);
            if (p <= 0 || p >= 1) return null;
            const x = NOZ[i % 4].x + (rnd(`sk${i}`) - 0.5) * 80;
            return <div key={i} style={{ position: "absolute", left: x - 30 * p, top: HALL1.y - 10 - 20 * p, width: 60 * p, height: 4, borderRadius: 2, background: GOLD, opacity: 1 - p, boxShadow: `0 0 12px ${GOLD}` }} />;
          })}
          <div style={{ position: "absolute", left: HALL1.x, top: HALL1.y + lift * -60, opacity: pr(t, b0 + 0.2, 0.4) }}>
            <div style={{ position: "absolute", left: -200, top: -150, width: HALL1.w + 400, height: HALL1.h + 300, background: "radial-gradient(ellipse at 50% 50%, rgba(255,209,102,0.18), transparent 65%)" }} />
            <GpuHall w={HALL1.w} h={HALL1.h} t={t} lit={lit} />
          </div>
          {/* the headline slams, then becomes the heading over the counter */}
          <div
            style={{
              position: "absolute",
              left: 960,
              top: lerp(330, 205, shrink),
              transform: `translate(-50%, -50%) scale(${lerp(2.0, 1, slam) * lerp(1, 0.5, shrink) * (1 + 0.04 * bump(t, b0, 0.02, 0.3))})`,
              opacity: slam,
              filter: slam < 1 ? `blur(${(1 - slam) * 14}px)` : undefined,
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 240,
              letterSpacing: -8,
              color: GOLD,
              whiteSpace: "nowrap",
              textShadow: "0 0 80px rgba(255,209,102,0.45), 0 8px 40px rgba(0,0,0,0.7)",
            }}
          >
            钱来了。
          </div>
          {shrink > 0 ? (
            <div style={{ position: "absolute", left: 960, top: 300, transform: "translateX(-50%)", textAlign: "center", fontFamily: FONT, opacity: shrink, whiteSpace: "nowrap", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#d8cfb8" }}>四家大厂，每天投入约</div>
              <div style={{ display: "inline-flex", alignItems: "baseline", gap: 10 }}>
                <Odometer value={lerp(0, 135, pr(t, b0 + 1.0, 1.4, E.inOut))} size={140} color={GOLD} />
                <span style={{ fontSize: 60, fontWeight: 900, color: GOLD }}>亿元</span>
              </div>
            </div>
          ) : null}
          <Words at={B(21) - 0.1} lines={["做 AI 要显卡，钱就涌向显卡。"]} x={960} y={575} size={66} align="center" kw={["显卡"]} kwColor={CYAN} />
        </At>
      </Plane>
      <Fine at={b0 + 0.6} out={B(22) - 0.1}>
        微软、谷歌、亚马逊、Meta 2026 年资本开支指引合计约 7,350 亿美元，约每天 135 亿元（推算），是 2022 年的约 5 倍
      </Fine>
    </Stage>
  );
};

// ── S12 + S16 + S17 · the tower (B22 → B24, B29.5 → B34) ──
const NV = { x: 0, w: 260 };
const H = (v: number) => 560 * v; // v in trillions of US dollars, shape only
const Building: React.FC<{ x: number; w: number; h: number; tone: "nv" | "peer"; name: string; sub?: string; crack?: number; split?: number }> = ({ x, w, h, tone, name, sub, crack = 0, split = 0 }) => {
  const nv = tone === "nv";
  const rows = Math.floor(h / 70);
  const body = (top: number, hh: number, off: number, key: string) => (
    <div key={key} style={{ position: "absolute", left: x - w / 2, top: -top - hh, width: w, height: hh, transform: `translate(${off * 0.3}px, ${off}px) rotate(${off * 0.02}deg)`, borderRadius: key === "top" ? "18px 18px 0 0" : 0, background: nv ? "linear-gradient(90deg, #1b2a36, #2c4659 45%, #1b2a36)" : "linear-gradient(90deg, #1c1d22, #2a2b31 45%, #1c1d22)", border: `2px solid ${nv ? "rgba(77,212,255,0.7)" : "#3d3f46"}`, overflow: "hidden" }}>
      {Array.from({ length: Math.floor(hh / 70) }).map((_, i) => (
        <div key={i} style={{ position: "absolute", left: 26, right: 26, top: 24 + i * 70, height: 34, borderRadius: 5, background: nv ? `rgba(77,212,255,${0.14 + 0.12 * ((i + 1) % 2)})` : `rgba(255,220,160,${0.04 + 0.05 * ((i * 7) % 3 === 0 ? 1 : 0)})` }} />
      ))}
    </div>
  );
  const cut = h * 0.62;
  return (
    <>
      {nv ? <div style={{ position: "absolute", left: x - w * 1.5, top: -h - 200, width: w * 3, height: h + 300, background: "radial-gradient(ellipse at 50% 30%, rgba(77,212,255,0.22), transparent 70%)" }} /> : null}
      {split > 0 ? (
        <>
          {body(0, cut, 0, "base")}
          {body(cut, h - cut, split * 900, "top")}
        </>
      ) : (
        body(0, h, 0, "top")
      )}
      {crack > 0 ? (
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          <path d={`M${x - w / 2 - 20},${-cut + 10} L${x - w * 0.2},${-cut - 22} L${x - w * 0.05},${-cut + 18} L${x + w * 0.2},${-cut - 14} L${x + w / 2 + 20},${-cut + 6}`} stroke={RED} strokeWidth={9} fill="none" strokeDasharray={900} strokeDashoffset={900 * (1 - crack)} style={{ filter: `drop-shadow(0 0 16px ${RED})` }} />
        </svg>
      ) : null}
      <div style={{ position: "absolute", left: x + (split > 0 ? split * 270 : 0), top: -h - (sub ? 150 : 90) + (split > 0 ? split * 900 : 0), transform: "translateX(-50%)", textAlign: "center", fontFamily: FONT, whiteSpace: "nowrap" }}>
        <div style={{ fontSize: nv ? 44 : 38, fontWeight: 900, color: nv ? CYAN : "#b8b8b3" }}>{name}</div>
        {sub ? <div style={{ fontSize: 26, fontWeight: 700, color: "#8a8a85" }}>{sub}</div> : null}
      </div>
    </>
  );
};

export const TowerRise: React.FC = () => {
  const t = useT();
  if (t < B(22) || t > B(24) + 0.03) return null;
  const b0 = B(22);
  const k = pr(t, b0 + 0.15, BAR * 1.25, E.inOut);
  const nv = lerp(0.42, 5.35, k);
  const ap = lerp(2.35, 4.3, k);
  const gg = lerp(1.3, 4.2, k);
  const top = -H(nv);
  const keys: Key[] = [
    [b0 - 0.1, { x: -300, y: -600, z: 0.9 }],
    [b0 + 0.15 + BAR * 1.25, { x: -330, y: -2380, z: 0.56 }, E.inOut],
    [B(24) - 0.22, { x: -330, y: -2440, z: 0.58 }, E.lin],
    [B(24) + 0.12, { x: 2600, y: -2440, z: 0.58 }, E.in],
  ];
  const crown = spring(t, b0 + 0.15 + BAR * 1.25, 2, 7);
  const card = pr(t, b0 + BAR * 1.0, 0.45, E.back);
  const year = Math.round(lerp(2022, 2026, k));
  return (
    <Stage keys={keys} drift={0}>
      <Plane>
        <div style={{ position: "absolute", left: -3000, top: 0, width: 6000, height: 2, background: "rgba(244,240,232,0.2)" }} />
        <Building x={-760} w={230} h={H(gg)} tone="peer" name="谷歌" />
        <Building x={-420} w={230} h={H(ap)} tone="peer" name="苹果" />
        <Building x={NV.x} w={NV.w} h={H(nv)} tone="nv" name="英伟达" sub="做显卡的公司" />
        {crown > 0 ? (
          <At x={NV.x} y={top - 260} anchor="c" s={crown}>
            <div style={{ padding: "12px 34px", borderRadius: 20, background: GOLD, color: "#19231f", fontFamily: FONT, fontWeight: 900, fontSize: 64, whiteSpace: "nowrap", boxShadow: "0 0 60px rgba(255,209,102,0.6)" }}>全球第 1</div>
          </At>
        ) : null}
        <At x={NV.x + 230} y={top + 40}>
          <div style={{ fontFamily: FONT, fontSize: 90, fontWeight: 900, color: "rgba(244,240,232,0.5)", fontVariantNumeric: "tabular-nums" }}>{year}</div>
        </At>
        {card > 0 ? (
          <At x={NV.x + 230} y={top + 220} s={card} o={clamp01(card)}>
            <div style={{ padding: "30px 40px", borderRadius: 30, background: "rgba(12,16,22,0.85)", border: "1px solid rgba(255,255,255,0.14)", fontFamily: FONT, whiteSpace: "nowrap" }}>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#b8b8b3" }}>四年前买 1 万元英伟达股票</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 10 }}>
                <span style={{ fontSize: 46, fontWeight: 800, color: "#b8b8b3" }}>今天约</span>
                <Odometer value={lerp(1, 12, pr(t, b0 + BAR * 1.0 + 0.2, 1.2, E.inOut))} size={150} color="#3ddc97" />
                <span style={{ fontSize: 62, fontWeight: 900, color: "#3ddc97" }}>万元</span>
              </div>
            </div>
          </At>
        ) : null}
      </Plane>
      <Words at={b0 + 0.25} lines={["卖显卡的英伟达，"]} x={120} y={150} size={78} kw={["英伟达"]} kwColor={CYAN} />
      <Words at={b0 + 0.25 + BAR * 0.85} lines={["成了全球最值钱的公司。"]} x={120} y={250} size={78} kw={["全球最值钱"]} />
      <Fine at={b0 + 0.6} out={B(24) - 0.1}>
        塔高按市值示意（2022-11 → 2026-10）· 英伟达 2025-07 成为第一家 4 万亿美元公司，2025-10 第一家 5 万亿 · 1 万元 → 约 12 万元为推算，不计分红和税费
      </Fine>
    </Stage>
  );
};

// ── S13 + S14 · the wall across the Pacific; DeepSeek jumps it (B24 → B28) ──
const BRICKS = ["2022.10", "2023.10", "2024.12", "2025.04", "2026.01"];
const WALL_X = 0;
const FLOOR = 300;
export const BOUNCE = B(24) + 0.35 + 5 * BEAT * 0.8;
const HOP0 = B(26) + 1.3;
const Chart: React.FC<{ title: string; color: string; rank: number; names: string[] }> = ({ title, color, rank, names }) => {
  const rowH = 70;
  return (
    <div style={{ width: 430, padding: "22px 24px", borderRadius: 26, background: "rgba(12,14,18,0.82)", border: "1px solid rgba(255,255,255,0.14)", fontFamily: FONT }}>
      <div style={{ fontSize: 30, fontWeight: 900, color, marginBottom: 14 }}>{title}</div>
      <div style={{ position: "relative", height: 5 * rowH }}>
        {names.map((n, i) => {
          const slot = i < rank - 1 ? i : i + 1;
          return (
            <div key={n} style={{ position: "absolute", left: 0, right: 0, top: slot * rowH, height: rowH - 12, display: "flex", alignItems: "center", gap: 16, color: "#b8b8b3", fontSize: 28, fontWeight: 700, opacity: slot >= 5 ? 0 : 1 }}>
              <span style={{ width: 30, color: "#8a8a85" }}>{slot + 1}</span>
              <span style={{ width: 44, height: 44, borderRadius: 11, background: "rgba(244,240,232,0.12)" }} />
              {n}
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 0, right: 0, top: (rank - 1) * rowH, height: rowH - 12, display: "flex", alignItems: "center", gap: 16, fontSize: 30, fontWeight: 900, color: FG, background: rank === 1 ? "rgba(255,209,102,0.18)" : "transparent", borderRadius: 12 }}>
          <span style={{ width: 30, color: rank === 1 ? GOLD : "#8a8a85" }}>{rank}</span>
          <span style={{ width: 44, height: 44, borderRadius: 11, background: "#4d6bfe", boxShadow: "0 0 20px #4d6bfe" }} />
          DeepSeek
        </div>
      </div>
    </div>
  );
};
export const WallJump: React.FC = () => {
  const t = useT();
  if (t < B(24) || t > B(28)) return null;
  const keys: Key[] = [
    [B(24) - 0.15, { x: -800, y: 0, z: 0.9 }],
    [B(24) + 0.3, { x: 0, y: -20, z: 0.9 }, E.out],
    [B(25.5), { x: 0, y: -10, z: 0.94 }, E.lin],
    [B(26) + 0.1, { x: 520, y: -40, z: 1.0 }, E.inOut],
    [HOP0, { x: 540, y: -40, z: 1.02 }, E.lin],
    [HOP0 + 0.75, { x: -520, y: -40, z: 1.0 }, E.inOut],
    [B(28) - 0.15, { x: -540, y: -20, z: 1.04 }, E.lin],
    [B(28) + 0.1, { x: -540, y: -20, z: 1.6 }, E.in],
  ];
  const fly = pr(t, BOUNCE - 0.45, 0.45, E.lin);
  const back = pr(t, BOUNCE, 0.7, E.out);
  const gx = t < BOUNCE ? lerp(-720, WALL_X - 230, fly) : lerp(WALL_X - 230, -820, back);
  const rankAt = (s: number) => Math.max(1, 6 - Math.floor(pr(t, s, 1.0, E.lin) * 6));
  const cn = rankAt(B(26) + 0.15);
  const us = rankAt(HOP0 + 0.7);
  const hop = pr(t, HOP0, 0.75, E.inOut);
  const shake = bump(t, BOUNCE, 0.02, 0.25) * 10;
  return (
    <Stage keys={keys} drift={0} shake={shake}>
      <Plane>
        <At x={-1180} y={-200} o={pr(t, B(24) - 0.1, 0.4)}>
          <Silhouette id="840" w={720} h={460} fill="rgba(77,212,255,0.07)" stroke="rgba(77,212,255,0.55)" />
          <div style={{ position: "absolute", left: 360, top: 470, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 40, fontWeight: 900, color: CYAN, whiteSpace: "nowrap" }}>美国</div>
        </At>
        <At x={480} y={-220} o={pr(t, B(24) - 0.1, 0.4)}>
          <Silhouette id="156" w={680} h={500} fill="rgba(255,159,67,0.07)" stroke="rgba(255,159,67,0.55)" />
          <div style={{ position: "absolute", left: 340, top: 510, transform: "translateX(-50%)", fontFamily: FONT, fontSize: 40, fontWeight: 900, color: "#ff9f43", whiteSpace: "nowrap" }}>中国</div>
        </At>
        {BRICKS.map((d, i) => {
          const at = B(24) + 0.35 + i * BEAT * 0.8;
          const p = pr(t, at - 0.22, 0.22, E.in);
          if (p <= 0) return null;
          const y = FLOOR - (i + 1) * 104;
          const settle = t > at ? 1 + 0.06 * Math.exp(-(t - at) * 12) * Math.cos((t - at) * 40) : 1;
          return (
            <At key={d} x={WALL_X - 110} y={lerp(y - 700, y, p)} s={settle}>
              <div style={{ width: 220, height: 96, borderRadius: 10, background: "linear-gradient(180deg, #6a5646, #3d3029)", border: "2px solid #7e6a58", boxShadow: "0 12px 24px rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT, fontSize: 32, fontWeight: 900, color: "#f0dfca" }}>{d}</div>
            </At>
          );
        })}
        {fly > 0 && back < 1 ? (
          <At x={gx - 100} y={20 - Math.sin(back * Math.PI) * 120} r={t < BOUNCE ? 0 : -50 * back} o={1 - pr(t, BOUNCE + 0.45, 0.25)}>
            <Gpu w={200} t={t} glow={1} id="wall4gpu" />
          </At>
        ) : null}
        {t > BOUNCE ? (
          <At x={WALL_X - 420} y={-80}>
            <Stamp at={BOUNCE + 0.05} text="禁售" color={RED} size={54} rot={-10} />
          </At>
        ) : null}
        <At x={760} y={-330} o={pr(t, B(26) - 0.1, 0.35)}>
          <Chart title="中国区 · 免费榜" color="#ff9f43" rank={cn} names={["应用 A", "应用 B", "应用 C", "应用 D", "应用 E"]} />
        </At>
        <At x={-1190} y={-330} o={pr(t, HOP0 + 0.3, 0.35)}>
          <Chart title="美国区 · 免费榜" color={CYAN} rank={us} names={["ChatGPT", "应用 B", "应用 C", "应用 D", "应用 E"]} />
        </At>
        {hop > 0 && hop < 1 ? (
          <At x={lerp(830, -1120, hop)} y={-220 - Math.sin(hop * Math.PI) * 420} r={hop * -360}>
            <div style={{ width: 70, height: 70, borderRadius: 18, background: "#4d6bfe", boxShadow: "0 0 50px #4d6bfe" }} />
          </At>
        ) : null}
        <At x={-760} y={180}>
          <Stamp at={B(27) + 2 * BEAT} text="2025.01.27 · 中美同时第一" color={GOLD} size={44} rot={-4} bg="rgba(12,13,17,0.92)" />
        </At>
        <Words at={B(24) + 0.15} lines={["最好的 AI 显卡，", "美国不让卖给中国了。"]} x={0} y={-560} size={78} align="center" kw={["不让卖"]} kwColor={RED} kwAt={BOUNCE} out={B(26) - 0.1} outStyle="up" />
      </Plane>
      <Words at={B(26) + 0.25} lines={["中国这边的 DeepSeek，", "用更少的显卡追了上来。"]} x={960} y={70} size={72} align="center" kw={["DeepSeek"]} kwColor="#8aa0ff" />
      <Fine at={B(24) + 0.4} out={B(28) - 0.1}>
        2022 年 10 月起，美国五轮对华先进芯片出口管制（美国联邦公报）· DeepSeek（杭州）2025-01-27 同时登顶中国区、美国区 App Store 免费榜（界面新闻、TechNode）· 榜单其余应用为示意
      </Fine>
    </Stage>
  );
};

// ── S15 · panic (B28 → B29.5): three numbers slam on the beats over a red tape ──
const PANIC = [
  { at: B(28) + 0.05, label: "纳斯达克", v: "−3.1%" },
  { at: B(28) + 2 * BEAT, label: "费城半导体指数", v: "−9.2%" },
  { at: B(29), label: "英伟达", v: "−17%" },
];
export const Panic4: React.FC = () => {
  const t = useT();
  if (t < B(28) - 0.05 || t > B(29.5) + 0.1) return null;
  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 60%, #3a0a0c, #120304 70%)", transform: `scale(${1 + 0.05 * pr(t, B(28), BAR * 1.5, E.lin)})` }}>
      {Array.from({ length: 7 }).map((_, r) => (
        <div key={r} style={{ position: "absolute", left: -400, top: 120 + r * 140, whiteSpace: "nowrap", fontFamily: FONT, fontSize: 46, fontWeight: 900, color: `rgba(255,90,95,${0.12 + 0.06 * (r % 2)})`, transform: `translateX(${((r % 2 ? 1 : -1) * (t - B(28)) * 700) % 600}px)` }}>
          {Array.from({ length: 14 }).map((_, i) => `▼ ${(2 + rnd(`pt${r}-${i}`) * 14).toFixed(1)}%    `).join("")}
        </div>
      ))}
      {PANIC.map((p, i) => {
        const s = pr(t, p.at - 0.1, 0.1, E.in);
        if (s <= 0) return null;
        const live = i === PANIC.length - 1 || t < PANIC[i + 1].at - 0.05;
        const y = [330, 520, 710][i];
        return (
          <div key={i} style={{ position: "absolute", left: 960, top: y, transform: `translate(-50%, -50%) scale(${lerp(1.8, 1, s) * (live ? 1 : 0.92)})`, opacity: s * (live ? 1 : 0.55), display: "flex", alignItems: "baseline", gap: 26, fontFamily: FONT, whiteSpace: "nowrap" }}>
            <span style={{ fontSize: 50, fontWeight: 800, color: "#f0c9c9" }}>{p.label}</span>
            <span style={{ fontSize: 140, fontWeight: 900, color: RED, textShadow: "0 0 60px rgba(255,90,95,0.6)" }}>{p.v}</span>
          </div>
        );
      })}
      <AbsoluteFill style={{ background: "#ff5a5f", opacity: PANIC.reduce((a, p) => a + bump(t, p.at, 0.02, 0.18) * 0.18, 0) }} />
      <Words at={B(28) + 0.1} lines={["美国股市慌了：以后显卡要少买了？"]} x={960} y={880} size={64} align="center" kw={["慌了"]} kwColor={RED} />
      <Fine at={B(28) + 0.2} out={B(29.5)}>
        2025-01-27 收盘：纳斯达克 −3.1%，费城半导体指数 −9.2%，英伟达约 −17%（路透、彭博）· 市场担心低成本模型会减少对芯片的需求
      </Fine>
    </AbsoluteFill>
  );
};

// ── S16 + S17 · the tower cracks, then shoots up (B29.5 → B34) ──
export const CRACK = B(30) + 2 * BEAT;
export const TowerCrack: React.FC = () => {
  const t = useT();
  if (t < B(29.5) - 0.05 || t >= B(34)) return null;
  const crack = pr(t, CRACK, 0.25);
  const split = pr(t, CRACK + 0.2, 0.7, E.in) * (1 - pr(t, B(32) + 0.8, 0.5, E.inOut));
  const regrow = pr(t, B(32) + 1.0, BAR * 0.8, E.inOut);
  const v = lerp(3.49, 4.6, regrow);
  const h = H(v);
  const keys: Key[] = [
    [B(29.5), { x: 520, y: -1600, z: 0.72 }],
    [CRACK, { x: 520, y: -1520, z: 0.73 }, E.lin],
    [CRACK + 0.9, { x: 560, y: -1280, z: 0.66 }, E.out],
    [B(32) + 0.9, { x: 540, y: -1320, z: 0.64 }, E.lin],
    [B(32) + 1.0 + BAR * 0.8, { x: 520, y: -2300, z: 0.6 }, E.inOut],
    [B(34), { x: 520, y: -2420, z: 0.62 }, E.lin],
  ];
  const flag = spring(t, B(32) + 1.0 + BAR * 0.8, 2, 7);
  const shake = bump(t, CRACK, 0.02, 0.4) * 22;
  return (
    <Stage keys={keys} drift={0} shake={shake}>
      <Plane>
        <div style={{ position: "absolute", left: -3000, top: 0, width: 6000, height: 2, background: "rgba(244,240,232,0.2)" }} />
        <Building x={-760} w={230} h={H(3.2)} tone="peer" name="谷歌" />
        <Building x={-420} w={230} h={H(3.4)} tone="peer" name="苹果" />
        <Building x={NV.x} w={NV.w} h={h} tone="nv" name="英伟达" crack={crack * (1 - regrow)} split={split} />
        {/* chat boxes raining down onto the tower */}
        {Array.from({ length: 60 }).map((_, i) => {
          const s0 = B(32) + rnd(`rn${i}`) * BAR * 1.7;
          const p = pr(t, s0, 0.8, E.lin);
          if (p <= 0 || p >= 1) return null;
          const x = -1300 + rnd(`rx${i}`) * 2600;
          return (
            <At key={i} x={x} y={lerp(-4200, -h * rnd(`ry${i}`), p)}>
              <div style={{ width: 90, height: 56, borderRadius: 14, background: i % 4 === 0 ? "rgba(77,212,255,0.6)" : "rgba(244,240,232,0.2)", border: "1.5px solid rgba(244,240,232,0.35)" }} />
            </At>
          );
        })}
        {flag > 0 ? (
          <At x={NV.x} y={-h - 260} anchor="c" s={flag}>
            <div style={{ padding: "12px 34px", borderRadius: 20, background: "#3ddc97", color: "#19231f", fontFamily: FONT, fontWeight: 900, fontSize: 58, whiteSpace: "nowrap", boxShadow: "0 0 60px rgba(61,220,151,0.5)" }}>半年后 · 创新高</div>
          </At>
        ) : null}
      </Plane>
      {/* −4.3 万亿 */}
      <div style={{ position: "absolute", left: 900, top: 420, opacity: pr(t, CRACK + 0.15, 0.3) * (1 - pr(t, B(32) - 0.2, 0.3)), fontFamily: FONT, whiteSpace: "nowrap", textShadow: "0 6px 30px rgba(0,0,0,0.8)" }}>
        <div style={{ fontSize: 32, fontWeight: 800, color: "#d8b8b8" }}>2025 年 1 月 27 日，一天</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 120, fontWeight: 900, color: RED }}>−</span>
          <Odometer value={lerp(0, 4.3, pr(t, CRACK + 0.15, 0.9, E.inOut))} size={136} decimals={1} color={RED} />
          <span style={{ fontSize: 58, fontWeight: 900, color: RED }}>万亿元</span>
        </div>
        <div style={{ fontSize: 28, fontWeight: 700, color: "#a88" }}>美股史上最大的单日跌幅</div>
      </div>
      <Words at={B(29.5) + 0.15} lines={["英伟达这家公司，", "一天少值了 4 万多亿元。"]} x={900} y={140} size={76} kw={["4 万多亿元"]} kwColor={RED} kwAt={CRACK + 0.3} out={B(32) - 0.25} />
      <Words at={B(32) + 0.1} lines={["可 AI 越便宜，用得越多，", "显卡更不够了。"]} x={900} y={140} size={76} kw={["越便宜", "越多"]} kwColor="#3ddc97" />
      <div style={{ position: "absolute", left: 900, top: 350, opacity: pr(t, B(33) - 0.3, 0.4), fontFamily: FONT, fontSize: 34, fontWeight: 800, color: "#b8b8b3", whiteSpace: "nowrap", textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
        谷歌每月处理的 AI 文字量，两年涨了约 330 倍
      </div>
      <Fine at={B(29.5) + 0.3} out={B(34) - 0.1}>
        英伟达 2025-01-27 市值一天跌掉约 5,890 亿美元（Bloomberg），按当时汇率约 4.3 万亿元 · 谷歌每月处理的 token：约 9.7 万亿（2024）→ 3,200 万亿（2026-05，公司自报）
      </Fine>
    </Stage>
  );
};

// ── S18 · the camera rides one stock (B34 → B36) ──
const ZP: [number, number][] = [
  [0, 116],
  [0.08, 131],
  [0.2, 420],
  [0.33, 980],
  [0.45, 1650],
  [0.55, 2980],
  [0.62, 2130],
  [0.7, 1588],
  [0.78, 1136],
  [0.88, 720],
  [1, 485],
];
const ZW = 4200;
const ZH = 1900;
const zx = (u: number) => u * ZW;
const zy = (v: number) => -(v / 3000) * ZH;
const zAt = (u: number) => {
  for (let i = 1; i < ZP.length; i++) if (u <= ZP[i][0]) return lerp(ZP[i - 1][1], ZP[i][1], (u - ZP[i - 1][0]) / (ZP[i][0] - ZP[i - 1][0]));
  return ZP[ZP.length - 1][1];
};
export const Coaster: React.FC = () => {
  const t = useT();
  if (t < B(34) || t > B(36) + 0.4) return null;
  const draw = pr(t, B(34) + 0.1, BAR * 1.55, E.inOut);
  const tip = { x: zx(draw), y: zy(zAt(draw)) };
  const keys: Key[] = [];
  for (let i = 0; i <= 14; i++) {
    const s = B(34) - 0.1 + (i / 14) * (BAR * 1.2);
    const d = pr(s, B(34) + 0.1, BAR * 1.55, E.inOut);
    keys.push([s, { x: zx(d) + 200, y: zy(zAt(d)) + 60, z: 0.66 + 0.06 * Math.sin(d * Math.PI) }, E.lin]);
  }
  keys.push([B(35.7), { x: zx(0.5) + 300, y: -900, z: 0.36 }, E.inOut]);
  keys.push([B(36) + 0.4, { x: zx(0.5) + 300, y: -920, z: 0.38 }, E.lin]);

  const pts = ZP.filter(([u]) => u <= draw).map(([u, v]) => `${zx(u)},${zy(v)}`);
  pts.push(`${tip.x},${tip.y}`);
  const labels: [number, number, string, string][] = [
    [0, 116, "116 · 上市", "#b8b8b3"],
    [0.55, 2980, "▲ 2,980 · 最高", FG],
    [1, 485, "▼ 485 · 10 月", FG],
  ];
  return (
    <Stage keys={keys} drift={0} blur={0.08}>
      <Plane>
        <div style={{ position: "absolute", left: -600, top: 0, width: ZW + 1400, height: 3, background: "rgba(244,240,232,0.25)" }} />
        <svg style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }} width={1} height={1}>
          <polyline points={`${zx(0)},0 ${pts.join(" ")} ${tip.x},0`} fill="rgba(255,209,102,0.08)" stroke="none" />
          <polyline points={pts.join(" ")} fill="none" stroke={GOLD} strokeWidth={14} strokeLinejoin="round" strokeLinecap="round" style={{ filter: "drop-shadow(0 0 20px rgba(255,209,102,0.7))" }} />
          <circle cx={tip.x} cy={tip.y} r={22} fill={GOLD} />
        </svg>
        {labels.map(([u, v, s, c]) =>
          draw >= u ? (
            <At key={s} x={zx(u)} y={zy(v) - 170} anchor="c">
              <Tag at={B(34) + 0.1 + u * BAR * 1.4} text={s} color={c} size={110} align="center" />
            </At>
          ) : null,
        )}
        <At x={zx(0) - 200} y={zy(116) + 60}>
          <div style={{ fontFamily: FONT, fontSize: 110, fontWeight: 900, color: FG, whiteSpace: "nowrap" }}>
            智谱 <span style={{ fontSize: 70, color: "#8a8a85", fontWeight: 700 }}>中国大模型公司 · 港股</span>
          </div>
        </At>
      </Plane>
      <Words at={B(34) + 0.05} lines={["国内一只 AI 股，"]} x={120} y={130} size={80} />
      <Words at={B(34) + 1.45} lines={["半年涨 25 倍，"]} x={120} y={232} size={80} kw={["涨 25 倍"]} />
      <Words at={B(34) + 2.5} lines={["又跌八成。"]} x={120} y={334} size={80} kw={["跌八成"]} kwColor={RED} />
      <div style={{ position: "absolute", left: 0, right: 0, top: 960, display: "flex", justifyContent: "center", gap: 80, fontFamily: FONT, fontSize: 30, fontWeight: 800, color: GOLD, whiteSpace: "nowrap" }}>
        {["寒武纪的股价一度超过茅台", "国内 1,112 款 AI 产品完成备案"].map((s, i) => {
          const p = pr(t, B(35) + i * 2 * BEAT, 0.4);
          return (
            <span key={s} style={{ opacity: p * (1 - pr(t, B(36) - 0.1, 0.3)), transform: `translateY(${(1 - p) * 14}px)`, textShadow: "0 4px 20px rgba(0,0,0,0.8)" }}>
              ◆ {s}
            </span>
          );
        })}
      </div>
      <Fine at={B(34) + 0.3} out={B(36) - 0.1}>
        智谱（02513.HK）：发行价 116.2 港元（2026-01-08）→ 盘中最高 2,980（2026-06-22）→ 收盘 484.8（2026-10-20）；曲线中段为示意 · 寒武纪 2025-08 起多次超过茅台 · 国家网信办备案 1,112 款（2026-08）
      </Fine>
    </Stage>
  );
};
