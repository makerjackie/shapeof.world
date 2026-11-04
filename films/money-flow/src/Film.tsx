// v7: 「你的工资，流到了哪？」 The town (three.js) under the type, cut to the bars of 「脉搏 · 弦」.
// Numbers and sources: private/videos/money-flow/LEDGER.md (v7: §11).
import React from "react";
import * as THREE from "three";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EndCard, EO, Part, ramp, Say, Sources, SHADOW, Tag, useT, win } from "./kit";
import { FONT, K, NUM } from "./theme";
import { B, BAR, BEAT, FPS, T, punch } from "./timing";
import { TownView } from "./TownView";
import { ANCHORS, project } from "./town/camera";
import { CAST, byRank, ptOf, tankTop, yardOf } from "./town/layout";
import { RETIREES, scene } from "./town/state";

type Line = { p: Part[]; size?: number; color?: string; weight?: number };
type Cap = { at: number; out: number; lines: Line[]; x?: number; y: number; align?: "left" | "center" | "right"; fast?: boolean };

const big = (t: string, s = 1.5, c: string = K.gold): Part => ({ t, num: true, c, s });
const red = (t: string): Part => ({ t, c: K.red });
const sub = (t: string, size = 40): Line => ({ p: [t], size, color: K.sub });
const b = B;
const Q = BEAT;

