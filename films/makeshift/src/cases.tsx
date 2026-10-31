// 病例 (sb 9.5–18): positive results pour into a sheet; the row numbers race to 65,536 and hit the bottom of the old
// format; the rows that keep coming fall off into the dark, red, 15,841 of them; they scatter into contacts not traced;
// then 85 audited real spreadsheets, 94% with errors.
import React from "react";
import { Box, clamp01, EIN, EIO, EO, lerp, ramp, Say, useT, win } from "./kit";
import { Note2 } from "./open";
import { Chrome, Note, Tile } from "./sheet";
import { FONT, K, NUM } from "./theme";
import { S } from "./time";

export const CASES_IN = S(9.5);
export const CASES_OUT = S(18);
const LAST = 65536;
const RHT = 58;
const TOP = 202; // below the chrome
const COLS = [{ w: 90, t: "" }, { w: 260, t: "样本编号" }, { w: 250, t: "检测日期" }, { w: 200, t: "结果" }, { w: 330, t: "地区" }, { w: 300, t: "录入" }];
const XS = COLS.reduce<number[]>((a, c, i) => (a.push(i === 0 ? 0 : a[i - 1] + COLS[i - 1].w), a), []);
const SHEET_W = XS[XS.length - 1] + COLS[COLS.length - 1].w;
const SX = 70;

const REGIONS = ["伦敦", "曼彻斯特", "利兹", "伯明翰", "利物浦", "纽卡斯尔", "谢菲尔德", "布里斯托"];
const rowData = (n: number) => {
  const h = Math.sin(n * 12.9898) * 43758.5453;
  const r = h - Math.floor(h);
  const day = 25 + Math.floor((n / LAST) * 7.99);
  const d = day > 30 ? `2020/10/${day - 30}` : `2020/9/${day}`;
  return { id: `C${(4120000 + n * 7).toString()}`, date: d, region: REGIONS[Math.floor(r * REGIONS.length)], by: r > 0.5 ? "自动导入" : "自动导入" };
};

// Top row shown, as a continuous value: slow at first, a blur through the tens of thousands, settling at the bottom.
const topRow = (t: number) => {
  const u = ramp(t, S(10.2), S(12.3), (x) => x);
  const e = u < 0.5 ? 0.5 * Math.pow(2 * u, 3) : 1 - 0.5 * Math.pow(2 * (1 - u), 3);
  const visible = Math.floor((1034 - TOP - 40) / RHT);
  return 1 + (LAST - visible + 1) * e;
};

const Row: React.FC<{ n: number; y: number; red?: number; o?: number; rot?: number; x?: number }> = ({ n, y, red = 0, o = 1, rot = 0, x = 0 }) => {
  const d = rowData(n);
  const vals = [String(n), d.id, d.date, "阳性", d.region, d.by];
  return (
    <div style={{ position: "absolute", left: SX + x, top: y, width: SHEET_W, height: RHT, opacity: o, transform: `rotate(${rot}deg)`, transformOrigin: "50% 50%", background: red > 0 ? `rgba(255,77,77,${0.15 + 0.55 * red})` : K.paper, borderBottom: `1px solid ${K.grid}` }}>
      {vals.map((v, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: XS[i],
            top: 0,
            width: COLS[i].w,
            height: RHT,
            display: "flex",
            alignItems: "center",
            justifyContent: i === 0 ? "center" : "flex-start",
            padding: i === 0 ? 0 : "0 14px",
            boxSizing: "border-box",
            fontFamily: i === 0 ? NUM : FONT,
            fontWeight: i === 0 ? 700 : 500,
            fontSize: i === 0 ? 20 : 25,
            color: i === 0 ? (red > 0 ? "#fff" : K.headText) : i === 3 ? "#c0392b" : K.ink,
            background: i === 0 ? (red > 0 ? "#b52a2a" : K.head) : undefined,
            borderRight: `1px solid ${K.grid}`,
          }}
        >
          {v}
        </div>
      ))}
    </div>
  );
};

