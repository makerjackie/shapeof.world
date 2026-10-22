import React from "react";
import { AbsoluteFill, Img, interpolate, random, staticFile } from "remotion";
import { EnergyTower, Ground, makeSkyline, Skyline } from "../art";
import { CL, EBACK, EIO, EO, In, Odometer, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { FPB } from "../timing";
import { Box, Cap, Head, Src } from "../ui";

const nightLit = (f: number, c: number) => (random(`night${f}-${c}`) < 0.82 ? 0.75 : 0.1);

// Why the owner built it: six tenths for itself, its own headquarters (north tower floors 29–41).
export const Own: React.FC = () => {
  const frame = useBeatFrame();
  const hl = progAt(frame, 3, 1, EO);
  const own = (f: number) => f >= 28 && f <= 40;
  return (
    <AbsoluteFill>
      <Ground y={960} />
      <EnergyTower
        cx={1400}
        ground={960}
        progress={1}
        crane={false}
        lit={(f, c) => (own(f) ? 0.4 + 0.6 * hl : random(`own${f}-${c}`) < 0.5 ? 0.35 : 0)}
        hue={(f) => (own(f) && hl > 0.05 ? K.theme : undefined)}
      />
      <Box x={130} y={320} style={{ gap: 26 }}>
        <Head at={0} parts={["那它图什么？"]} size={68} />
        <Head at={1.5} parts={["六成自己用——"]} size={80} />
        <Head at={3} parts={["这是它", { t: "自己的总部", c: K.theme }, "。"]} size={92} />
      </Box>
      <Src>深圳能源公告 2008、2010、2018 · 出让条件：六成以上自用 · 北塔 29–41 层自用</Src>
    </AbsoluteFill>
  );
};

const SKY2 = makeSkyline("city", 40, -20, 1960, 120, 420);

export const City: React.FC = () => (
  <AbsoluteFill>
    <Skyline towers={SKY2} ground={1040} seed="city" litFrac={0.45} opacity={0.5} />
    <Box x={960} y={330} cx style={{ gap: 30 }}>
      <Head at={0} parts={["城市图什么？"]} size={68} />
      <Head at={1.5} parts={["从来不是", { t: "租金", c: K.theme }, "。"]} size={120} />
    </Box>
  </AbsoluteFill>
);

// 159 buildings in Futian whose companies each pay over 1 亿 a year; three pay over 100 亿.
const N = 159;
const FUTIAN = Array.from({ length: N }, (_, i) => ({
  h: 90 + random(`ft${i}`) ** 1.8 * 300,
  big: i === 41 || i === 87 || i === 128,
}));

export const Futian: React.FC = () => {
  const frame = useBeatFrame();
  const count = interpolate(frame, [0.3 * FPB, 3.2 * FPB], [0, N], { ...CL, easing: EO });
  const big = progAt(frame, 6, 1, EBACK);
  const w = 1840 / N;
  return (
    <AbsoluteFill>
      <Ground y={1000} />
      {FUTIAN.map((t, i) => {
        const on = i < count ? 1 : 0;
        const tall = t.big ? t.h * (1 + 0.55 * big) : t.h;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 40 + i * w,
              top: 1000 - tall,
              width: w - 3,
              height: tall,
              background: t.big && big > 0.05 ? K.theme : on ? K.lit : "#1b2430",
              opacity: t.big && big > 0.05 ? 1 : on ? 0.55 : 0.6,
              borderRadius: "2px 2px 0 0",
            }}
          />
        );
      })}
      <Box x={130} y={170} style={{ gap: 12 }}>
        <Cap at={0} size={44} color={K.sub}>福田</Cap>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <Odometer value={count} size={180} />
          <span style={{ fontFamily: FONT, fontSize: 80, fontWeight: 900 }}>栋楼</span>
        </div>
        <Cap at={1.5} size={48} color={K.fg}>楼里的企业，每年交税过亿</Cap>
        <Cap at={6} size={48} color={K.theme}>其中 3 栋以上，过百亿</Cap>
      </Box>
      <Src>福田区人民政府 · 福田概况 · 2026 · 税收亿元楼宇按纳税人注册地统计</Src>
    </AbsoluteFill>
  );
};

// Night. People stream in, the windows light up: the bet.
export const Bet: React.FC = () => {
  const frame = useBeatFrame();
  const glow = progAt(frame, 0, 6, EIO);
  const people = Array.from({ length: 70 }, (_, i) => {
    const speed = 2.2 + random(`pv${i}`) * 2.5;
    const start = random(`ps${i}`) * 400;
    const fromLeft = random(`pd${i}`) < 0.5;
    const t = ((frame * speed + start) % 700) / 700;
    const x = fromLeft ? interpolate(t, [0, 1], [-40, 1180]) : interpolate(t, [0, 1], [1960, 1500]);
    return { x, y: 958 - random(`py${i}`) * 10, o: t < 0.92 ? 0.9 : (1 - t) * 10 };
  });
  return (
    <AbsoluteFill>
      <Ground y={962} />
      <EnergyTower cx={1340} ground={962} progress={1} crane={false} lit={(f, c) => (random(`bet${f}-${c}`) < 0.25 + 0.7 * glow ? 0.8 : 0)} />
      {people.map((p, i) => (
        <div key={i} style={{ position: "absolute", left: p.x, top: p.y - 14, width: 7, height: 14, borderRadius: 4, background: K.fg, opacity: p.o * 0.75 }} />
      ))}
      <Box x={130} y={250} style={{ gap: 26 }}>
        <Head at={0} parts={["你每天走进去的那栋楼，"]} size={80} />
        <Head at={2} parts={["是一座城市", { t: "十年前下的注", c: K.theme }, "。"]} size={80} />
      </Box>
    </AbsoluteFill>
  );
};