// ---------------------------------------------------------------- captions (one per bar, cut on the downbeat)
const CAPS: Cap[] = [
  // hook (the payslip carries the numbers)
  { at: b(6) + 0.1, out: b(8) - 0.08, y: 900, lines: [{ p: ["中间这 ", big("2,570", 1.25), "，去了哪？"], size: 70 }] },
  // DROP: the 2,570, one bar each
  { at: b(8) + 0.05, out: b(9), y: 820, lines: [{ p: ["公积金 ", big("800", 1.3), "：存进你自己的账户"], size: 64 }, sub("买房、租房时才取得出来")] },
  { at: b(9) + 0.05, out: b(10), y: 820, lines: [{ p: ["养老 ", big("400", 1.3), "：记在你的个人账户上"], size: 64 }, sub("退休以后才领")] },
  { at: b(10) + 0.05, out: b(11), y: 820, lines: [{ p: ["公司交的养老 ", big("800", 1.3)], size: 64 }, { p: ["这个月，就发给了", { t: "今天的退休老人", mark: true }], size: 64 }] },
  { at: b(11) + 0.05, out: b(12), y: 820, lines: [{ p: ["医保 ", big("500", 1.3), "：100 进你的账户"], size: 64 }, { p: ["400 给了这个月看病的人"], size: 56 }] },
  { at: b(12) + 0.05, out: b(13), y: 820, lines: [{ p: ["失业、工伤 ", big("70", 1.3), "：给失业和受伤的人"], size: 64 }] },
  { at: b(13) + 0.05, out: b(15), y: 790, lines: [{ p: ["记在你名下：", big("1,300", 1.2), " · 进了大家的池子：", big("1,270", 1.2, K.pub)], size: 56 }, { p: ["到你卡上：", big("4,075", 1.4), "　个税：", big("0", 1.4, K.fg)], size: 64 }] },
  { at: b(15) + 0.05, out: b(16) - 0.05, y: 430, align: "center", lines: [{ p: ["你以为，你", { t: "没交税", mark: true }, "？"], size: 104 }] },
  // the 4,075 is spent
  { at: b(16) + 0.05, out: b(17), y: 820, lines: [{ p: ["这 4,075 一花出去"], size: 66 }, sub("房租、吃饭、坐车、买东西")] },
  { at: b(17) + 0.05, out: b(18), x: 1810, y: 300, align: "right", lines: [{ p: ["每件商品的价格里"], size: 60 }, { p: ["都含着", { t: "增值税", mark: true }], size: 72 }] },
  { at: b(18) + 0.05, out: b(20), y: 170, lines: [{ p: ["2024 年，全国税收 ", big("17.5", 1.3), " 万亿"], size: 60 }] },
  // lift
  { at: b(20) + 0.05, out: b(21) + BAR * 0.9, y: 170, lines: [{ p: ["你花的钱，成了商店和工厂的收入"], size: 62 }] },
  { at: b(22) + 0.05, out: b(24), y: 860, lines: [{ p: ["你的工资，也是", { t: "别人花出来的", mark: true }], size: 64 }] },
  { at: b(24) + 0.05, out: b(26), y: 170, lines: [{ p: ["企业赚的钱，", { t: "分红", mark: true }, "给股东"], size: 64 }, { p: ["2024 年，A 股分红约 ", big("2.4", 1.3), " 万亿"], size: 56 }] },
  { at: b(26) + 0.05, out: b(27), y: 170, lines: [{ p: ["国企的大股东，是", { t: "国家", mark: true }], size: 68 }] },
  { at: b(27) + 0.05, out: b(30), y: 170, lines: [{ p: ["股票、基金、存款，在谁手里？"], size: 56, color: K.sub }, { p: ["城镇金融资产最多的 10% 家庭，拥有 ", big("58%", 1.5)], size: 60 }] },
  { at: b(30) + 0.05, out: b(32), y: 800, lines: [{ p: ["月底，你的水箱", red("见底了")], size: 66 }, { p: ["全国约 ", { t: "4 成", num: true, c: K.red }, " 家庭，一年下来花的比挣的多"], size: 52 }] },
  { at: b(32) + Q, out: b(33) - 0.05, y: 440, align: "center", lines: [{ p: ["那钱，", { t: "停在了哪", mark: true }, "？"], size: 104 }] },
  // where it stops
  { at: b(33) + 0.05, out: b(34.5), y: 150, align: "center", lines: [{ p: ["全国家庭一年存下的钱"], size: 50, color: K.sub }, { p: [big("一半", 1.5), "，是收入最高的 5% 家庭存的"], size: 62 }] },
  { at: b(34.5) + 0.05, out: b(36), y: 150, align: "center", lines: [{ p: ["前 25% 的家庭，存下了 ", big("77%", 1.5)], size: 62 }] },
  { at: b(36) + 0.05, out: b(38), y: 170, lines: [{ p: ["存下的钱，进了", { t: "银行", mark: true }], size: 66 }] },
  { at: b(38) + 0.05, out: b(40), y: 170, lines: [{ p: ["银行把它借给", { t: "买房的年轻人", c: K.loan }], size: 66 }, sub("户主 26–35 岁的家庭，73% 背着债")] },
  { at: b(45) + 0.05, out: b(47) + Q * 1.6, y: 420, align: "center", lines: [{ p: ["你的房贷"], size: 84 }, { p: ["就是别人的", { t: "存款", mark: true }], size: 100 }] },
  { at: b(47) + 2 * Q, out: b(48) - 0.05, y: 440, align: "center", lines: [{ p: ["为什么，富人", { t: "越来越富", mark: true }, "？"], size: 104 }] },
  // breather
  { at: b(48) + 0.05, out: b(50), y: 170, lines: [{ p: ["普通人的收入：", big("56.5%", 1.3), " 是工资"], size: 62 }, { p: ["房租、利息、分红，只占 ", big("8.3%", 1.3, K.fg)], size: 56 }] },
  { at: b(53) + 0.05, out: b(54), y: 820, lines: [{ p: ["新钱也一样：银行新放的贷款"], size: 60 }, { p: ["先到", { t: "借得到钱的人", c: K.loan }, "手里"], size: 66 }] },
  { at: b(54) + 0.05, out: b(55), y: 800, lines: [{ p: ["2009 年：贷款翻倍，物价反跌"], size: 60 }, { p: ["8 个大城市的地价，", { t: "约翻一倍", mark: true }], size: 66 }] },
  { at: b(55) + 0.1, out: b(57) - 0.05, y: 440, align: "center", lines: [{ p: ["所以，钱到底", { t: "怎么流", mark: true }, "？"], size: 104 }] },
  // PEAK
  { at: b(57) + 0.03, out: b(59), y: 160, lines: [{ p: ["工资：", { t: "流过你", mark: true }], size: 92 }] },
  { at: b(59) + 0.03, out: b(61), y: 160, lines: [{ p: ["房租、利息、分红："], size: 72 }, { p: ["流向有", { t: "房子、存款、股票", mark: true }, "的人"], size: 72 }] },
  { at: b(61) + 0.03, out: b(63), y: 160, lines: [{ p: ["税：流向政府"], size: 72 }, { p: ["再变成", { t: "学校、医院、养老金", c: K.pub }], size: 72 }, sub("2024 年，全国教育支出 4.2 万亿")] },
  { at: b(63) + 0.03, out: b(65), y: 160, lines: [{ p: ["新钱：先流到", { t: "借得到钱的人", c: K.loan }, "手里"], size: 72 }] },
  { at: b(65) + 0.03, out: b(69), y: 140, align: "center", lines: [{ p: ["一年年攒下来"], size: 56, color: K.sub }] },
  { at: b(69) + 0.03, out: b(71), y: 420, align: "center", lines: [{ p: ["你每个月经手的钱，并不少"], size: 80 }] },
  { at: b(71) + 0.03, out: b(73), y: 420, align: "center", lines: [{ p: ["只是，它从你手里", { t: "流过", mark: true }], size: 92 }] },
  // ending line
  { at: b(73) + 0.1, out: T.sources - 0.3, y: 400, align: "center", lines: [{ p: ["钱会流过每一个人"], size: 84 }, { p: ["只在", { t: "会生钱的地方", mark: true }, "停下"], size: 96 }] },
];

