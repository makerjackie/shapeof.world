import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { Elevation } from "../art/Elevation";
import { EBACK, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { Box } from "../ui";

// Fixed end (STYLE.md 三、6): sources → making-of → brand card, over the tower at night, dimmed.

const NOTES = [
  "回本为静态估算：按深圳能源大厦预算 29.36 亿元、计容面积 96,420㎡，假设整栋按 2026 年市场租金出租，租金不涨，扣运营成本、大修和各项税。",
  "空置率、租金为各机构的深圳甲级写字楼口径，各家数字不同，取区间。楼面地价 = 成交价 ÷ 规定建筑面积。楼宇税收为全口径，按纳税人注册地统计。",
];

const SOURCES = [
  "深圳能源 · 竞买、竞得总部大楼用地公告；投资深圳国际能源大厦项目公告；关联租赁公告；2011–2025 年报 · 2008–2026",
  "深圳市建筑设计研究总院 · 能源大厦项目页　｜　仲量联行 · 深圳写字楼市场 2025 年回顾 · 2026",
  "深圳市规划和自然资源局 · 年度建设用地供应计划 · 2026　｜　深圳市人民政府令第 329 号 · 2020",
  "澎湃新闻 · K602-0016 出让公告 · 2025　｜　第一财经 · 南山粤海街道住宅地成交 · 2026",
  "高力国际、仲量联行、戴德梁行、第一太平戴维斯、莱坊 · 深圳写字楼市场报告 · 2025–2026",
  "《城市房地产管理法》第二十二条　｜　福田区人民政府 · 福田概况 · 2026",
  "地图数据 © OpenStreetMap contributors（ODbL）　｜　高度与竣工年：CTBUH Skyscraper Center · 2026",
];

const Dimmed: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, opacity: 0.14 }}>
    <Elevation x={1380} ground={1000} s={3.5} look="night" lit={(_t, f, i) => (random(`end${f}-${i}`) < 0.7 ? 1 : 0)} />
  </div>
);

export const Sources: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={130} y={130} style={{ gap: 16 }} w={1660}>
      <In at={0} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg }}>口径与假设</div>
      </In>
      {NOTES.map((t, i) => (
        <In key={i} at={0.4 + i * 0.3} from="up">
          <div style={{ fontFamily: FONT, fontSize: 25, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={1.2} from="up">
        <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 900, color: K.fg, marginTop: 24 }}>来源</div>
      </In>
      {SOURCES.map((t, i) => (
        <In key={i} at={1.5 + i * 0.2} from="up">
          <div style={{ fontFamily: FONT, fontSize: 23, fontWeight: 500, color: K.sub, lineHeight: 1.45 }}>{t}</div>
        </In>
      ))}
      <In at={3.2} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 23, fontWeight: 500, color: K.muted, marginTop: 18 }}>数据截至 2026 年 10 月 · 不构成投资建议</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const MAKING: [string, string][] = [
  ["选题与撰稿", "MakerJackie"],
  ["数据核对", "MakerJackie"],
  ["画面", "代码逐帧渲染"],
  ["配乐", "《千年之后（氛围版）》和乐府"],
  ["制作", "MakerJackie"],
];

export const Making: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <Box x={960} y={320} cx style={{ gap: 14 }}>
      {MAKING.map(([r, n], i) => (
        <In key={r} at={i * 0.25} from="up">
          <div style={{ display: "flex", fontFamily: FONT, alignItems: "baseline" }}>
            <div style={{ width: 300, textAlign: "right", paddingRight: 36, fontSize: 34, fontWeight: 700, color: K.muted }}>{r}</div>
            <div style={{ width: 640, fontSize: 44, fontWeight: 700, color: K.fg }}>{n}</div>
          </div>
        </In>
      ))}
      <In at={1.6} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: K.sub, marginTop: 30 }}>代码逐帧渲染 · Claude 协作 · 配乐取自 music.01mvp.com</div>
      </In>
    </Box>
  </AbsoluteFill>
);

const FROM = Array.from("高楼的形状");
const TO = Array.from("世界的形状");

// The title turns into 世界的形状, the orb lands, then the slogan and the name.
export const BrandCard: React.FC = () => {
  const frame = useBeatFrame();
  const mark = progAt(frame, 1.4, 1.6, EBACK);
  const halo = progAt(frame, 1.4, 2, EO);
  const slogan = progAt(frame, 3, 1, EO);
  const name = progAt(frame, 4.5, 1, EO);
  const size = 150;
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <div style={{ position: "absolute", left: 960 - 130, top: 150, width: 260, height: 260 }}>
          <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.22 * halo}) 0%, rgba(140,196,212,${0.08 * halo}) 45%, transparent 70%)` }} />
          <Img src={staticFile("mark-disc.png")} style={{ width: 260, height: 260, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -60}px) scale(${0.7 + 0.3 * mark})` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 480, display: "flex", justifyContent: "center", gap: 6, perspective: 1400 }}>
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
      <div style={{ position: "absolute", left: 0, right: 0, top: 720, display: "flex", justifyContent: "center", opacity: slogan, transform: `translateY(${(1 - slogan) * 20}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: K.sub, letterSpacing: 10, whiteSpace: "nowrap" }}>看见世界如何运行</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 830, display: "flex", justifyContent: "center", opacity: name }}>
        <div style={{ fontFamily: FONT, fontSize: 30, fontWeight: 700, color: K.muted, letterSpacing: 4 }}>MakerJackie</div>
      </div>
    </AbsoluteFill>
  );
};
