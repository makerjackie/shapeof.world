// xz (sb 27–40): cells stack into a tower (what you use, the sites and apps, cloud servers, Linux…) that rests on one
// small cell, xz. One volunteer. A second name arrives, two years and more pass, a lock appears inside the cell. A login
// takes half a second longer. The lock is boxed in yellow and pulled out. In the silence: 这一次，靠的是运气。
import React from "react";
import { Cam, camAt, CamKey } from "./cam";
import { Box, clamp01, EIO, EO, ESO, ramp, Say, useT, win } from "./kit";
import { Note2 } from "./open";
import { World } from "./sheet";
import { FONT, HAN, K, MONO, NUM, SERIF } from "./theme";
import { BEAT, S, SIL0 } from "./time";

export const XZ_IN = S(27);
export const XZ_OUT = S(40);

type Block = { x: number; y: number; w: number; h: number; label: string; tone: number };
// World units; y grows downwards, the ground at y = 0. xz is the little cell at the bottom.
const BLOCKS: Block[] = [
  { x: -150, y: -1140, w: 290, h: 110, label: "刷视频", tone: 0 },
  { x: 150, y: -1140, w: 250, h: 110, label: "网购", tone: 0 },
  { x: -440, y: -1140, w: 280, h: 110, label: "聊天", tone: 0 },
  { x: 410, y: -1140, w: 240, h: 110, label: "地图", tone: 0 },
  { x: -430, y: -1020, w: 420, h: 110, label: "网站", tone: 1 },
  { x: 0, y: -1020, w: 330, h: 110, label: "银行", tone: 1 },
  { x: 340, y: -1020, w: 310, h: 110, label: "App 后台", tone: 1 },
  { x: -400, y: -900, w: 1020, h: 120, label: "云服务器", tone: 2 },
  { x: -300, y: -770, w: 820, h: 130, label: "Linux 系统", tone: 3 },
  { x: -120, y: -630, w: 470, h: 120, label: "远程登录", tone: 4 },
  { x: -30, y: -500, w: 300, h: 110, label: "系统零件", tone: 4 },
  { x: 60, y: -380, w: 120, h: 70, label: "xz", tone: 5 },
];
const XZ = BLOCKS[BLOCKS.length - 1];
const TONES = ["#fbfbf7", "#eef4f0", "#e3ede7", "#d8e6dd", "#cfdfd5", "#fff7c2"];
const DROP = (i: number) => XZ_IN + 0.05 + i * (BEAT / 3);

const WIDE: Cam = { cx: -185, cy: -820, z: 1.0 };
const NEAR: Cam = { cx: 340, cy: -300, z: 2.6 };
const cam = (t: number) => {
  const k: CamKey[] = [
    [XZ_IN - 0.3, { ...WIDE, z: 0.92, cy: -860 }],
    [S(28.6), WIDE, EO],
    [S(29.0), { ...WIDE, z: 1.03 }],
    [S(29.8), NEAR, ESO],
    [S(35.3), { ...NEAR, z: 2.55 }],
    [S(37.4), { ...NEAR, z: 2.6 }],
    [S(39.6), { ...NEAR, z: 2.3, cx: NEAR.cx + 60 }],
  ];
  return camAt(t, k, ESO);
};

// A hidden door, ajar: the backdoor only its maker can walk through.
const Lock: React.FC<{ x: number; y: number; s: number; color: string; o: number }> = ({ x, y, s, color, o }) =>
  o <= 0 ? null : (
    <svg style={{ position: "absolute", left: x - s / 2, top: y - s / 2, opacity: o, overflow: "visible" }} width={s} height={s} viewBox="0 0 40 40">
      <rect x={9} y={3} width={22} height={34} fill="#2a0c0c" stroke={color} strokeWidth={2.5} />
      <path d="M9 3 L 25 7 L 25 39 L 9 37 Z" fill={color} />
      <circle cx={21} cy={22} r={1.8} fill="#fff" />
    </svg>
  );

