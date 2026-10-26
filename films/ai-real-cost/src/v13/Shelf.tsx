// Concept C: a supermarket shelf. The models sit on the shelf as packs of "100 万 token"; their tags show the list
// price, and the real price arrives the way prices change in a shop: a new sticker slapped over the old tag.
// (Later chapters map cleanly: 包月 = the family pack you may not finish, 免费额度 = free samples.)
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import { FONT, MONO } from "../v10/theme";
import { Grain, useFonts } from "../v12/noir";
import { EO, hash, Id, lerp, M, money, PRICE, ramp, rgba, TASK } from "./data";

const T = { sign: 0.1, signUp: 2.0, boxes: 0.5, tags: 1.8, cheap1: 4.0, cap1: 4.4, stick: 6.6, cap2: 9.4, dear2: 9.0, end: 13.5 };
const SLOT = 340;
const SX0 = (1920 - 5 * SLOT) / 2;
const SHELF_Y = 650;
const INK = "#2a2520";
const BOX: Record<Id, string> = { claude: "#e8784a", chatgpt: "#2fb79a", kimi: "#8e7cf0", glm: "#3fa9e0", deepseek: "#3d6fe0" };

/** a damped swing, for things that clip on or hang */
const swing = (t: number, at: number, amp: number) => (t < at ? 0 : amp * Math.exp(-(t - at) * 3.2) * Math.sin((t - at) * 13));

export const Shelf: React.FC = () => {
  const frame = useCurrentFrame();
  useFonts([`900 64px ${FONT}`, `700 24px ${FONT}`, `700 64px ${MONO}`, `500 19px ${FONT}`], "AI 的真实价格文字区标价每 100 万 token装做一道难题最便宜最贵按标价：Claude 是 DeepSeek 的倍差距拉大到智谱价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月ChatGPTKimiOpus 5.5GPT-6 AstraK3.1 ProGLM-5.3V4.1 Flash$0123456789.");
  const t = frame / 30;
  const cam = ramp(t, 0, T.end, (v) => v);
  const signUp = ramp(t, T.signUp, T.signUp + 0.8);
  const order = M; // shelf order stays put; stickers do the ranking

  return (
    <AbsoluteFill style={{ background: "#efe9df", overflow: "hidden" }}>
      <Audio src={staticFile("music-ep1.wav")} volume={0.55} />
      {M.map((m, i) => (
        <Sequence key={`c${i}`} from={Math.round((T.tags + i * 0.14) * 30)} layout="none">
          <Audio src={staticFile("sfx/clip.wav")} volume={0.45} />
        </Sequence>
      ))}
      {M.map((m, i) => (
        <Sequence key={`s${i}`} from={Math.round((T.stick + i * 0.32) * 30)} layout="none">
          <Audio src={staticFile("sfx/slap.wav")} volume={0.6} />
        </Sequence>
      ))}
      {[T.cheap1, T.dear2].map((at, i) => (
        <Sequence key={`r${i}`} from={Math.round(at * 30)} layout="none">
          <Audio src={staticFile("sfx/slap.wav")} volume={0.75} />
        </Sequence>
      ))}

      {/* the store behind, out of focus */}
      <AbsoluteFill style={{ transform: `translateX(${lerp(20, -20, cam)}px)`, filter: "blur(14px)" }}>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #f7f3ec 0%, #ece5d9 60%, #e2dacd 100%)" }} />
        {Array.from({ length: 14 }, (_, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: -100 + i * 160 + hash(i, 1) * 40,
              top: 120 + hash(i, 2) * 60,
              width: 90 + hash(i, 3) * 60,
              height: 160 + hash(i, 4) * 90,
              borderRadius: 10,
              background: ["#d9b38c", "#9cc3b5", "#e6c46c", "#b7a7d6", "#e39b86", "#a9c7e3"][i % 6],
              opacity: 0.35,
            }}
          />
        ))}
        <div style={{ position: "absolute", left: 0, right: 0, top: 380, height: 18, background: "#d8d0c3" }} />
      </AbsoluteFill>
      {/* soft top light */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 70% 55% at 50% 0%, rgba(255,255,255,0.55), rgba(255,255,255,0) 70%)" }} />

      <AbsoluteFill style={{ transform: `translateX(${lerp(50, -50, cam)}px) scale(${lerp(1, 1.05, cam)})`, transformOrigin: "50% 60%" }}>
        {/* aisle sign */}
        <div style={{ position: "absolute", left: 960, top: lerp(0, -340, signUp), transform: `translateX(-50%) rotate(${swing(t, T.sign + 0.4, 2.2) + Math.sin(t * 1.3) * 0.4}deg)`, transformOrigin: "50% 0%" }}>
          <div style={{ position: "absolute", left: 80, top: 0, width: 2, height: 110, background: "#b9b1a4" }} />
          <div style={{ position: "absolute", right: 80, top: 0, width: 2, height: 110, background: "#b9b1a4" }} />
          <div style={{ marginTop: 110, padding: "22px 64px", background: INK, borderRadius: 8, boxShadow: "0 18px 30px rgba(0,0,0,0.25)", whiteSpace: "nowrap", textAlign: "center" }}>
            <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 64, color: "#fff8ec", letterSpacing: "0.08em" }}>AI 的真实价格</div>
            <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 24, color: "#ffd166", letterSpacing: "0.3em", marginTop: 4 }}>文字 AI 区</div>
          </div>
        </div>

        {/* shelf back and board */}
        <div style={{ position: "absolute", left: SX0 - 80, width: 5 * SLOT + 160, top: SHELF_Y - 380, height: 380, background: "linear-gradient(180deg, #e7e0d4, #ddd5c7)", borderRadius: "6px 6px 0 0" }} />
        <div style={{ position: "absolute", left: SX0 - 100, width: 5 * SLOT + 200, top: SHELF_Y, height: 26, background: "linear-gradient(180deg, #fbfaf7, #e9e5de)", boxShadow: "0 10px 20px rgba(0,0,0,0.15)" }} />
        <div style={{ position: "absolute", left: SX0 - 100, width: 5 * SLOT + 200, top: SHELF_Y + 26, height: 44, background: "linear-gradient(180deg, #d6d0c6, #c9c2b6)" }} />

        {order.map((m, i) => {
          const cx = SX0 + i * SLOT + SLOT / 2;
          const inB = ramp(t, T.boxes + i * 0.1, T.boxes + i * 0.1 + 0.6, EO);
          return (
            <React.Fragment key={m.id}>
              <Pack m={m} cx={cx} drop={1 - inB} />
              <Tag t={t} m={m} cx={cx} i={i} />
            </React.Fragment>
          );
        })}
      </AbsoluteFill>

      <Caption t={t} on={T.cap1} off={T.stick - 0.3} pre="按标价：" mid="Claude 是 DeepSeek 的 " num="17" post=" 倍" />
      <Caption t={t} on={T.cap2} pre="做一道难题：" mid="差距拉大到 " num="23" post=" 倍" />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 30, textAlign: "center", fontFamily: FONT, fontWeight: 500, fontSize: 19, color: "#8b8378" }}>
        价格：各家官方 API 输出价；花费：Artificial Analysis 评测实测 · 2026 年 10 月
      </div>
      <Grain frame={frame} amount={0.035} />
    </AbsoluteFill>
  );
};

