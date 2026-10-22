import React from "react";
import { AbsoluteFill, Img, random, staticFile } from "remotion";
import { Scribble, Section, Sheet, Tick } from "../art/paper";
import { EBACK, EIO, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { Head } from "../ui";

// ---------- S19 · twelve years of practising one thing ----------

const GRADES = ["一年级", "二年级", "三年级", "四年级", "五年级", "六年级", "初一", "初二", "初三", "高一", "高二", "高三"];

const Stack: React.FC<{ n: number; x: number; base: number; p: number; label: string; last: boolean }> = ({ n, x, base, p, label, last }) => {
  const shown = Math.round(n * p);
  return (
    <div style={{ position: "absolute", left: x, top: 0 }}>
      {Array.from({ length: shown }, (_, k) => (
        <div
          key={k}
          style={{
            position: "absolute",
            left: (random(`st${label}${k}`) - 0.5) * 10,
            top: base - (k + 1) * 9,
            width: 104,
            height: 8,
            background: k % 2 ? K.paper : K.paperLo,
            borderRadius: 1,
            boxShadow: "0 1px 0 rgba(0,0,0,0.35)",
          }}
        />
      ))}
      <div style={{ position: "absolute", left: 0, width: 104, top: base + 14, textAlign: "center", fontFamily: FONT, fontSize: 22, fontWeight: 700, color: last ? K.fg : K.muted }}>{label}</div>
      {last && p > 0.98 ? (
        <div style={{ position: "absolute", left: 6, top: base - n * 9 - 52, fontFamily: FONT, fontWeight: 900, fontSize: 24, padding: "4px 12px", borderRadius: 6, background: K.paper, color: K.ink }}>高考</div>
      ) : null}
    </div>
  );
};

export const Years: React.FC = () => {
  const frame = useBeatFrame();
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 150, display: "flex", flexDirection: "column", gap: 16 }}>
        <Head at={0} parts={["我们上了十几年学，"]} size={78} />
        <Head at={2.5} parts={["练的都是同一件事：", { t: "答题", c: K.ink, hl: K.paper }, "。"]} size={78} />
      </div>
      {GRADES.map((g, i) => (
        <Stack key={g} n={14 + i * 4} x={150 + i * 137} base={930} p={progAt(frame, 1 + i * 0.4, 1.2, EO)} label={g} last={i === GRADES.length - 1} />
      ))}
    </AbsoluteFill>
  );
};

// ---------- S20 · the hardest answering exam: AI at the gold line ----------

export const Medal: React.FC = () => {
  const frame = useBeatFrame();
  const medal = progAt(frame, 4, 0.8, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 300, display: "flex", flexDirection: "column", gap: 18 }}>
        <Head at={0} parts={["最难的答题考试，"]} size={80} />
        <Head at={2} parts={[{ t: "AI", c: K.aiHi }, " 也拿到了金牌分数。"]} size={80} />
        <In at={4.5} from="fade">
          <div style={{ fontFamily: FONT, fontSize: 28, color: K.sub, marginTop: 10 }}>国际数学奥林匹克 2025 · 35 分正好是金牌线</div>
        </In>
      </div>
      <Sheet x={1080} y={150} w={700} h={760} rot={1.5}>
        <div style={{ position: "absolute", left: 74, top: 36, right: 30, fontSize: 32, fontWeight: 900 }}>国际数学奥林匹克 · 2025</div>
        <div style={{ position: "absolute", left: 74, top: 86, fontSize: 22, color: K.inkSoft }}>成绩单</div>
        <div style={{ position: "absolute", left: 74, right: 30, top: 130, borderTop: `3px double ${K.ink}` }} />
        {[
          ["考生", "Gemini Deep Think"],
          ["单位", "Google DeepMind"],
          ["题目", "6 道"],
          ["解出", "5 道"],
          ["评分", "IMO 协调员官方评分"],
        ].map(([k, v], i) => (
          <In key={k} at={1 + i * 0.4} from="fade">
            <div style={{ position: "absolute", left: 74, top: 156 + i * 58, display: "flex", gap: 30, fontSize: 28 }}>
              <span style={{ width: 70, color: K.inkSoft }}>{k}</span>
              <span style={{ fontFamily: FONT, fontWeight: 700 }}>{v}</span>
            </div>
          </In>
        ))}
        <div style={{ position: "absolute", left: 74, top: 470, fontSize: 26, color: K.inkSoft }}>得分</div>
        <In at={3} from="scale">
          <div style={{ position: "absolute", left: 74, top: 506, fontFamily: FONT, fontWeight: 900, fontSize: 150, letterSpacing: -4, lineHeight: 1 }}>
            35<span style={{ fontSize: 70, color: K.inkSoft }}> / 42</span>
          </div>
        </In>
        {medal > 0 ? (
          <div style={{ position: "absolute", left: 470, top: 470, width: 170, height: 170, transform: `rotate(${-12 + 12 * medal}deg) scale(${1.6 - 0.6 * medal})`, opacity: Math.min(1, medal * 2) }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #fff3c4, ${K.gold} 45%, #b88a1c 100%)`, boxShadow: `0 0 40px ${K.gold}88` }} />
            <div style={{ position: "absolute", inset: 18, borderRadius: "50%", border: "3px solid rgba(120,80,0,0.45)" }} />
            <div style={{ position: "absolute", left: 0, right: 0, top: 58, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 44, color: "#6b4a00" }}>金牌</div>
          </div>
        ) : null}
        <div style={{ position: "absolute", left: 74, bottom: 26, fontFamily: FONT, fontSize: 17, color: K.inkFaint }}>Google DeepMind 2025-07-21 · IMO 主席 Gregor Dolinar 确认</div>
      </Sheet>
    </AbsoluteFill>
  );
};