// ---------------------------------------------------------------- bottom-left source lines
const SRC: { a: number; b: number; text: string }[] = [
  { a: b(0) + 0.3, b: b(10), text: "工资条为示意：月薪 5000 元，缴费基数按工资；养老 16%+8%、医保约 8%+2%、失业 0.5%+0.5%、工伤约 0.4%、公积金 8%+8%（各地费率不同）；个税起征点每月 5000 元" },
  { a: b(10), b: b(13), text: "单位缴的养老保险进入统筹基金，用来发放当期的养老金；个人缴的 8% 记入个人账户（国务院国发〔2005〕38 号）" },
  { a: b(17), b: b(20), text: "来源：财政部《2024 年财政收支情况》：全国税收收入 174972 亿元，其中国内增值税 66672 亿、国内消费税 16532 亿、个人所得税 14522 亿" },
  { a: b(21), b: b(24), text: "来源：国家统计局《中国统计年鉴 2025》资金流量表（2023 年）；工资含单位缴的社保和公积金" },
  { a: b(24), b: b(26), text: "来源：证监会主席吴清，2025 年全国两会记者会：2024 年全市场分红 2.4 万亿元" },
  { a: b(27), b: b(30), text: "来源：人民银行调查统计司《2019 年中国城镇居民家庭资产负债情况调查》：金融资产最高 10% 家庭占 58.3%" },
  { a: b(30), b: b(32), text: "来源：西南财经大学中国家庭金融调查 2015（2014 年数据）：约 40% 的家庭当年入不敷出" },
  { a: b(33), b: b(36), text: "来源：中国家庭金融调查 2015（2014 年数据）：收入前 5% 的家庭存下全国家庭储蓄的 50.6%，前 25% 存下 77.1%" },
  { a: b(38), b: b(40), text: "来源：人民银行 2019 年城镇家庭调查：户主 26–35 岁的家庭 73.1% 有负债，房贷占家庭负债的 75.9%" },
  { a: b(40), b: b(45), text: "一年期定存：国有大行 2025 年 5 月 20 日起挂牌 0.95%；房贷：2025 年新发放个人住房贷款加权平均利率约 3.06%（人民银行）；等额本息 30 年计算" },
  { a: b(48), b: b(50), text: "来源：国家统计局《2024 年居民收入和消费支出情况》：全国居民人均可支配收入中，工资性收入 56.5%，财产净收入 8.3%" },
  { a: b(50), b: b(53), text: "个人所得税法：综合所得税率 3%–45%；个人转让上市公司股票所得免征个税（财税字〔1998〕61 号）；持股超过 1 年的股息红利免征（财税〔2015〕101 号）" },
  { a: b(53), b: b(55), text: "来源：人民银行 2009 年四季度货币政策执行报告；国家统计局 2009 年统计公报；Deng, Morck, Wu & Yeung, NBER 工作论文 16871（2011）" },
  { a: b(61), b: b(63), text: "来源：财政部《2024 年中国财政政策执行情况报告》：全国一般公共预算教育支出 42076 亿元" },
  { a: b(65), b: b(69), text: "来源：人民银行调查统计司《2019 年中国城镇居民家庭资产负债情况调查》（城镇家庭总资产）" },
];

const SourceLine: React.FC<{ t: number }> = ({ t }) => (
  <>
    {SRC.map((r) => {
      const o = win(t, r.a, r.b, 0.2, 0.2);
      return o <= 0 ? null : (
        <div key={r.a} style={{ position: "absolute", left: 46, bottom: 26, maxWidth: 1830, fontFamily: FONT, fontSize: 22, fontWeight: 500, color: "rgba(243,238,228,0.66)", opacity: o, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: SHADOW }}>
          {r.text}
        </div>
      );
    })}
  </>
);

const Captions: React.FC<{ t: number }> = ({ t }) => (
  <>
    {CAPS.map((c0, i) => {
      const next = CAPS.filter((x) => x.at > c0.at).reduce((m, x) => Math.min(m, x.at), Infinity);
      const c = { ...c0, out: Math.min(c0.out, next - 0.12) };
      if (t < c.at - 0.1 || t > c.out + 0.3) return null;
      const align = c.align ?? "left";
      const x = c.x ?? 110;
      const pk = 1 + 0.06 * punch(t, c.at, 0.3);
      let delay = 0;
      return (
        <div key={i} style={{ position: "absolute", top: c.y, left: align === "right" ? undefined : align === "center" ? 0 : x, right: align === "right" ? 1920 - x : undefined, width: align === "center" ? 1920 : undefined, display: "flex", flexDirection: "column", alignItems: align === "right" ? "flex-end" : align === "center" ? "center" : "flex-start", gap: 8, transform: `scale(${pk})`, transformOrigin: align === "center" ? "50% 50%" : align === "right" ? "100% 0" : "0 0" }}>
          {c.lines.map((ln, j) => {
            const at = c.at + delay;
            delay += 0.12;
            return <Say key={j} at={at} out={c.out} parts={ln.p} size={ln.size ?? 60} color={ln.color} weight={ln.weight} stagger={0.35} />;
          })}
        </div>
      );
    })}
  </>
);

