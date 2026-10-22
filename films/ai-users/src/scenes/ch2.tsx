import React from "react";
import { AbsoluteFill } from "remotion";
import { InkStamp } from "../art/paper";
import { EBACK, EO, In, progAt } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, SERIF } from "../theme";
import { Head } from "../ui";

// ---------- One answer sheet in the barrage ----------

export type CardD = {
  field: string;
  org: string;
  big: string;
  bigSize?: number;
  line: string;
  check?: string;
  bad?: boolean;
  src: string;
  flag?: string;
};

const W = 544;
const H = 362;

const Face: React.FC<{ d: CardD; at: number; still?: boolean }> = ({ d, at, still }) => {
  const frame = useBeatFrame();
  const mark = still ? 1 : progAt(frame, at + 0.5, 0.6, EO);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: `linear-gradient(180deg, ${K.paperHi}, ${K.paper} 60%, ${K.paperLo})`,
        borderRadius: 6,
        overflow: "hidden",
        backfaceVisibility: "hidden",
        color: K.ink,
      }}
    >
      <div style={{ position: "absolute", left: 22, top: 0, bottom: 0, borderLeft: `2px dashed ${K.inkFaint}` }} />
      <div style={{ position: "absolute", left: 44, right: 22, top: 22, display: "flex", alignItems: "center", gap: 12, whiteSpace: "nowrap" }}>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 20, padding: "2px 10px", border: `2px solid ${K.ink}`, borderRadius: 4 }}>{d.field}</span>
        <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 25 }}>{d.org}</span>
        {d.flag ? <span style={{ marginLeft: "auto", fontFamily: FONT, fontSize: 15, fontWeight: 700, color: K.inkSoft, border: `1px solid ${K.inkFaint}`, borderRadius: 4, padding: "1px 6px" }}>{d.flag}</span> : null}
      </div>
      <div style={{ position: "absolute", left: 44, top: 72, whiteSpace: "nowrap" }}>
        <span style={{ position: "relative", display: "inline-block", fontFamily: FONT, fontWeight: 900, fontSize: d.bigSize ?? 76, letterSpacing: -1.5, lineHeight: 1.1 }}>
          <span style={{ position: "absolute", left: -6, right: -6, bottom: 4, height: "42%", background: K.aiHi, opacity: 0.75, transform: `scaleX(${mark})`, transformOrigin: "left", borderRadius: 4 }} />
          <span style={{ position: "relative" }}>{d.big}</span>
        </span>
      </div>
      <div style={{ position: "absolute", left: 44, right: 24, top: 176, fontFamily: FONT, fontWeight: 500, fontSize: 25, lineHeight: 1.42, color: K.inkSoft }}>{d.line}</div>
      {d.check ? (
        <div style={{ position: "absolute", right: 18, bottom: 46 }}>
          <InkStamp at={still ? -9 : at + 1.1} size={21} rot={-5} color={d.bad ? K.redInk : K.greenInk}>
            {d.check}
          </InkStamp>
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 44, bottom: 14, fontFamily: FONT, fontSize: 15, color: K.inkFaint, whiteSpace: "nowrap" }}>{d.src}</div>
    </div>
  );
};

const Back: React.FC = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: `linear-gradient(180deg, ${K.paperLo}, ${K.paper})`,
      borderRadius: 6,
      backfaceVisibility: "hidden",
      transform: "rotateY(180deg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: SERIF,
      fontWeight: 900,
      fontSize: 64,
      color: "rgba(25,35,31,0.12)",
      letterSpacing: 20,
    }}
  >
    答卷
  </div>
);

// Flips face-up and drops onto the desk on beat `at`.
export const PaperCard: React.FC<{ d: CardD; at: number; x: number; y: number; rot?: number; scale?: number; still?: boolean }> = ({
  d,
  at,
  x,
  y,
  rot = 0,
  scale = 1,
  still = false,
}) => {
  const frame = useBeatFrame();
  const p = still ? 1 : progAt(frame, at, 0.75, EBACK);
  if (p <= 0) return null;
  const flip = still ? 0 : Math.max(0, 1 - progAt(frame, at, 0.55, EO)) * 180;
  const lift = 1 - p;
  return (
    <div style={{ position: "absolute", left: x, top: y, width: W, height: H, perspective: 1600, transform: `scale(${scale})`, transformOrigin: "0 0", opacity: Math.min(1, p * 3) }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `translateY(${-lift * 60}px) rotate(${rot + lift * 6}deg) rotateY(${-flip}deg) scale(${1 + lift * 0.18})`,
          boxShadow: `0 ${18 + lift * 40}px ${50 + lift * 50}px rgba(0,0,0,${0.55 - lift * 0.2})`,
          borderRadius: 6,
        }}
      >
        <Face d={d} at={at} still={still} />
        <Back />
      </div>
    </div>
  );
};