const Pack: React.FC<{ m: (typeof M)[number]; cx: number; drop: number }> = ({ m, cx, drop }) => {
  const w = 214;
  const h = 290;
  const c = BOX[m.id];
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: SHELF_Y - h - drop * 60, width: w, height: h, opacity: 1 - drop }}>
      {/* side and top faces */}
      <div style={{ position: "absolute", left: w, top: 10, width: 30, height: h - 10, background: `linear-gradient(180deg, ${rgba(c, 1)}, ${rgba(c, 0.8)})`, filter: "brightness(0.72)", transform: "skewY(-18deg)", transformOrigin: "0 0" }} />
      <div style={{ position: "absolute", left: 0, top: -10, width: w, height: 10, background: c, filter: "brightness(1.15)", transform: "skewX(-60deg)", transformOrigin: "0 100%" }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: 4,
          background: `linear-gradient(160deg, ${rgba("#ffffff", 0.22)} 0%, ${rgba("#ffffff", 0)} 40%), ${c}`,
          boxShadow: "0 16px 24px rgba(0,0,0,0.18)",
          padding: "26px 20px",
          color: "#fff",
        }}
      >
        <div style={{ width: 54, height: 54, borderRadius: 27, border: "5px solid rgba(255,255,255,0.9)", marginBottom: 26 }} />
        <div style={{ fontFamily: m.name === "智谱" ? FONT : MONO, fontWeight: m.name === "智谱" ? 900 : 700, fontSize: 38, lineHeight: "44px" }}>{m.name}</div>
        <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 18, opacity: 0.8, marginTop: 6 }}>{m.model}</div>
        <div style={{ position: "absolute", left: 20, bottom: 22, fontFamily: FONT, fontWeight: 700, fontSize: 20, opacity: 0.9 }}>100 万 token 装</div>
      </div>
    </div>
  );
};