// ---------- S21 · the two subjects left: set a question worth answering, recognise a right answer ----------

const MainSheet: React.FC<{ x: number; y: number; glow: number; river: number; dimAnswer: number }> = ({ x, y, glow, river, dimAnswer }) => (
  <>
    {river > 0 ? (
      <div style={{ position: "absolute", left: x + 70, top: y + 330, width: 600, height: 1200, background: `linear-gradient(180deg, ${K.ai}55, ${K.ai}00)`, opacity: river, transformOrigin: "50% 0", transform: `scaleY(${river})` }}>
        <div style={{ position: "absolute", left: 20, top: 40 }}>
          <Scribble w={560} lines={18} lineH={36} progress={18 * river} seed="river" color={K.aiHi} />
        </div>
      </div>
    ) : null}
    <Sheet x={x} y={y} w={700} h={872} rot={1.2}>
      <Section n="一" title="出题" who="人" style={{ position: "absolute", left: 70, top: 60 }} />
      <div style={{ position: "absolute", left: 92, top: 112, fontSize: 27, lineHeight: 1.6 }}>
        1. 要做成什么？
        <br />
        2. 怎样才算做好？
      </div>
      <div style={{ position: "absolute", left: 54, right: 14, top: 44, height: 180, borderRadius: 10, border: `5px solid ${K.gold}`, boxShadow: `0 0 40px ${K.gold}`, opacity: glow }} />
      <Section n="二" title="答题" who="AI" style={{ position: "absolute", left: 70, top: 262 }} />
      <div style={{ position: "absolute", left: 82, top: 318, opacity: 1 - 0.75 * dimAnswer }}>
        <Scribble w={570} lines={8} lineH={36} progress={8} seed="claim" />
      </div>
      <Section n="三" title="阅卷" who="人" style={{ position: "absolute", left: 70, top: 640 }} />
      <div style={{ position: "absolute", left: 92, top: 694, fontSize: 27 }}>对不对？好不好？</div>
      <div style={{ position: "absolute", left: 470, top: 676, width: 180, height: 126, border: `2px solid ${K.ink}` }}>
        <Tick at={-9} size={118} style={{ position: "absolute", left: 30, top: 2 }} />
      </div>
      <div style={{ position: "absolute", left: 54, right: 14, top: 622, height: 214, borderRadius: 10, border: `5px solid ${K.gold}`, boxShadow: `0 0 40px ${K.gold}`, opacity: glow }} />
    </Sheet>
  </>
);

