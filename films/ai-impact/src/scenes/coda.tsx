import React from "react";
import { AbsoluteFill, Img, staticFile } from "remotion";
import { EBACK, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { Lanes, LANE_BOX } from "../lanes";
import { FONT, K, SERIF } from "../theme";
import { Head } from "../ui";

const CODA_BOX = { ...LANE_BOX, y: 372, h: 510 };

// ───────── 升华 1: four years is exactly one university class ─────────

export const Cohort: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 0.6 }}>
        <Lanes box={CODA_BOX} cohort={progAt(frame, 1, 4, EIO)} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 128 }}>
        <Head at={0} size={84} parts={["四年，正好是", { t: "一届大学生", c: K.theme }, "。"]} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 236 }}>
        <In at={2.6} from="up">
          <div style={{ fontFamily: FONT, fontSize: 40, fontWeight: 700, color: K.sub, whiteSpace: "nowrap" }}>入学那年秋天，还没有 ChatGPT；毕业这年，英国 95% 的大学生在用 AI。</div>
        </In>
      </div>
      <div style={{ position: "absolute", left: 48, bottom: 40, fontFamily: FONT, fontSize: 22, fontWeight: 500, color: K.muted, opacity: progAt(frame, 4, 0.6) }}>HEPI 学生 AI 调查 2026（英国本科生，用过任一种 AI 工具）</div>
    </AbsoluteFill>
  );
};

// ───────── 升华 2: the world they walk out into has already rerouted money, chips and power ─────────

export const Rerouted: React.FC = () => {
  const frame = useBeatFrame();
  const glow = progAt(frame, 1.6, 1.2, EO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 0.85 }}>
        <Lanes box={CODA_BOX} focus="work" dimOthers={0} flash={glow * (0.6 + 0.4 * Math.sin(frame / 9))} dot={1} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 128, display: "flex", flexDirection: "column", gap: 14 }}>
        <Head at={0} size={68} parts={["他们走出校门时，"]} />
        <Head at={1.4} size={80} parts={[{ t: "钱", c: K.money }, "、", { t: "芯片", c: K.chip }, "、", { t: "电", c: K.power }, "，已经为 AI 改了道。"]} />
      </div>
    </AbsoluteFill>
  );
};

// ───────── 升华 3: work changes not by firing someone, but by hiring one fewer newcomer ─────────

export const NewHire: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 0.85 }}>
        <Lanes box={CODA_BOX} focus="work" dimOthers={0.85} young={progAt(frame, 0.5, 2.5, EIO)} />
      </div>
      <div style={{ position: "absolute", left: 120, top: 128, display: "flex", flexDirection: "column", gap: 14 }}>
        <Head at={0} size={68} parts={["工作的变化，"]} />
        <Head at={1.2} size={80} parts={["不从裁掉谁开始，", { t: "从少招一个新人开始", c: K.gold }, "。"]} />
      </div>
    </AbsoluteFill>
  );
};

// ───────── 落句: it did not replace anyone first; it replaced the starting line ─────────