export const Cases: React.FC = () => {
  const t = useT();
  if (t < CASES_IN - 0.4 || t > CASES_OUT + 0.3) return null;
  const inK = ramp(t, CASES_IN - 0.35, CASES_IN + 0.05, EO);
  const lift = ramp(t, S(12.35), S(12.8), EIO); // the sheet slides up to show its bottom edge
  const r0 = topRow(t);
  const visible = Math.ceil((1034 - TOP - 40) / RHT) + 1;
  const sheetY = TOP + 40 - (r0 - Math.floor(r0)) * RHT - lift * 380;
  const audit = ramp(t, S(15.9), S(16.3), EO);
  const sheetO = (1 - ramp(t, S(14.4), S(14.9))) * inK;
  const bottomY = TOP + 40 + (LAST - r0 + 1) * RHT - lift * 380;
  const chrome = (1 - lift) * inK;
  const fallStart = S(12.75);
  const N = 15841;
  const counter = Math.round(N * ramp(t, fallStart, S(14.2), (x) => x));
  const contacts = ramp(t, S(14.5), S(15.6), EO);
  return (
    <div style={{ position: "absolute", inset: 0, opacity: 1 - ramp(t, CASES_OUT - 0.1, CASES_OUT + 0.25) }}>
      {sheetO > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: sheetO, transform: `translateX(${(1 - inK) * 120}px) scale(${1 - 0.36 * lift})`, transformOrigin: `${SX}px 60px` }}>
          {/* the paper's glow */}
          <div style={{ position: "absolute", left: SX, top: TOP - lift * 380, width: SHEET_W, height: Math.min(1034 - TOP + 400, bottomY - TOP + lift * 380), boxShadow: "0 0 160px 40px rgba(214,236,222,0.07), 0 30px 80px rgba(0,0,0,0.6)", background: K.paper }} />
          {/* column letters + headers */}
          <div style={{ position: "absolute", left: SX, top: TOP - lift * 380, width: SHEET_W, height: 40, background: K.head, borderBottom: "1px solid #cfd3cd" }}>
            {COLS.map((c, i) => (
              <div key={i} style={{ position: "absolute", left: XS[i], width: c.w, height: 40, display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", fontFamily: FONT, fontWeight: 800, fontSize: 21, color: K.headText, borderRight: "1px solid #d6d9d3" }}>
                {c.t}
              </div>
            ))}
          </div>
          {Array.from({ length: visible }, (_, i) => {
            const n = Math.floor(r0) + i;
            if (n > LAST) return null;
            const y = sheetY + i * RHT;
            if (y < TOP - lift * 380 + 40 - 1) return null;
            return <Row key={n} n={n} y={y} />;
          })}
          {/* the bottom of the old format */}
          {bottomY < 1080 ? (
            <>
              <div style={{ position: "absolute", left: SX - 20, top: bottomY - 2, width: SHEET_W + 40, height: 6, background: K.err, boxShadow: `0 0 24px ${K.err}` }} />
              <div style={{ position: "absolute", left: SX + SHEET_W + 40, top: bottomY - 22, fontFamily: NUM, fontWeight: 800, fontSize: 30, color: K.err, opacity: ramp(t, S(12.3), S(12.6)) }}>
                第 65,536 行：到底了
              </div>
            </>
          ) : null}
          {/* rows that keep coming, and fall */}
          {t > fallStart
            ? Array.from({ length: 26 }, (_, i) => {
                const a = fallStart + i * 0.07;
                const d = t - a;
                if (d < 0 || d > 1.4) return null;
                const g = d * d * 900;
                const h = Math.sin(i * 77.7) * 1000;
                const wob = h - Math.floor(h);
                return <Row key={i} n={LAST + 1 + i} y={bottomY + 6 + g} red={clamp01(d * 3)} o={1 - clamp01((d - 0.6) / 0.8)} rot={(wob - 0.5) * 16 * clamp01(d * 1.5)} x={(wob - 0.5) * 140 * d} />;
              })
            : null}
        </div>
      ) : null}
      <Chrome o={chrome} name="A65536" formula={<span style={{ fontFamily: NUM }}>阳性</span>} />
      {/* type */}
      <Note x={1180} y={300} w={640} at={S(9.75)} out={S(10.95)}>
        <Say at={S(9.75)} parts={["同一年，英国的新冠阳性结果，"]} size={42} color={K.ink} shadow="none" />
        <Say at={S(10.15)} parts={["要经过一张表格汇总。"]} size={42} color={K.ink} shadow="none" />
      </Note>
      <Note x={1180} y={340} w={640} at={S(11.05)} out={S(12.35)}>
        <Say at={S(11.05)} parts={["旧格式的表格，"]} size={42} color={K.ink} shadow="none" />
        <Say at={S(11.35)} parts={["最多 ", { t: "65,536", num: true, c: "#c0392b" }, " 行。"]} size={52} color={K.ink} shadow="none" />
      </Note>
      <Box x={1010} y={520}>
        <Say at={S(12.75)} out={S(14.4)} parts={["多出来的，被直接截掉了："]} size={50} />
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, opacity: win(t, S(13.1), S(14.4), 0.2, 0.3) }}>
          <span style={{ fontFamily: NUM, fontWeight: 900, fontSize: 120, color: K.err, textShadow: "0 0 40px rgba(255,77,77,0.45)" }}>{counter.toLocaleString("en-US")}</span>
          <span style={{ fontFamily: FONT, fontWeight: 800, fontSize: 44, color: K.fg }}>个阳性病例</span>
        </div>
        <Say at={S(13.3)} out={S(14.4)} parts={["没报上去。"]} size={50} />
      </Box>
      <Note2 at={S(12.75)} out={S(15.8)}>英国公共卫生署 2020-10-05：9 月 25 日至 10 月 2 日共 15,841 例未及时上报；旧 XLS 格式的行数上限见 Fetzer & Graeber, PNAS 2021。密接人数为该研究的估计。</Note2>
      {/* contacts: one dot ≈ 100 people */}
      {contacts > 0 && t < S(16.2) ? (
        <svg style={{ position: "absolute", left: 0, top: 0, opacity: 1 - ramp(t, S(15.85), S(16.15)) }} width={1920} height={1080}>
          {Array.from({ length: 480 }, (_, i) => {
            const h1 = Math.sin(i * 12.9898) * 43758.5453;
            const h2 = Math.sin(i * 78.233) * 43758.5453;
            const a = (h1 - Math.floor(h1)) * Math.PI * 2;
            const rr = Math.sqrt(h2 - Math.floor(h2));
            const k = clamp01(contacts * 1.6 - (i / 480) * 0.6);
            const x = 1240 + Math.cos(a) * rr * 520 * EO(k);
            const y = 560 + Math.sin(a) * rr * 330 * EO(k);
            return <circle key={i} cx={x} cy={y} r={5} fill={K.err} opacity={0.25 + 0.6 * k} />;
          })}
        </svg>
      ) : null}
      <Box x={110} y={760}>
        <Say at={S(14.6)} out={S(15.85)} parts={["约 ", { t: "4.8 万", c: "#ff6b6b", num: true }, "名密切接触者，"]} size={56} />
        <Say at={S(14.95)} out={S(15.85)} parts={["没被及时找到。"]} size={56} />
      </Box>
      <div style={{ position: "absolute", left: 1500, top: 940, fontFamily: FONT, fontSize: 22, color: "rgba(244,240,232,0.6)", opacity: win(t, S(14.8), S(15.85)) }}>● 约 100 人</div>
      {/* the audit: 85 real spreadsheets */}
      {audit > 0 ? (
        <div style={{ position: "absolute", inset: 0, opacity: audit }}>
          {Array.from({ length: 85 }, (_, i) => {
            const c = i % 17;
            const r = Math.floor(i / 17);
            const bad = ![3, 22, 40, 61, 79].includes(i);
            const order = (i * 37) % 85;
            const k = bad ? ramp(t, S(16.6) + (order / 85) * 1.6, S(16.6) + (order / 85) * 1.6 + 0.2) : 0;
            return <Tile key={i} x={130 + c * 98} y={170 + r * 120} w={82} h={104} red={k} seed={i + 200} lit={0.6} />;
          })}
        </div>
      ) : null}
      {audit > 0 ? <div style={{ position: "absolute", left: 0, top: 760, width: 1920, height: 280, background: "linear-gradient(180deg, transparent, rgba(7,8,10,0.9) 30%)", opacity: audit }} /> : null}
      <Box x={130} y={800}>
        <Say at={S(16.1)} out={S(17.9)} parts={["研究者审计过 ", { t: "85", num: true }, " 张真实的表格："]} size={52} />
      </Box>
      <Box x={1000} y={770}>
        <Say at={S(16.9)} out={S(17.9)} parts={[{ t: "94%", num: true, c: "#ff6b6b" }, " 有错。"]} size={110} />
      </Box>
      <Note2 at={S(16.9)} out={S(17.9)}>Panko 2015（EuSpRIG 会议）汇总的实地审计，共 85 张表格。</Note2>
    </div>
  );
};