export const TwoSkills: React.FC = () => {
  const frame = useBeatFrame();
  const glow = progAt(frame, 1.5, 1.5, EIO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 290, display: "flex", flexDirection: "column", gap: 22 }}>
        <Head at={0} parts={["剩下的两门课："]} size={72} />
        <Head at={1.5} parts={["出一道", { t: "值得答", c: K.gold }, "的题；"]} size={80} />
        <Head at={3.5} parts={["认出哪份", { t: "答对了", c: K.gold }, "。"]} size={80} />
      </div>
      <MainSheet x={1110} y={104} glow={glow} river={0} dimAnswer={progAt(frame, 0.5, 1.5, EIO)} />
    </AbsoluteFill>
  );
};

// ---------- S22 · the bookend: answers get cheaper; setting and grading stay with people ----------

export const Final: React.FC = () => {
  const frame = useBeatFrame();
  const river = progAt(frame, 0, 6, EIO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 110, top: 300, display: "flex", flexDirection: "column", gap: 26 }}>
        <Head at={0} parts={["答案会越来越便宜。"]} size={84} />
        <Head at={3} parts={[{ t: "出题和阅卷，", c: K.gold }]} size={118} />
        <Head at={4.5} parts={[{ t: "留给人。", c: K.gold }]} size={118} />
      </div>
      <MainSheet x={1110} y={104} glow={1} river={river} dimAnswer={0} />
    </AbsoluteFill>
  );
};

// ---------- Fixed end sequence: sources → making-of → brand card ----------

const NOTES = [
  "token 折成《红楼梦》：1 个汉字 ≈ 0.6 token（DeepSeek 官方文档），一部 120 回 724,619 字（Project Gutenberg 本自数，不含标点）。token 大多是反复读取的上下文，折书只是体量类比。",
  "各平台的 token 口径不同，不能相加或比大小；\"每天\"由 30 天合计 ÷ 30 推算。公司讲自己的数字都未经审计。本片用 Claude 制作，Anthropic 的数字标为\"Anthropic 自己的数据\"。",
];

const SOURCES = [
  "Alon 等 · Remarks on the disproof of the unit distance conjecture（arXiv）· 2026　｜　Thomas Bloom · erdosproblems.com · 2026",
  "Peter Steinberger · CodexBar 用量截图 · 2026　｜　The Decoder · 2026　｜　火山引擎 FORCE 大会 · 2026　｜　Google I/O · 2026　｜　国家数据局（新华社）· 2026",
  "工商银行、中国平安、美的、海尔、科大讯飞 · 2025 年年报　｜　快手 · 2025 年度业绩　｜　JPMorgan · 致股东信 · 2026",
  "Kaiser Permanente · 2025　｜　GOV.UK · 2025　｜　新华社 · 2025　｜　Edison Scientific · Kosmos（arXiv）· 2025　｜　Google DeepMind · 2025",
  "Harvey · 2026　｜　World Bank · PRWP 11125 · 2025　｜　Gallup · 2025、2026　｜　Netflix · 财报电话会 · 2025、2026　｜　Deezer · 2026",
  "levels.io · 2025　｜　TechCrunch · 2025　｜　Manus · 2025　｜　Deere · 2025　｜　Klarna · 2024　｜　CNBC · 2025　｜　NEJM AI · 2025",
  "Damien Charlotin · AI Hallucination Cases · 2026　｜　CNNIC · 2026　｜　Cursor · 2026　｜　Moonshot AI · 2026　｜　mitchellh.com · 2026　｜　Simon Willison · 2025",
  "Anthropic · Claude Code 成本文档、C 编译器、费马大定理、员工调查、专长研究 · 2025–2026",
];

const Dimmed: React.FC = () => (
  <div style={{ position: "absolute", inset: 0, opacity: 0.1 }}>
    <MainSheet x={1110} y={104} glow={0} river={0} dimAnswer={0} />
  </div>
);

