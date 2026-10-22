import React from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { CL, EBACK, EIO, EO, Glass, In, Odometer, progAt, Tag } from "../fx";
import { useBeatFrame } from "../kit";
import { FONT, K, MONO } from "../theme";
import { FPB } from "../timing";
import { Head, Src } from "../ui";

// ---------- S16 · build the grader first: 16 parallel agents and GCC as the judge ----------

const CODE = [
  "fn parse_expr(&mut self)",
  "  let lhs = self.unary()?;",
  "  match tok.kind {",
  "emit(Op::Mov, rax, rcx);",
  "fn lower_switch(&mut self)",
  "  for case in cases {",
  "test torture/20001.c",
  "  regalloc.spill(v);",
  "impl Codegen for Riscv",
  "  self.emit_call(f)?;",
];

const Pane: React.FC<{ i: number; on: boolean }> = ({ i, on }) => {
  const frame = useBeatFrame();
  const r = random(`pane${i}`);
  const off = Math.floor(frame / (3 + Math.floor(r * 4)) + r * 10);
  const fail = on && ((frame + Math.floor(r * 90)) % 90) < 9;
  const pass = Math.floor(interpolate(frame, [0, 16 * FPB], [400 + r * 300, 1650 + r * 300], CL));
  return (
    <div style={{ width: 228, height: 150, borderRadius: 8, background: on ? "#110f1d" : "#0c0d10", border: `1px solid ${fail ? K.red : on ? K.ai + "77" : "#202227"}`, overflow: "hidden", fontFamily: MONO, position: "relative" }}>
      <div style={{ height: 22, background: on ? "#1c1830" : "#121317", display: "flex", alignItems: "center", gap: 6, padding: "0 8px", fontSize: 12, color: "#b8b4d8" }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: on ? K.ai : "#333" }} />
        claude-{String(i + 1).padStart(2, "0")}
      </div>
      {on
        ? [0, 1, 2, 3, 4].map((l) => (
            <div key={l} style={{ fontSize: 12, lineHeight: "18px", padding: "0 8px", color: l === 4 ? K.aiHi : "#9b93cc", whiteSpace: "nowrap", opacity: 0.4 + l * 0.14 }}>
              {CODE[(off + l + i) % CODE.length]}
            </div>
          ))
        : null}
      {on ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 20, background: fail ? `${K.red}33` : `${K.green}1f`, fontSize: 12, color: fail ? K.red : K.green, padding: "0 8px", lineHeight: "20px" }}>
          {fail ? "✗ 与 GCC 结果不一致" : `✓ tests ${pass}`}
        </div>
      ) : null}
    </div>
  );
};

export const Compiler: React.FC = () => {
  const frame = useBeatFrame();
  const lit = interpolate(frame, [0.6 * FPB, 2.6 * FPB], [0, 16], CL);
  const gate = progAt(frame, 2.5, 0.8, EBACK);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 116 }}>
        <Head at={0} parts={["16 个 Claude，两周，从零写一个 C 编译器"]} size={58} />
      </div>
      <div style={{ position: "absolute", left: 96, top: 226, width: 980, display: "flex", flexWrap: "wrap", gap: 14 }}>
        {Array.from({ length: 16 }, (_, i) => (
          <Pane key={i} i={i} on={i < lit} />
        ))}
      </div>
      {/* The judge */}
      <div style={{ position: "absolute", left: 1092, top: 226, width: 150, height: 652, opacity: Math.min(1, gate * 1.5), transform: `scaleY(${0.7 + 0.3 * gate})`, transformOrigin: "50% 50%" }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 14, background: `linear-gradient(180deg, ${K.paper}, ${K.paperLo})`, boxShadow: `0 0 50px ${K.green}55` }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 30, textAlign: "center", fontFamily: FONT, fontWeight: 900, fontSize: 34, color: K.ink }}>裁判</div>
        <div style={{ position: "absolute", left: 0, right: 0, top: 80, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 30, color: K.ink }}>GCC</div>
        <div style={{ position: "absolute", left: 14, right: 14, top: 140, fontFamily: FONT, fontSize: 19, lineHeight: 1.5, color: K.inkSoft, textAlign: "center" }}>拿已知正确的编译结果，逐个对答案</div>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const on = ((Math.floor(frame / 7) + k * 3) % 7) !== 0;
          return <div key={k} style={{ position: "absolute", left: 55, top: 300 + k * 52, width: 40, height: 40, borderRadius: "50%", background: on ? K.greenInk : K.redInk, opacity: gate }} />;
        })}
      </div>
      {/* Numbers */}
      <div style={{ position: "absolute", left: 1290, top: 226, width: 560, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[
          { v: 16, u: "个 AI 并行", at: 1 },
          { v: 2000, u: "次会话（近）", at: 1.6 },
          { v: 2, u: "周", at: 2.2 },
          { v: 20000, u: "美元以内", at: 2.8, pre: "$" },
        ].map((s) => (
          <In key={s.u} at={s.at} from="scale">
            <Glass style={{ padding: "14px 20px" }}>
              <Odometer value={s.v * progAt(frame, s.at, 1.5, EO)} size={58} prefix={s.pre} color={K.aiHi} />
              <div style={{ fontSize: 22, fontWeight: 700, color: K.sub }}>{s.u}</div>
            </Glass>
          </In>
        ))}
      </div>
      <In at={5} from="up">
        <div style={{ position: "absolute", left: 1290, top: 520, width: 560, fontFamily: FONT }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: K.sub }}>交卷：</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: K.fg, lineHeight: 1.2 }}>10 万行，能编译</div>
          <div style={{ fontSize: 48, fontWeight: 900, color: K.fg, lineHeight: 1.2 }}>Linux 6.9</div>
          <div style={{ fontSize: 22, color: K.muted, marginTop: 4 }}>x86 · ARM · RISC-V 都能启动</div>
        </div>
      </In>
      <In at={7.5} from="up">
        <div style={{ position: "absolute", left: 1290, top: 760, width: 560, fontFamily: FONT, color: K.fg }}>
          <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.4 }}>“裁判必须近乎完美，否则 AI 会去解错的题。”</div>
          <div style={{ fontSize: 19, color: K.muted, marginTop: 6 }}>Nicholas Carlini · Anthropic · 2026-02-05</div>
        </div>
      </In>
      <div style={{ position: "absolute", left: 96, top: 910 }}>
        <Head at={10} parts={["先造好", { t: "裁判", c: K.ink, hl: K.paper }, "，16 个 AI 才能一起答。"]} size={58} />
      </div>
      <Src>Anthropic 自己的数据 · 汇编器、链接器和 16 位启动代码仍借用 GCC；生成的代码效率不高</Src>
    </AbsoluteFill>
  );
};