// ---------------------------------------------------------------- the payslip
const money = (v: number) => v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const Payslip: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, 0.1, b(8) + 0.25, 0.4, 0.25);
  if (o <= 0) return null;
  // on the drop the slip flies up and away
  const fly = ramp(t, b(8) - 0.05, b(8) + 0.25, EO);
  const grow = ramp(t, 0.1, 0.8, EO);
  const row = (at: number) => ramp(t, at, at + 0.25, EO);
  const pk = (at: number) => 1 + 0.08 * punch(t, at, 0.3);
  const Row: React.FC<{ at: number; l: string; v: string; c?: string; size?: number; bold?: boolean; note?: string }> = ({ at, l, v, c = "#22201c", size = 36, bold, note }) => {
    const k = row(at);
    if (k <= 0) return null;
    return (
      <div style={{ opacity: k, transform: `translateY(${(1 - k) * -10}px) scale(${pk(at)})`, transformOrigin: "100% 50%", padding: "4px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: size, fontWeight: bold ? 900 : 700 }}>
          <span>{l}</span>
          <span style={{ fontFamily: NUM, fontWeight: 900, fontSize: size * 1.15, color: c }}>{v}</span>
        </div>
        {note ? <div style={{ fontSize: 22, fontWeight: 600, color: "#7a7366" }}>{note}</div> : null}
      </div>
    );
  };
  const hr = (at: number) => <div style={{ borderTop: "3px dashed #b9b2a3", margin: "10px 0", opacity: row(at) }} />;
  return (
    <div style={{ position: "absolute", left: 960 - 330, top: 70, width: 660, opacity: o, transform: `translateY(${(1 - grow) * 40 - fly * 900}px) rotate(${-1.2 - fly * 8}deg)`, fontFamily: FONT, color: "#22201c" }}>
      <div style={{ background: "#f7f3ea", borderRadius: "6px 6px 0 0", padding: "24px 36px 18px", boxShadow: "0 26px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: 4 }}>工资条</span>
          <span style={{ fontSize: 24, fontWeight: 600, color: "#6d675c" }}>工厂工人 · 本月</span>
        </div>
        {hr(0.3)}
        <Row at={0.5} l="应发工资" v={money(5000)} size={42} bold />
        {hr(b(2))}
        <Row at={b(2)} l="公司另交 社保、公积金" v={`+${money(1645)}`} c="#9a5b00" />
        <Row at={b(3)} l="公司实际为你花了" v={money(6645)} c="#22201c" bold />
        {hr(b(4))}
        <Row at={b(4)} l="从工资里扣 社保、公积金" v={`−${money(925)}`} c="#a3332a" />
        <Row at={b(4) + 2 * BEAT} l="个人所得税" v={money(0)} c="#22201c" />
        {hr(b(5))}
        <Row at={b(5)} l="实发" v={money(4075)} c="#b8730a" size={48} bold />
      </div>
      <svg width={660} height={16} style={{ display: "block" }}>
        <path d={`M0 0 ${Array.from({ length: 33 }, (_, i) => `L${i * 20 + 10} 14 L${i * 20 + 20} 0`).join(" ")} Z`} fill="#f7f3ea" />
      </svg>
    </div>
  );
};

// the 2,570 as a running list at the top left while each item flies off (b8–b15)
const Ledger: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(8) + 0.15, b(16) - 0.05, 0.3, 0.25);
  if (o <= 0) return null;
  const rows = [
    { l: "公积金", v: "800", at: b(8), mine: true },
    { l: "养老·个人", v: "400", at: b(9), mine: true },
    { l: "养老·公司", v: "800", at: b(10), mine: false },
    { l: "医保", v: "500", at: b(11), mine: false },
    { l: "失业、工伤", v: "70", at: b(12), mine: false },
  ];
  return (
    <div style={{ position: "absolute", left: 60, top: 140, width: 400, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 30, fontWeight: 800, color: K.sub }}>
        工资条之外的 <span style={{ fontFamily: NUM, color: K.gold, fontSize: 40 }}>2,570</span>
      </div>
      {rows.map((r, i) => {
        const now = t >= r.at && t < r.at + BAR;
        const done = t >= r.at;
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8, padding: "4px 12px", borderRadius: 8, background: now ? "rgba(255,181,61,0.22)" : "transparent", opacity: done ? 1 : 0.4, transform: `scale(${1 + 0.06 * punch(t, r.at, 0.3)})`, transformOrigin: "0 50%" }}>
            <span style={{ fontSize: 32, fontWeight: 800 }}>{r.l}</span>
            <span style={{ fontFamily: NUM, fontSize: 38, fontWeight: 900, color: !done ? K.sub : r.mine ? K.gold : K.pub }}>{r.v}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- a shop receipt (VAT inside the price)
const VatReceipt: React.FC<{ t: number }> = ({ t }) => {
  const at = b(17);
  const o = win(t, at + 0.05, b(18) - 0.05, 0.2, 0.25);
  if (o <= 0) return null;
  const k = ramp(t, at, at + 0.3, EO);
  const r = (d: number) => ramp(t, at + d, at + d + 0.2, EO);
  return (
    <div style={{ position: "absolute", left: 160, top: 200, width: 520, opacity: o, transform: `translateY(${(1 - k) * 40}px) rotate(-2deg)`, fontFamily: FONT, color: "#22201c" }}>
      <div style={{ background: "#f7f3ea", borderRadius: "6px 6px 0 0", padding: "24px 34px 18px", boxShadow: "0 26px 60px rgba(0,0,0,0.6)" }}>
        <div style={{ fontSize: 36, fontWeight: 900, textAlign: "center", letterSpacing: 4 }}>超市小票</div>
        <div style={{ borderTop: "3px dashed #b9b2a3", margin: "14px 0" }} />
        {[
          { l: "衣服一件", v: "113.00", d: 0.1 },
          { l: "其中：商品", v: "100.00", d: Q },
          { l: "其中：增值税 13%", v: "13.00", d: 2 * Q, hi: true },
        ].map((x, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: x.hi ? 900 : 700, opacity: r(x.d), padding: "4px 0", color: x.hi ? "#a3332a" : undefined, transform: `scale(${1 + (x.hi ? 0.1 : 0) * punch(t, at + x.d, 0.3)})`, transformOrigin: "100% 50%" }}>
            <span>{x.l}</span>
            <span style={{ fontFamily: NUM, fontWeight: 900 }}>{x.v}</span>
          </div>
        ))}
        <div style={{ fontSize: 22, fontWeight: 600, color: "#7a7366", marginTop: 8, opacity: r(3 * Q) }}>一般商品税率 13%，食品等 9%，多数服务 6%</div>
      </div>
      <svg width={520} height={16} style={{ display: "block" }}>
        <path d={`M0 0 ${Array.from({ length: 26 }, (_, i) => `L${i * 20 + 10} 14 L${i * 20 + 20} 0`).join(" ")} Z`} fill="#f7f3ea" />
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------- 2024 tax revenue by kind (b18–b19)
const TaxBar: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(18) + 0.1, b(20) - 0.05, 0.25, 0.25);
  if (o <= 0) return null;
  const segs = [
    { l: "增值税", v: 66672, c: K.gold, hidden: true },
    { l: "消费税", v: 16532, c: "#f0a020", hidden: true },
    { l: "企业所得税", v: 40887, c: "#8a94a8" },
    { l: "个人所得税", v: 14522, c: K.red },
    { l: "其他", v: 174972 - 66672 - 16532 - 40887 - 14522, c: "#566070" },
  ];
  const W0 = 1500;
  const X0 = 210;
  const tot = segs.reduce((a, s) => a + s.v, 0);
  const grow = ramp(t, b(18) + 0.1, b(18) + 0.7, EO);
  const iit = ramp(t, b(19), b(19) + 0.3, EO);
  let x = 0;
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o, fontFamily: FONT, textShadow: SHADOW }}>
      {segs.map((s, i) => {
        const w = (s.v / tot) * W0;
        const x0 = x;
        x += w;
        const dim = t >= b(19) && s.l !== "个人所得税" ? 0.45 : 1;
        return (
          <React.Fragment key={i}>
            <div style={{ position: "absolute", left: X0 + x0 * grow, top: 420, width: Math.max(0, w * grow - 6), height: 110, background: s.c, opacity: dim, borderRadius: 8, boxShadow: s.hidden && t < b(19) ? `0 0 30px ${K.gold}88` : undefined }} />
            <div style={{ position: "absolute", left: X0 + (x0 + w / 2) * grow, top: 548, transform: "translateX(-50%)", color: K.fg, fontSize: s.v > 30000 ? 34 : 26, fontWeight: 800, opacity: grow * dim, whiteSpace: "nowrap", textAlign: "center" }}>
              {s.l}
              <div style={{ fontFamily: NUM, fontSize: s.v > 30000 ? 44 : 34, color: s.c === "#566070" ? K.sub : s.c }}>{Math.round((s.v / tot) * 100)}%</div>
            </div>
          </React.Fragment>
        );
      })}
      <div style={{ position: "absolute", left: X0, top: 300, color: K.fg, fontSize: 52, fontWeight: 800, opacity: ramp(t, b(18) + 0.5, b(18) + 0.8) * (1 - iit) }}>
        藏在价格里的增值税、消费税：约 <span style={{ fontFamily: NUM, color: K.gold, fontSize: 76 }}>一半</span>
      </div>
      <div style={{ position: "absolute", left: X0, top: 300, color: K.fg, fontSize: 52, fontWeight: 800, opacity: iit, transform: `scale(${1 + 0.06 * punch(t, b(19), 0.3)})`, transformOrigin: "0 50%" }}>
        个人所得税：只占 <span style={{ fontFamily: NUM, color: K.red, fontSize: 76 }}>8%</span>　大部分税，人人都在交
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- the market's 100 yuan, three ways (b21–b23)
const Split: React.FC<{ t: number }> = ({ t }) => {
  const a = b(21);
  const o = win(t, a, b(24) - 0.05, 0.3, 0.3);
  if (o <= 0) return null;
  const items = [
    { l: "工资（含社保）", v: "53", d: 0, c: K.goldHi },
    { l: "税", v: "8", d: Q * 1.5, c: K.fg },
    { l: "企业和资本", v: "39", d: Q * 3, c: K.gold },
  ];
  return (
    <div style={{ position: "absolute", right: 110, top: 330, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14, opacity: o, fontFamily: FONT, textShadow: SHADOW }}>
      <div style={{ fontSize: 40, fontWeight: 800, color: K.sub }}>每生产 100 元，约这样分</div>
      {items.map((x, i) => {
        const k = ramp(t, a + x.d, a + x.d + 0.25, EO);
        return (
          <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 20, opacity: k, transform: `translateX(${(1 - k) * 40}px) scale(${1 + 0.08 * punch(t, a + x.d, 0.3)})`, transformOrigin: "100% 50%" }}>
            <span style={{ fontSize: 46, fontWeight: 800, color: K.fg }}>{x.l}</span>
            <span style={{ fontFamily: NUM, fontSize: 96, fontWeight: 900, color: x.c, minWidth: 130, textAlign: "right" }}>{x.v}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- deposit vs. mortgage (b40–b41), 30 years of interest (b42–b44)
const Rates: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(40) + 0.05, b(42) - 0.05, 0.25, 0.25);
  if (o <= 0) return null;
  const card = (at: number, top: string, v: string, c: string, x: number) => {
    const k = ramp(t, at, at + 0.3, EO);
    return (
      <div style={{ position: "absolute", left: x, top: 250, width: 640, padding: "30px 36px", borderRadius: 18, background: "rgba(8,12,22,0.72)", border: `2px solid ${c}55`, opacity: k, transform: `translateY(${(1 - k) * 30}px) scale(${1 + 0.05 * punch(t, at, 0.3)})`, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
        <div style={{ fontSize: 44, fontWeight: 800 }}>{top}</div>
        <div style={{ marginTop: 10, fontSize: 40, fontWeight: 700, color: K.sub }}>
          一年利息 <span style={{ fontFamily: NUM, fontSize: 120, fontWeight: 900, color: c }}>{v}</span> 元
        </div>
      </div>
    );
  };
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o }}>
      {card(b(40) + 0.05, "你存 1 万进银行", "95", K.fg, 200)}
      {card(b(41) + 0.05, "别人借 1 万买房", "306", K.gold, 1080)}
    </div>
  );
};
const LoanClock: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(42) + 0.05, b(45) - 0.05, 0.25, 0.3);
  if (o <= 0) return null;
  const k = ramp(t, b(42) + 0.3, b(44) + 1.4);
  return (
    <div style={{ position: "absolute", left: 110, top: 190, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW, display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 60, fontWeight: 800 }}>贷 100 万买房，还 30 年</div>
      <div style={{ fontSize: 46, fontWeight: 800 }}>
        第 <span style={{ fontFamily: NUM, fontSize: 72 }}>{Math.max(1, Math.round(30 * k))}</span> 年　已付利息 <span style={{ fontFamily: NUM, fontSize: 104, color: K.gold }}>{(52.9 * (1 - Math.pow(1 - k, 1.6))).toFixed(1)}</span> 万
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, color: K.sub }}>利率 3.06%，等额本息；这些利息，经银行流向存钱的人和银行自己</div>
    </div>
  );
};