// The claim, restated with its reason.
export const Final: React.FC = () => (
  <AbsoluteFill>
    <div style={{ position: "absolute", inset: 0, opacity: 0.22 }}>
      <EnergyTower cx={1620} ground={962} progress={1} crane={false} lit={nightLit} />
    </div>
    <Box x={960} y={360} cx style={{ gap: 40 }}>
      <Head at={0} parts={["高楼不是盖来收租的。"]} size={84} />
      <Head at={2} parts={["它赌的，", { t: "是你会来", c: K.gold }, "。"]} size={120} />
    </Box>
  </AbsoluteFill>
);

// ---------- Fixed end sequence: sources → making-of → brand card ----------

const NOTES = [
  "回本为静态估算：按深圳能源大厦预算 29.36 亿元、计容面积 96,420㎡，假设整栋按 2026 年市场租金出租，租金不涨，扣运营成本、大修和各项税。",
  "空置率、租金为各机构的深圳甲级写字楼口径，各家数字不同，取区间。地价按楼面地价。",
];

const SOURCES = [
  "深圳能源 · 竞买、竞得总部大楼用地公告；投资深圳国际能源大厦项目公告；关联租赁公告；2011–2025 年报 · 2008–2026",
  "澎湃新闻 · 南山 K602-0016 宗地出让公告 · 2025　｜　第一财经 · 南山粤海街道住宅地成交 · 2026",
  "深圳市人民政府 · 社会投资建设项目报建登记实施办法（令第 329 号）· 2020　｜　深圳市政府办公厅 · 审批事项目录 · 2018",
  "高力国际、仲量联行、戴德梁行、第一太平戴维斯 · 深圳写字楼市场报告 · 2026",
  "《城市房地产管理法》第二十二条　｜　福田区人民政府 · 福田概况 · 2026　｜　CTBUH · The Skyscraper Center · 2026",
];

const Dimmed: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, opacity: 0.12 }}>
    <EnergyTower cx={1620} ground={962} progress={1} crane={false} lit={nightLit} />
  </div>
);

export const Sources: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={130} y={140} style={{ gap: 18 }} w={1660}>
      <In at={0} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg }}>口径与假设</div>
      </In>
      {NOTES.map((t, i) => (
        <In key={i} at={0.4 + i * 0.3} from="up">
          <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={1.2} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg, marginTop: 30 }}>来源</div>
      </In>
      {SOURCES.map((t, i) => (
        <In key={i} at={1.5 + i * 0.25} from="up">
          <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={3} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 24, fontWeight: 500, color: K.muted, marginTop: 24 }}>数据截至 2026 年 10 月 21 日 · 不构成投资建议</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const MAKING: [string, string][] = [
  ["选题与撰稿", "MakerJackie"],
  ["数据核对", "MakerJackie"],
  ["画面", "代码逐帧渲染"],
  ["配乐", "原创，代码生成"],
  ["制作", "MakerJackie"],
];

export const Making: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={960} y={330} cx style={{ gap: 14 }}>
      {MAKING.map(([r, n], i) => (
        <In key={r} at={i * 0.25} from="up">
          <div style={{ display: "flex", fontFamily: FONT, alignItems: "baseline" }}>
            <div style={{ width: 300, textAlign: "right", paddingRight: 36, fontSize: 34, fontWeight: 700, color: K.muted }}>{r}</div>
            <div style={{ width: 420, fontSize: 44, fontWeight: 700, color: K.fg }}>{n}</div>
          </div>
        </In>
      ))}
      <In at={1.6} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: K.sub, marginTop: 30 }}>代码逐帧渲染 · Claude 协作</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const FROM = Array.from("高楼的形状");
const TO = Array.from("世界的形状");

// The title turns into 世界的形状, the orb lands, then the slogan. The audio logo plays on beat 0.
export const BrandCard: React.FC = () => {
  const frame = useBeatFrame();
  const mark = progAt(frame, 1.4, 1.6, EBACK);
  const halo = progAt(frame, 1.4, 2, EO);
  const slogan = progAt(frame, 3, 1, EO);
  const size = 150;
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <div style={{ position: "absolute", left: 960 - 130, top: 170, width: 260, height: 260 }}>
          <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.22 * halo}) 0%, rgba(140,196,212,${0.08 * halo}) 45%, transparent 70%)` }} />
          <Img src={staticFile("mark-disc.png")} style={{ width: 260, height: 260, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -60}px) scale(${0.7 + 0.3 * mark})` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", gap: 6, perspective: 1400 }}>
        {FROM.map((ch, i) => {
          const q = progAt(frame, 0.3 + i * 0.12, 0.9, EIO);
          const front = q < 0.5;
          const ang = front ? q * 180 : (q - 1) * 180;
          return (
            <div key={i} style={{ width: size * 1.02, height: size * 1.25, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateX(${ang}deg)` }}>
              <span style={{ fontFamily: front ? FONT : SERIF, fontWeight: front ? 900 : 700, fontSize: size, color: K.fg, lineHeight: 1 }}>{front ? ch : TO[i]}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", opacity: slogan, transform: `translateY(${(1 - slogan) * 20}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: K.sub, letterSpacing: 10, whiteSpace: "nowrap" }}>看见世界如何运行</div>
      </div>
    </AbsoluteFill>
  );
};