// ---------- The four waves ----------

export const W1: CardD[] = [
  { field: "银行", org: "中国工商银行", big: "5.5 万人年", line: "AI 数字员工承担的工作量，约等于全行 41 万人的 13%", src: "工商银行 2025 年报 · 13% 为推算", flag: "自报" },
  { field: "保险", org: "中国平安", big: "17 亿次", line: "AI 坐席的外呼和应答，覆盖 80% 的客服量", src: "中国平安 2025 年报", flag: "自报" },
  { field: "银行", org: "摩根大通", big: "6.5 万人", line: "投行部门在用自家的 AI 平台 LLM Suite", src: "JPMorgan 2025 年报致股东信", flag: "自报" },
  { field: "医院", org: "Kaiser Permanente", big: "257 万次", line: "美国：就诊病历由 AI 起草（2023-10 至 2024-12）", check: "阅卷：7,260 名医生审改", src: "Kaiser Permanente 2025-04" },
  { field: "政府", org: "英国政府", big: "2 小时", line: "AI 把 5 万多份公众意见归类，花了 £240", check: "阅卷：专家复核 22 小时", src: "GOV.UK 2025-10-16" },
  { field: "政府", org: "深圳福田区", big: "4 分钟", line: "生成一份劳动仲裁裁决书；全手工要 4 小时以上", check: "阅卷：工作人员先核实", src: "新华社 2025-02-20" },
];

export const W2: CardD[] = [
  { field: "科研", org: "Kosmos AI 科学家", big: "1,500 篇", line: "一次运行读的论文，外加跑 4.2 万行代码", check: "阅卷：79.4% 陈述准确", src: "Edison Scientific · arXiv 2025-11", flag: "自报" },
  { field: "生物", org: "AlphaFold", big: "300 万+", line: "用过它的研究者，来自 190 多个国家", src: "Google DeepMind 2025-11", flag: "自报" },
  { field: "数学", org: "Claude", big: "11 天", line: "写出费马大定理的机器证明，约 1,300 万行", check: "阅卷：Lean 逐行检查", src: "Anthropic 2026-09", flag: "Anthropic 自己的数据" },
  { field: "法律", org: "Harvey", big: "80%", line: "美国百强律所（Am Law 100）在用", src: "Harvey 2026-09", flag: "自报" },
  { field: "教育", org: "科大讯飞", big: "360 万份", line: "AI 每天批改的作业；教师助手服务 80 万名老师", src: "科大讯飞 2025 年报", flag: "自报" },
  { field: "教育", org: "世界银行 · 尼日利亚", big: "6 周", line: "AI 课后辅导，效果约等于 1.5–2 年常规教学", check: "随机对照试验", src: "World Bank 工作论文 2025-05" },
];

export const W3: CardD[] = [
  { field: "影视", org: "Netflix", big: "10 倍", line: "第一个 AI 特效镜头快了 10 倍；一年后约 300 部作品用过", src: "Netflix 财报电话会 2025-07、2026-07", flag: "公司称" },
  { field: "视频", org: "快手可灵", big: "$2,000 万", line: "2025 年 12 月一个月的收入，年化 2.4 亿美元", src: "快手 2025 年度业绩公告", flag: "自报" },
  { field: "游戏", org: "Pieter Levels", big: "17 天", line: "一个人用 AI 写的飞行游戏，年化收入破 100 万美元", src: "levels.io 2025-02", flag: "本人自报" },
  { field: "软件", org: "Base44", big: "$8,000 万", line: "一人创立，6 个月，现金卖给 Wix（当时 8 名员工）", src: "TechCrunch 2025-06-18" },
  { field: "软件", org: "Manus", big: "105 人", line: "上线 8 个月，年化收入 1 亿美元", src: "Manus 2025-12-17", flag: "自报" },
  { field: "音乐", org: "Deezer", big: "9 万首 / 天", bigSize: 68, line: "上传的歌里，完全由 AI 生成的", check: "阅卷：只占全部播放的 1–3%", bad: true, src: "Deezer 2026-07-21" },
];