// ---------------------------------------------------------------- the tax on wages vs. on shares (b50–b52)
const TaxTable: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(50) + 0.05, b(53) - 0.05, 0.25, 0.25);
  if (o <= 0) return null;
  const rows = [
    { l: "工资", v: "最高 45%", c: K.red, at: b(50) },
    { l: "炒股赚的差价", v: "0", c: K.gold, at: b(51) },
    { l: "股票拿满一年的分红", v: "0", c: K.gold, at: b(52) },
  ];
  return (
    <div style={{ position: "absolute", left: 260, top: 230, width: 1400, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 46, fontWeight: 800, color: K.sub, marginBottom: 20 }}>个人所得税</div>
      {rows.map((r, i) => {
        const k = ramp(t, r.at, r.at + 0.25, EO);
        return (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "14px 0", borderTop: "2px solid rgba(243,238,228,0.18)", opacity: k, transform: `translateX(${(1 - k) * -40}px) scale(${1 + 0.05 * punch(t, r.at, 0.3)})`, transformOrigin: "0 50%" }}>
            <span style={{ fontSize: 68, fontWeight: 800 }}>{r.l}</span>
            <span style={{ fontFamily: NUM, fontSize: 112, fontWeight: 900, color: r.c }}>{r.v}</span>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- who owns what (b65–b68)
const Wealth: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(65) + 0.6, b(69) - 0.05, 0.3, 0.3);
  if (o <= 0) return null;
  const rows = [
    { l: "最富的 10% 家庭", v: 47.5, c: K.gold, at: b(66) },
    { l: "最穷的 20% 家庭", v: 2.6, c: K.red, at: b(67) },
  ];
  return (
    <div style={{ position: "absolute", left: 210, top: 300, width: 1500, opacity: o, fontFamily: FONT, color: K.fg, textShadow: SHADOW }}>
      <div style={{ fontSize: 44, fontWeight: 800, color: K.sub, marginBottom: 18 }}>城镇家庭的全部资产，各占多少</div>
      {rows.map((r, i) => {
        const k = ramp(t, r.at, r.at + 0.8, EO);
        return (
          <div key={i} style={{ marginTop: 26, opacity: Math.min(1, k * 3) }}>
            <div style={{ fontSize: 50, fontWeight: 800 }}>{r.l}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 8 }}>
              <div style={{ height: 70, width: Math.max(8, (r.v / 50) * 1100 * k), background: r.c, borderRadius: 8, boxShadow: `0 0 30px ${r.c}66` }} />
              <span style={{ fontFamily: NUM, fontSize: 96, fontWeight: 900, color: r.c }}>{(r.v * k).toFixed(1)}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- names on places
const LABELS: { at: () => THREE.Vector3; text: string; a: number; b: number; color?: string }[] = [
  { at: () => ANCHORS.you, text: "你", a: 0.3, b: b(8) - 0.1, color: K.goldHi },
  { at: () => ANCHORS.you, text: "你", a: b(13), b: b(16), color: K.goldHi },
  { at: () => ANCHORS.you, text: "你", a: b(30), b: b(32), color: K.goldHi },
  { at: () => ANCHORS.you, text: "你", a: b(69), b: T.sources - 0.5, color: K.goldHi },
  { at: () => ANCHORS.bank, text: "银行", a: b(8), b: b(9) },
  { at: () => ANCHORS.gov, text: "社保基金", a: b(9), b: b(12) },
  { at: () => ANCHORS.hub, text: "公司", a: b(8), b: b(13) },
  { at: () => ANCHORS.hub, text: "商店", a: b(16) + 0.3, b: b(18) },
  { at: () => ANCHORS.gov, text: "政府", a: b(17) + 0.6, b: b(20) },
  { at: () => ANCHORS.gov, text: "政府", a: b(26), b: b(27) },
  { at: () => tankTop(byRank(RETIREES[2])).add(new THREE.Vector3(0, 1.4, 0)), text: "今天的退休老人", a: b(10) + 0.5, b: b(11), color: K.pub },
  { at: () => tankTop(byRank(CAST.landlord)).add(new THREE.Vector3(0, 1.4, 0)), text: "房东", a: b(16) + 0.2, b: b(17) },
  { at: () => tankTop(byRank(CAST.holder)).add(new THREE.Vector3(0, 2, 0)), text: "大股东", a: b(24), b: b(26) },
  { at: () => ANCHORS.bank, text: "银行", a: b(36), b: b(42) },
  { at: () => tankTop(byRank(CAST.coder)).add(new THREE.Vector3(0, 1.4, 0)), text: "买房的年轻人", a: b(38) + 0.3, b: b(42), color: K.loan },
  { at: () => ANCHORS.dev, text: "开发商", a: b(53), b: b(55) },
  { at: () => ANCHORS.gov, text: "政府", a: b(61), b: b(63) },
];
const Labels: React.FC<{ t: number }> = ({ t }) => (
  <>
    {LABELS.map((l, i) => {
      const o = win(t, l.a, l.b, 0.25, 0.25);
      if (o <= 0) return null;
      const p = project(t, l.at());
      if (!p.vis) return null;
      return (
        <Tag key={i} x={p.x} y={p.y} o={o} line size={l.text === "你" ? 48 : 36} color={l.color}>
          {l.text}
        </Tag>
      );
    })}
  </>
);

// the young buyer's debt
const DebtTag: React.FC<{ t: number }> = ({ t }) => {
  const o = win(t, b(39), b(47), 0.3, 0.3);
  if (o <= 0) return null;
  const y = yardOf(byRank(CAST.coder));
  const p = project(t, new THREE.Vector3(y.x, y.y + 4.4, y.z));
  if (!p.vis) return null;
  return (
    <div style={{ position: "absolute", left: p.x, top: p.y, transform: "translate(-50%, -100%)", opacity: o, padding: "8px 18px", borderRadius: 8, background: "rgba(120,16,12,0.82)", border: `2px solid ${K.red}`, boxShadow: `0 0 26px ${K.red}66`, fontFamily: FONT, fontWeight: 800, fontSize: 34, color: "#ffe9e4", whiteSpace: "nowrap", textShadow: SHADOW }}>
      欠银行 100 万
    </div>
  );
};

// what each flow through the air is
const ArcTags: React.FC<{ t: number }> = ({ t }) => {
  const st = scene(t);
  return (
    <>
      {st.arcs.map((a, i) => {
        if (!a.label || a.k < 0.05) return null;
        const p0 = ptOf(a.from);
        const p1 = ptOf(a.to);
        const c = p0.clone().lerp(p1, 0.5);
        c.y = Math.max(p0.y, p1.y) + (a.lift ?? 6);
        const m = p0.clone().multiplyScalar(0.25).addScaledVector(c, 0.5).addScaledVector(p1, 0.25);
        const p = project(t, m);
        if (!p.vis || p.x < 40 || p.x > 1880 || p.y < 60 || p.y > 1040) return null;
        // keep the big type clear: no flow words under the top captions of the peak, or over the wealth bars
        if (t >= B(57) && t < B(65) && p.y < 470 && p.x < 1500) return null;
        if (t >= B(65) && t < B(69) && p.y > 230 && p.y < 760 && p.x < 1750) return null;
        const col = a.col ? (a.col.b > a.col.r ? K.loan : K.pub) : K.goldHi;
        return (
          <Tag key={i} x={p.x} y={p.y - 6} o={Math.min(1, a.k * 1.4)} size={34} color={col}>
            {a.label}
          </Tag>
        );
      })}
    </>
  );
};

// dark gradients behind the type; flashes on the big cuts
const Shade: React.FC<{ t: number }> = ({ t }) => {
  const flash = Math.max(punch(t, b(8), 0.18), punch(t, b(57), 0.22), punch(t, b(33), 0.14)) * 0.55;
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(3,4,9,0.6) 0%, rgba(3,4,9,0) 36%, rgba(3,4,9,0) 62%, rgba(3,4,9,0.7) 100%)" }} />
      {flash > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(255,236,200,${flash})` }} /> : null}
    </>
  );
};

// sounds on the hits (own library, CC0); the score carries the rest
const HITS: { at: number; id: string; v: number; len?: number }[] = [
  { at: 0.5, id: "sfx-mechanical-13", v: 0.35 },
  { at: b(2), id: "sfx-mechanical-13", v: 0.35 },
  { at: b(3), id: "sfx-mechanical-13", v: 0.3 },
  { at: b(4), id: "sfx-mechanical-13", v: 0.35 },
  { at: b(5), id: "sfx-impact-20", v: 0.4 },
  { at: b(8), id: "sfx-impact-16", v: 0.55, len: 1.5 },
  { at: b(10), id: "sfx-water-10", v: 0.3 },
  { at: b(15), id: "sfx-impact-14", v: 0.35 },
  { at: b(17) + 2 * Q, id: "sfx-mechanical-13", v: 0.35 },
  { at: b(32) + Q, id: "sfx-impact-20", v: 0.4 },
  { at: b(33), id: "sfx-impact-14", v: 0.4 },
  { at: b(45), id: "sfx-impact-14", v: 0.35 },
  { at: b(47) + 2 * Q, id: "sfx-impact-16", v: 0.7, len: 1.5 },
  { at: b(51), id: "sfx-impact-20", v: 0.3 },
  { at: b(52), id: "sfx-impact-20", v: 0.3 },
  { at: b(57), id: "sfx-impact-16", v: 0.55, len: 1.5 },
  { at: b(71), id: "sfx-magic-14", v: 0.25, len: 2.6 },
];

export const Film: React.FC = () => {
  const t = useT();
  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      {t < T.card ? <TownView t={t} /> : null}
      <Shade t={t} />
      <Labels t={t} />
      <ArcTags t={t} />
      <DebtTag t={t} />
      <Ledger t={t} />
      <Split t={t} />
      <TaxBar t={t} />
      <VatReceipt t={t} />
      <Rates t={t} />
      <LoanClock t={t} />
      <TaxTable t={t} />
      <Wealth t={t} />
      <Payslip t={t} />
      <Captions t={t} />
      <SourceLine t={t} />
      <BrandMark o={1 - ramp(t, T.sources - 0.4, T.sources)} />
      <Sources at={T.sources} out={T.card + 0.2} />
      <EndCard at={T.card} />
      <Audio src={staticFile("score.wav")} />
      {HITS.map((h, i) => (
        <Sequence key={i} from={Math.round(h.at * FPS)} durationInFrames={Math.round((h.len ?? 1.2) * FPS)}>
          <Audio src={staticFile(`sfx/${h.id}.wav`)} volume={h.v} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