// ---------- S17 · graders let people let go: in parallel, overnight ----------

const PRACTICE = [
  { who: "Mitchell Hashimoto", role: "Ghostty 作者", what: "每天收工前 30 分钟，把活派给 AI", at: 2, tag: "本人博客 2026-02" },
  { who: "Cursor", role: "编程工具公司", what: "数百个 AI 连跑一周，峰值每小时约 1,000 次提交", at: 3.5, tag: "公司称 2026-02" },
  { who: "Kimi K3", role: "月之暗面", what: "一次 48 小时自主运行，设计并验证一颗芯片（仿真）", at: 5, tag: "公司称 2026-07" },
  { who: "Boris Cherny", role: "Claude Code 作者", what: "30 天 259 个 PR，每一行都是 Claude Code 写的", at: 6.5, tag: "本人称 2025-12" },
];

export const Overnight: React.FC = () => {
  const frame = useBeatFrame();
  const sweep = interpolate(frame, [0, 12 * FPB], [8, 32], CL); // hours, 8:00 → 8:00 next day
  const cx = 420;
  const cy = 590;
  const R = 270;
  const ang = (h: number) => (h / 24) * Math.PI * 2 - Math.PI / 2;
  const arc = (h0: number, h1: number, r: number) => {
    const a0 = ang(h0);
    const a1 = ang(h1);
    const large = h1 - h0 > 12 ? 1 : 0;
    return `M${cx + r * Math.cos(a0)} ${cy + r * Math.sin(a0)} A${r} ${r} 0 ${large} 1 ${cx + r * Math.cos(a1)} ${cy + r * Math.sin(a1)}`;
  };
  const night = progAt(frame, 1, 4, EIO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 116 }}>
        <Head at={0} parts={["卷能自动阅，人才敢放手：", { t: "并行，过夜", c: K.aiHi }, "。"]} size={60} />
      </div>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(244,240,232,0.10)" strokeWidth={40} />
        <path d={arc(9, 17.5, R)} fill="none" stroke={K.paper} strokeWidth={40} opacity={0.9} />
        <path d={arc(17.5, 17.5 + 15.5 * night, R)} fill="none" stroke={K.ai} strokeWidth={40} opacity={0.95} />
        {Array.from({ length: 24 }, (_, h) => (
          <line key={h} x1={cx + (R - 34) * Math.cos(ang(h))} y1={cy + (R - 34) * Math.sin(ang(h))} x2={cx + (R - 46) * Math.cos(ang(h))} y2={cy + (R - 46) * Math.sin(ang(h))} stroke="rgba(244,240,232,0.4)" strokeWidth={h % 6 === 0 ? 4 : 2} />
        ))}
        <line x1={cx} y1={cy} x2={cx + (R - 70) * Math.cos(ang(sweep))} y2={cy + (R - 70) * Math.sin(ang(sweep))} stroke={K.fg} strokeWidth={6} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={10} fill={K.fg} />
      </svg>
      {[0, 6, 12, 18].map((h) => (
        <div key={h} style={{ position: "absolute", left: cx + (R - 86) * Math.cos(ang(h)) - 30, top: cy + (R - 86) * Math.sin(ang(h)) - 16, width: 60, textAlign: "center", fontFamily: FONT, fontSize: 24, fontWeight: 700, color: K.muted }}>
          {h}:00
        </div>
      ))}
      <div style={{ position: "absolute", left: cx + R + 10, top: cy - R - 10, fontFamily: FONT, fontSize: 24, fontWeight: 900, color: K.paper }}>白天：人出题、阅卷</div>
      <div style={{ position: "absolute", left: cx - R - 40, top: cy + R + 20, fontFamily: FONT, fontSize: 24, fontWeight: 900, color: K.aiHi, opacity: night }}>夜里：AI 答题</div>
      <div style={{ position: "absolute", left: 860, top: 236, width: 980, display: "flex", flexDirection: "column", gap: 18 }}>
        {PRACTICE.map((p) => (
          <In key={p.who} at={p.at} from="right" dist={40}>
            <Glass style={{ padding: "18px 26px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: K.fg }}>{p.who}</span>
                <span style={{ fontSize: 21, color: K.muted }}>{p.role}</span>
                <span style={{ marginLeft: "auto" }}>
                  <Tag color={K.muted} size={16}>
                    {p.tag}
                  </Tag>
                </span>
              </div>
              <div style={{ fontSize: 30, fontWeight: 700, color: K.aiHi, marginTop: 6 }}>{p.what}</div>
            </Glass>
          </In>
        ))}
      </div>
      <Src>mitchellh.com 2026-02-05 · cursor.com 2026-02-05 · kimi.com 2026-07 · Simon Willison 转引 Boris Cherny 2025-12-27</Src>
    </AbsoluteFill>
  );
};