export const Xz: React.FC = () => {
  const t = useT();
  if (t < XZ_IN - 0.4 || t > S(40) + 0.3) return null;
  const c = cam(t);
  const worldO = 1 - ramp(t, SIL0 - 0.35, SIL0);
  const second = ramp(t, S(33), S(33.4), EO);
  const lockK = ramp(t, S(34.6), S(35.0), EO);
  const box = ramp(t, S(37.6), S(38.0), EO);
  const lift = ramp(t, S(38.3), S(39.2), EIO);
  // a calendar running from Oct 2021 to Feb 2024
  const months = Math.round(ramp(t, S(33.3), S(34.6), EIO) * 28);
  const ym = (() => {
    const m = 9 + months; // Oct 2021 = month index 9 of 2021
    return `${2021 + Math.floor(m / 12)}.${String((m % 12) + 1).padStart(2, "0")}`;
  })();
  const timer = ramp(t, S(36.0), S(36.9), EO);
  const sec = 0.299 + 0.508 * timer;
  const shake = t > S(35.5) && t < S(37.5) ? Math.sin(t * 60) * 1.5 * (1 - lift) : 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <World cam={c} o={worldO}>
        {/* ground */}
        <div style={{ position: "absolute", left: -1400, top: XZ.y + XZ.h, width: 3000, height: 3, background: "rgba(244,240,232,0.12)" }} />
        {BLOCKS.map((b, i) => {
          const k = ramp(t, DROP(i), DROP(i) + 0.3, EO);
          if (k <= 0) return null;
          const isXz = i === BLOCKS.length - 1;
          const dim = isXz ? 0 : 0.55 * ramp(t, S(29.4), S(30));
          const fadeUp = isXz ? 1 : 1 - 0.85 * ramp(t, S(29.6), S(30.2));
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: b.x + (isXz ? shake : 0),
                top: b.y - (1 - k) * 400,
                width: b.w,
                height: b.h,
                background: TONES[b.tone],
                border: isXz ? `4px solid ${K.green}` : `1px solid #b9c2bb`,
                boxSizing: "border-box",
                boxShadow: isXz ? `0 0 40px rgba(47,191,114,0.5)` : "0 10px 30px rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: isXz ? MONO : HAN,
                fontWeight: 800,
                fontSize: isXz ? 40 : 40,
                color: K.ink,
                opacity: k * fadeUp,
              }}
            >
              <span style={{ opacity: 1 - dim }}>{b.label}</span>
              {dim > 0 ? <div style={{ position: "absolute", inset: 0, background: `rgba(7,8,10,${dim})` }} /> : null}
            </div>
          );
        })}
        {/* the lock inside xz, then boxed and pulled out */}
        {(() => {
          const lx = XZ.x + XZ.w - 26 + lift * 230;
          const ly = XZ.y + XZ.h / 2 + lift * 110;
          const ls = 30 + lift * 34;
          return (
            <>
              <Lock x={lx} y={ly} s={ls} color={K.err} o={lockK} />
              {box > 0 ? <div style={{ position: "absolute", left: lx - ls / 2 - 10, top: ly - ls / 2 - 10, width: ls + 20, height: ls + 20, border: `3px solid ${K.tape}`, boxShadow: `0 0 20px ${K.tape}`, opacity: box }} /> : null}
            </>
          );
        })()}
        <div style={{ position: "absolute", left: XZ.x - 40, top: XZ.y + XZ.h + 10, width: XZ.w + 80, textAlign: "center", fontFamily: HAN, fontWeight: 700, fontSize: 15, color: K.sub, opacity: ramp(t, S(29.9), S(30.3)) }}>压缩小工具</div>
        {/* who maintains it */}
        <div style={{ position: "absolute", left: XZ.x + XZ.w + 30, top: XZ.y - 20, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, whiteSpace: "nowrap", opacity: ramp(t, S(31), S(31.4), EO) }}>
          <div style={{ padding: "4px 10px", background: "#fbfbf7", fontFamily: HAN, fontWeight: 700, fontSize: 14, color: K.ink, border: "1px solid #b9c2bb" }}>
            维护者 ① <span style={{ color: "#6b716c", fontWeight: 500 }}>· 志愿者 · 没有工资</span>
          </div>
          <div style={{ padding: "4px 10px", background: "#fbfbf7", fontFamily: HAN, fontWeight: 700, fontSize: 14, color: K.ink, border: "1px solid #b9c2bb", opacity: second, transform: `translateX(${(1 - second) * 30}px)` }}>
            维护者 ② <span style={{ color: "#6b716c", fontWeight: 500 }}>· 2021 年出现，热心帮忙</span>
          </div>
          <div style={{ fontFamily: NUM, fontWeight: 800, fontSize: 20, color: K.fg, opacity: win(t, S(33.3), S(35.4)) }}>{ym}</div>
        </div>
      </World>
      {/* type */}
      <Box x={110} y={140}>
        <Say at={S(27.3)} out={S(28.9)} parts={["那，“总有人懂”的东西，底下是什么？"]} size={54} />
      </Box>
      <Box x={110} y={720}>
        <Say at={S(29.6)} out={S(30.9)} parts={["几乎所有网站和 App 的后台，都跑在 Linux 上；"]} size={48} />
        <Say at={S(30.1)} out={S(30.9)} parts={["每台 Linux 里，几乎都装着一个压缩小工具：", { t: "xz", num: true, c: K.greenHi }, "。"]} size={48} />
      </Box>
      <Box x={110} y={720}>
        <Say at={S(31.1)} out={S(32.9)} parts={["维护它的，主要是", { t: "一个没有工资的志愿者", c: K.tape }, "。"]} size={50} />
      </Box>
      <Note2 at={S(31.4)} out={S(32.9)}>「这是一个没有报酬的业余项目。」 xz 维护者 Lasse Collin，邮件列表，2022-06-08</Note2>
      <Box x={110} y={720}>
        <Say at={S(33.05)} out={S(35.4)} parts={["有人陪他干了两年多，成了第二个维护者，"]} size={48} />
        <Say at={S(34.6)} out={S(35.4)} parts={["然后，在里面留了一道", { t: "只有自己能进的暗门", c: "#ff6b6b" }, "。"]} size={48} />
      </Box>
      {/* the half second */}
      {win(t, S(35.6), S(37.5), 0.25, 0.3) > 0 ? (
        <div style={{ position: "absolute", left: 1220, top: 520, width: 660, opacity: win(t, S(35.6), S(37.5), 0.25, 0.3), fontFamily: MONO, color: K.fg }}>
          <div style={{ fontSize: 30, color: K.sub, fontFamily: HAN, fontWeight: 600 }}>登录服务器用时</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
            <span style={{ fontSize: 110, fontWeight: 700, color: timer > 0.05 ? "#ff8a8a" : K.fg }}>{sec.toFixed(3)}</span>
            <span style={{ fontSize: 48 }}>秒</span>
          </div>
          <div style={{ height: 16, width: 600, background: "rgba(255,255,255,0.08)", marginTop: 10, position: "relative" }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: 16, width: (0.299 / 0.9) * 600, background: K.greenHi }} />
            <div style={{ position: "absolute", left: (0.299 / 0.9) * 600, top: 0, height: 16, width: ((0.508 * timer) / 0.9) * 600, background: K.err }} />
          </div>
          <div style={{ marginTop: 14, fontSize: 30, color: "#ff8a8a", opacity: ramp(t, S(36.8), S(37.0)) }}>平时 0.299 · 现在 0.807</div>
        </div>
      ) : null}
      <Box x={110} y={720}>
        <Say at={S(35.6)} out={S(37.45)} parts={[{ t: "2024", num: true }, " 年 3 月，一个工程师觉得不对劲："]} size={48} />
        <Say at={S(36.2)} out={S(37.45)} parts={["登录服务器，", { t: "慢了半秒", c: "#ff6b6b" }, "。"]} size={64} />
      </Box>
      <Box x={110} y={720}>
        <Say at={S(37.6)} out={S(39.8)} parts={["他顺着这半秒查下去，"]} size={48} />
        <Say at={S(38.2)} out={S(39.8)} parts={["赶在后门进入各大正式版之前，", { t: "揭穿了它", c: K.tape }, "。"]} size={48} />
      </Box>
      <Note2 at={S(36.2)} out={S(39.8)}>CVE-2024-3094。Andres Freund, oss-security 邮件列表 2024-03-29：ssh 登录从约 0.3 秒变成 0.8 秒；带后门的版本当时只进了部分测试版系统。</Note2>
      {/* the silence */}
      <Box x={960} y={480} align="center">
        <Say at={SIL0 - 0.15} out={S(40) + 0.3} parts={["这一次，靠的是", { t: "运气", c: K.tape }, "。"]} size={72} serif weight={900} stagger={1.6} />
      </Box>
    </div>
  );
};