export const Sources: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <div style={{ position: "absolute", left: 110, top: 118, width: 1700, display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <In at={0} from="up">
        <div style={{ fontSize: 38, fontWeight: 900, color: K.fg }}>口径与假设</div>
      </In>
      {NOTES.map((t, i) => (
        <In key={i} at={0.4 + i * 0.3} from="up">
          <div style={{ fontSize: 24, fontWeight: 500, color: K.sub, lineHeight: 1.5 }}>{t}</div>
        </In>
      ))}
      <In at={1.2} from="up">
        <div style={{ fontSize: 38, fontWeight: 900, color: K.fg, marginTop: 22 }}>来源</div>
      </In>
      {SOURCES.map((t, i) => (
        <In key={i} at={1.5 + i * 0.2} from="up">
          <div style={{ fontSize: 22, fontWeight: 500, color: K.sub, lineHeight: 1.45 }}>{t}</div>
        </In>
      ))}
      <In at={3.5} from="fade">
        <div style={{ fontSize: 22, fontWeight: 500, color: K.muted, marginTop: 18 }}>数据截至 2026 年 10 月 22 日 · 完整链接见视频简介和网站</div>
      </In>
    </div>
  </AbsoluteFill>
);

const MAKING: [string, string][] = [
  ["选题与撰稿", "MakerJackie"],
  ["数据核对", "MakerJackie"],
  ["画面", "代码逐帧渲染"],
  ["配乐", "《千年之后（氛围版）》· 和乐府"],
  ["制作", "MakerJackie"],
];

export const Making: React.FC = () => (
  <AbsoluteFill>
    <Dimmed />
    <div style={{ position: "absolute", left: 0, right: 0, top: 330, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
      {MAKING.map(([r, n], i) => (
        <In key={r} at={i * 0.25} from="up">
          <div style={{ display: "flex", fontFamily: FONT, alignItems: "baseline" }}>
            <div style={{ width: 300, textAlign: "right", paddingRight: 36, fontSize: 34, fontWeight: 700, color: K.muted }}>{r}</div>
            <div style={{ width: 620, fontSize: 44, fontWeight: 700, color: K.fg }}>{n}</div>
          </div>
        </In>
      ))}
      <In at={1.6} from="fade">
        <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 500, color: K.sub, marginTop: 30 }}>代码逐帧渲染 · Claude 协作</div>
      </In>
    </div>
  </AbsoluteFill>
);

const FROM = ["在", "用", "AI", "干", "什么"];
const TO = Array.from("世界的形状");

// The title's last words turn into 世界的形状, the orb lands, then the slogan.
export const BrandCard: React.FC = () => {
  const frame = useBeatFrame();
  const head = 1 - progAt(frame, 0.6, 0.8, EIO);
  const mark = progAt(frame, 1.6, 1.6, EBACK);
  const halo = progAt(frame, 1.6, 2, EO);
  const slogan = progAt(frame, 3.2, 1, EO);
  const size = 150;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 0, right: 0, top: 360, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 64, color: K.sub, opacity: head }}>最会用 AI 的人，</div>
      {mark > 0 ? (
        <div style={{ position: "absolute", left: 960 - 130, top: 170, width: 260, height: 260 }}>
          <div style={{ position: "absolute", inset: -90, borderRadius: "50%", background: `radial-gradient(circle, rgba(255,209,102,${0.22 * halo}) 0%, rgba(140,196,212,${0.08 * halo}) 45%, transparent 70%)` }} />
          <Img src={staticFile("mark-disc.png")} style={{ width: 260, height: 260, opacity: Math.min(1, mark * 1.5), transform: `translateY(${(1 - mark) * -60}px) scale(${0.7 + 0.3 * mark})` }} />
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 0, right: 0, top: 500, display: "flex", justifyContent: "center", gap: 6, perspective: 1400 }}>
        {FROM.map((ch, i) => {
          const q = progAt(frame, 0.4 + i * 0.12, 0.9, EIO);
          const front = q < 0.5;
          const ang = front ? q * 180 : (q - 1) * 180;
          return (
            <div key={i} style={{ minWidth: size * 1.02, height: size * 1.25, display: "flex", alignItems: "center", justifyContent: "center", transform: `rotateX(${ang}deg)` }}>
              <span style={{ fontFamily: front ? FONT : SERIF, fontWeight: front ? 900 : 700, fontSize: size, color: K.fg, lineHeight: 1, letterSpacing: front ? -4 : 0 }}>{front ? ch : TO[i]}</span>
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