export const Final: React.FC = () => {
  const frame = useBeatFrame();
  const p = progAt(frame, 2, 1.2, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", inset: 0, opacity: 0.16 }}>
        <Lanes box={CODA_BOX} labels={false} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <Head at={0} size={84} parts={["它没有先换掉谁。"]} />
        <div style={{ opacity: Math.min(1, p * 1.4), transform: `scale(${0.9 + 0.1 * p})` }}>
          <Head at={2} size={124} parts={["它先换掉了", { t: "起点", c: K.gold }, "。"]} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ───────── Fixed end: sources → making-of → brand card ─────────

const NOTES = [
  "资本开支 2026 年为各公司指引，口径不一；估值、周活、运行率、平台占比为公司自报；Anthropic 的数字是 Anthropic 自己的数据，本片作者 Claude 是 Anthropic 的模型。",
  "年龄剪刀差来自美国 ADP 工资单，作者称是描述性证据、不是因果；曲线由论文图读出，终点用正文数。所有预测均为预测，本片预测为趋势外推。",
];

const SOURCES = [
  "英伟达、微软、Alphabet、亚马逊、Meta、阿里、腾讯、SK 海力士财报 · 2022–2026　｜　Anthropic、OpenAI 融资公告 · 2024–2026",
  "Stack Exchange API · 2026　｜　TrendForce / DRAMeXchange · 2022–2026　｜　Counterpoint · 2026　｜　Tom's Hardware · 2026",
  "美国联邦公报 BIS 规则 · 2022–2026　｜　商务部公告 · 2025　｜　Hugging Face · 2026　｜　Stanford AI Index · 2026　｜　CNNIC · 2026",
  "IEA《Energy and AI》· 2025、2026　｜　PJM 容量拍卖 · 2022–2026　｜　Constellation、Talen、NextEra · 2024–2025",
  "METR · 2026　｜　OpenAI、谷歌（自报）· 2023–2026　｜　Deezer · 2025–2026　｜　Gallup · 2026　｜　HEPI · 2026",
  "Brynjolfsson、Chandar & Chen · 2026　｜　美国劳工统计局 · 2026　｜　Yale Budget Lab · 2026　｜　Challenger, Gray & Christmas · 2026",
  "AI Futures · 2026　｜　Metaculus　｜　AI Impacts · 2026　｜　Altman、Amodei、Hassabis、Karpathy 原话 · 2024–2026",
];

const Dimmed: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
    <Lanes box={CODA_BOX} labels={false} />
  </div>
);

export const Sources: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <div style={{ position: "absolute", left: 130, top: 130, width: 1660, display: "flex", flexDirection: "column", gap: 14, fontFamily: FONT }}>
      <In at={0} from="up">
        <div style={{ fontSize: 40, fontWeight: 900, color: K.fg }}>口径与假设</div>
      </In>
      {NOTES.map((t, i) => (
        <In key={i} at={0.3 + i * 0.3} from="up">
          <div style={{ fontSize: 25, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={1.1} from="up">
        <div style={{ fontSize: 40, fontWeight: 900, color: K.fg, marginTop: 22 }}>来源</div>
      </In>
      {SOURCES.map((t, i) => (
        <In key={i} at={1.3 + i * 0.2} from="up">
          <div style={{ fontSize: 23, fontWeight: 500, color: K.sub, lineHeight: 1.45 }}>{t}</div>
        </In>
      ))}
      <In at={3} from="fade">
        <div style={{ fontSize: 23, fontWeight: 500, color: K.muted, marginTop: 18 }}>数据截至 2026 年 10 月 22 日 · 不构成投资建议</div>
      </In>
    </div>
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
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      {MAKING.map(([r, n], i) => (
        <In key={r} at={i * 0.2} from="up">
          <div style={{ display: "flex", fontFamily: FONT, alignItems: "baseline" }}>
            <div style={{ width: 300, textAlign: "right", paddingRight: 36, fontSize: 34, fontWeight: 700, color: K.muted }}>{r}</div>
            <div style={{ width: 560, fontSize: 42, fontWeight: 700, color: K.fg, whiteSpace: "nowrap" }}>{n}</div>
          </div>
        </In>
      ))}
      <In at={1.4} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: K.sub, marginTop: 30 }}>代码逐帧渲染 · Claude 协作</div>
      </In>
    </div>
  </AbsoluteFill>
);

const FROM = "AI 到底改变了什么";
const TO = "世界的形状";

// The title folds away character by character and 世界的形状 folds in, the orb lands, then the slogan.
export const BrandCard: React.FC = () => {
  const frame = useBeatFrame();
  const mark = progAt(frame, 2.2, 1.6, EBACK);
  const halo = progAt(frame, 2.2, 2, EO);
  const slogan = progAt(frame, 3.8, 1, EO);
  const from = Array.from(FROM);
  const to = Array.from(TO);
  return (
    <AbsoluteFill>
      {mark > 0 ? (
        <div style={{ position: "absolute", left: 960 - 130, top: 170, width: 260, height: 260 }}>
          <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.22 * halo}) 0%, rgba(140,196,212,${0.08 * halo}) 45%, transparent 70%)` }} />
          <Img src={staticFile("mark-disc.png")} style={{ width: 260, height: 260, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -60}px) scale(${0.7 + 0.3 * mark})` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 500, height: 190, perspective: 1400 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", justifyContent: "center" }}>
          {from.map((ch, i) => {
            const q = progAt(frame, 0.2 + i * 0.08, 0.6, EIO);
            return (
              <span key={i} style={{ display: "inline-block", fontFamily: FONT, fontWeight: 900, fontSize: 130, color: K.fg, whiteSpace: "pre", transform: `rotateX(${q * 90}deg)`, opacity: q < 1 ? 1 : 0, letterSpacing: -2 }}>
                {ch}
              </span>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 0, display: "flex", justifyContent: "center", gap: 8 }}>
          {to.map((ch, i) => {
            const q = progAt(frame, 1.1 + i * 0.12, 0.7, EIO);
            return (
              <span key={i} style={{ display: "inline-block", fontFamily: SERIF, fontWeight: 700, fontSize: 150, color: K.fg, transform: `rotateX(${(q - 1) * 90}deg)`, opacity: q > 0 ? 1 : 0 }}>
                {ch}
              </span>
            );
          })}
        </div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 740, display: "flex", justifyContent: "center", opacity: slogan, transform: `translateY(${(1 - slogan) * 20}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 52, fontWeight: 600, color: K.sub, letterSpacing: 10, whiteSpace: "nowrap" }}>看见世界如何运行</div>
      </div>
    </AbsoluteFill>
  );
};