// ---------- S18 · same tool, different people: experts vs novices ----------

const Chain: React.FC<{ n: number; at: number; y: number; label: string; prompt: string }> = ({ n, at, y, label, prompt }) => {
  const frame = useBeatFrame();
  const lit = interpolate(frame, [at * FPB, (at + 2.2) * FPB], [0, n], CL);
  return (
    <div style={{ position: "absolute", left: 96, top: y, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT }}>
      <div style={{ width: 110, fontSize: 36, fontWeight: 900, color: K.fg }}>{label}</div>
      <div style={{ padding: "12px 18px", borderRadius: 14, background: K.paper, color: K.ink, fontSize: 24, fontWeight: 700, whiteSpace: "nowrap" }}>{prompt}</div>
      <span style={{ fontSize: 30, color: K.muted }}>→</span>
      {Array.from({ length: n }, (_, k) => {
        const on = k < lit;
        return <div key={k} style={{ width: 54, height: 54, borderRadius: "50%", background: on ? K.ai : "rgba(155,135,255,0.12)", border: `2px solid ${K.ai}`, boxShadow: on ? `0 0 18px ${K.ai}88` : undefined, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 900, color: on ? K.bg : K.ai }}>{k + 1}</div>;
      })}
    </div>
  );
};

export const Expert: React.FC = () => {
  const frame = useBeatFrame();
  const bar = (v: number, at: number) => v * progAt(frame, at, 1.2, EIO);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 96, top: 116 }}>
        <Head at={0} parts={["同一个工具，差别在", { t: "出题和阅卷", c: K.ink, hl: K.paper }, "的人。"]} size={60} />
      </div>
      <In at={0.5} from="fade">
        <div style={{ position: "absolute", left: 96, top: 214, fontFamily: FONT, fontSize: 24, color: K.sub }}>Claude Code · 约 40 万个会话、23.5 万人 · 平均每句话让 AI 连做几步：</div>
      </In>
      <Chain n={5} at={1} y={280} label="新手" prompt="一句话" />
      <Chain n={12} at={2} y={380} label="高手" prompt="一句话" />
      <div style={{ position: "absolute", left: 96, top: 510, width: 1700, fontFamily: FONT }}>
        <In at={4.5} from="fade">
          <div style={{ fontSize: 28, fontWeight: 700, color: K.sub, marginBottom: 14 }}>最后真的做成、并且验证过：</div>
        </In>
        {[
          { l: "新手", v: 15, s: "约 15%", c: K.sub, at: 5 },
          { l: "中级以上", v: 30.5, s: "28–33%", c: K.ai, at: 5.5 },
        ].map((r) => (
          <div key={r.l} style={{ display: "flex", alignItems: "center", height: 74, opacity: progAt(frame, r.at, 0.4) }}>
            <div style={{ width: 170, fontSize: 30, fontWeight: 900, color: K.fg }}>{r.l}</div>
            <div style={{ width: bar(r.v, r.at) * 30, height: 46, borderRadius: 8, background: r.c }} />
            <div style={{ paddingLeft: 18, fontSize: 44, fontWeight: 900, color: r.c }}>{r.s}</div>
          </div>
        ))}
        <In at={7} from="fade">
          <div style={{ fontSize: 26, color: K.sub, marginTop: 18 }}>半途放弃：新手 19%，其他人 5–7%</div>
        </In>
      </div>
      <Src>Anthropic 2026-06-16 · Anthropic 自己的数据 · 2025-10 至 2026-04 · 观察性数据，不能说明谁导致了谁</Src>
    </AbsoluteFill>
  );
};