const Tag: React.FC<{ t: number; m: (typeof M)[number]; cx: number; i: number }> = ({ t, m, cx, i }) => {
  const at = T.tags + i * 0.14;
  if (t < at) return null;
  const up = ramp(t, at, at + 0.25, EO);
  const rot = swing(t, at + 0.2, 6);
  const w = 260;
  const stickAt = T.stick + i * 0.32;
  const st = ramp(t, stickAt, stickAt + 0.12, EO);
  const cheap = m.id === "deepseek" && t >= T.cheap1;
  const dear = m.id === "claude" && t >= T.dear2;
  return (
    <div style={{ position: "absolute", left: cx - w / 2, top: SHELF_Y + 34 + (1 - up) * 80, width: w, transform: `rotate(${rot}deg)`, transformOrigin: "50% 0%", opacity: up }}>
      <div style={{ background: "#fffdf7", borderRadius: 6, overflow: "hidden", boxShadow: "0 10px 18px rgba(0,0,0,0.18)" }}>
        <div style={{ background: "#ffd21f", padding: "6px 14px", fontFamily: FONT, fontWeight: 900, fontSize: 20, color: INK, display: "flex", justifyContent: "space-between" }}>
          <span>{m.name}</span>
          <span style={{ fontWeight: 700, fontSize: 16 }}>标价</span>
        </div>
        <div style={{ padding: "6px 14px 12px" }}>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 64, lineHeight: "70px", color: INK }}>{money(PRICE[m.id])}</div>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: "#7b7368" }}>每 100 万 token</div>
        </div>
      </div>
      {/* the price-change sticker: the real cost of one hard task */}
      {t >= stickAt && (
        <div
          style={{
            position: "absolute",
            left: 18,
            top: 30,
            width: w - 36,
            padding: "8px 12px 10px",
            background: "#ff7a1a",
            borderRadius: 4,
            transform: `rotate(${-3 + hash(i, 9) * 4}deg) scale(${lerp(1.5, 1, st)})`,
            opacity: st,
            boxShadow: "0 6px 12px rgba(0,0,0,0.25)",
            color: "#fff",
          }}
        >
          <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 18 }}>做一道难题</div>
          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 56, lineHeight: "60px" }}>{money(TASK[m.id])}</div>
        </div>
      )}
      {cheap && <Round t={t} at={T.cheap1} label="最便宜" color="#e3262f" x={w - 70} y={-40} />}
      {dear && <Round t={t} at={T.dear2} label="最贵" color="#2a2520" x={w - 70} y={-40} />}
    </div>
  );
};

const Round: React.FC<{ t: number; at: number; label: string; color: string; x: number; y: number }> = ({ t, at, label, color, x, y }) => {
  const s = ramp(t, at, at + 0.14, EO);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 104,
        height: 104,
        borderRadius: 52,
        background: color,
        color: "#fff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: label.length > 2 ? 26 : 32,
        transform: `rotate(-12deg) scale(${lerp(1.6, 1, s)})`,
        opacity: s,
        boxShadow: "0 6px 14px rgba(0,0,0,0.3)",
        border: "4px solid rgba(255,255,255,0.85)",
      }}
    >
      {label}
    </div>
  );
};

const Caption: React.FC<{ t: number; on: number; off?: number; pre: string; mid: string; num: string; post: string }> = ({ t, on, off, pre, mid, num, post }) => {
  const o = ramp(t, on, on + 0.5, EO) * (off === undefined ? 1 : 1 - ramp(t, off, off + 0.3));
  if (o <= 0) return null;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 120, textAlign: "center", opacity: o, transform: `translateY(${(1 - o) * 20}px)`, fontFamily: FONT, fontWeight: 900, fontSize: 60, color: INK, whiteSpace: "nowrap" }}>
      <span style={{ color: "#8b8378", fontWeight: 700, fontSize: 40 }}>{pre}</span>
      {mid}
      <span style={{ color: "#e3262f", fontSize: 88 }}>{num}</span>
      {post}
    </div>
  );
};