export const W4: CardD[] = [
  { field: "农业", org: "John Deere", big: "500 万英亩", bigSize: 68, line: "AI 认出杂草再喷，除草剂平均少用近一半", src: "Deere 2025-11", flag: "公司称" },
  { field: "制造", org: "美的", big: "13,500 个", line: "员工自己搭的智能体，省下 1,500 万工时", src: "美的集团 2025 年报", flag: "自报" },
  { field: "制造", org: "海尔", big: "15 天 → 7 天", bigSize: 68, line: "一款空调样机的测试周期", src: "海尔智家 2025 年报", flag: "自报" },
  { field: "教育", org: "美国老师", big: "5.9 小时", line: "每周用 AI 的老师，每周省下的时间（一学年约 6 周）", src: "Gallup 2025-06 · 2,232 名教师自估" },
  { field: "家庭", org: "一位美国家属", big: "$195,000", line: "用 Claude 逐行核对亲人的医院账单，最后砍掉八成", check: "阅卷：家属拿着核对去谈", src: "媒体报道 2025-10 · 二手" },
];

const XS = [96, 688, 1280];
const YS = [226, 614];
const ROT = [-1.6, 1.1, -0.7, 1.4, -1.2, 0.8];
const AT = [0, 1.5, 3, 4.5, 6, 7.5];

const Wave: React.FC<{ cards: CardD[]; tag: string; conclusion: React.ReactNode[] | string[]; n: number }> = ({ cards, tag, conclusion, n }) => {
  const frame = useBeatFrame();
  const t = progAt(frame, 0, 0.6, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 116, display: "flex", alignItems: "center", gap: 22 }}>
        <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 30, padding: "6px 16px", borderRadius: 8, background: K.paper, color: K.ink, transform: `scale(${0.6 + 0.4 * t})`, opacity: t, whiteSpace: "nowrap" }}>
          {n} / 4　{tag}
        </span>
        <Head at={9} parts={conclusion as never} size={60} />
      </div>
      {cards.map((d, i) => (
        <PaperCard key={d.org + i} d={d} at={AT[i]} x={XS[i % 3] + (cards.length === 5 && i >= 3 ? 296 : 0)} y={YS[Math.floor(i / 3)]} rot={ROT[i]} />
      ))}
    </AbsoluteFill>
  );
};

export const Wave1: React.FC = () => <Wave n={1} cards={W1} tag="大机构" conclusion={["AI 当员工，", { t: "人签字", c: K.ink, hl: K.paper } as never, "。"]} />;
export const Wave2: React.FC = () => <Wave n={2} cards={W2} tag="专业" conclusion={["科学家、律师、老师：", { t: "AI 先答一遍", c: K.aiHi } as never, "。"]} />;
export const Wave3: React.FC = () => <Wave n={3} cards={W3} tag="小团队" conclusion={["一个好题目，撑起一家公司。"]} />;
export const Wave4: React.FC = () => <Wave n={4} cards={W4} tag="普通人" conclusion={["农民、工人、老师、家属，", { t: "也在出题", c: K.ink, hl: K.paper } as never, "。"]} />;

// ---------- S12 · the closing wall: 23 sheets, one shape ----------

const ALL = [...W1, ...W2, ...W3, ...W4];

export const Wall: React.FC = () => {
  const s = 0.455;
  const cw = W * s;
  const ch = H * s;
  const gap = 12;
  const cols = 6;
  const x0 = (1920 - (cols * cw + (cols - 1) * gap)) / 2;
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x0, top: 108 }}>
        <Head at={0.5} parts={["23 张答卷，同一个形状："]} size={62} />
      </div>
      <div style={{ position: "absolute", left: 1050, top: 116, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT, fontWeight: 900, fontSize: 34 }}>
        {[
          ["人", "出题", K.paper, K.ink],
          ["AI", "答题", K.aiInk, "#fff"],
          ["人", "阅卷", K.paper, K.ink],
        ].map(([w, t, bg, fg], i) => (
          <In key={i} at={3 + i * 0.5} from="scale">
            <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
              {i > 0 ? <span style={{ color: K.muted, fontSize: 30 }}>→</span> : null}
              <span style={{ background: bg, color: fg, padding: "4px 14px", borderRadius: 8 }}>
                {w} · {t}
              </span>
            </span>
          </In>
        ))}
      </div>
      {ALL.map((d, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        return <PaperCard key={i} d={d} at={i * 0.12} x={x0 + c * (cw + gap)} y={226 + r * (ch + gap)} scale={s} rot={((i * 13) % 7) * 0.3 - 0.9} still={false} />;
      })}
    </AbsoluteFill>
  );
};
