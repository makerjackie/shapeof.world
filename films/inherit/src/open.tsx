// Opening sample (script v2, opening #1): the saying, a family that kept it (Rockefeller), a family that lost it
// (Vanderbilt, Fifth Avenue mansions demolished by 1947), the two trees side by side, the question.
// One focal point at a time on the centre axis; captions sit in one band at the bottom.
import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { BrandMark, EIO, EO, EIN, Say, SHADOW, clamp01, keys, lerp, ramp, useT, win } from "./kit";
import { Paper, Portrait, Tree, buildTree, rnd } from "./world";
import type { Node } from "./world";
import { FONT, K, NUM, SERIF } from "./theme";
import { BEAT, FPS, MUSIC_FROM, S, SAMPLE_S, fr } from "./timing";

// ---------- timeline (story bars) ----------
export const T = {
  stamp: S(0),
  rock: S(0.5),
  vand: S(2),
  fall: S(3.5),
  pair: S(5),
  q: S(6),
  end: SAMPLE_S,
};

// ---------- the saying, stamped ----------
const Stamp: React.FC<{ t: number }> = ({ t }) => {
  const d = t - T.stamp;
  const hit = ramp(d, 0, 0.16, EIN);
  const lift = ramp(t, T.rock, T.rock + 0.7, EIO);
  const out = ramp(t, T.rock + 0.15, T.rock + 0.55, EIO);
  if (out >= 1) return null;
  const scale = lerp(1.9, 1, hit) * lerp(1, 0.8, lift);
  const y = lerp(470, 540, lift);
  const shake = d > 0.16 && d < 0.4 ? Math.sin(d * 90) * 6 * (0.4 - d) * 4 : 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: y, display: "flex", flexDirection: "column", alignItems: "center", opacity: hit * (1 - out),
      transform: `translateX(${shake}px) scale(${scale})`, transformOrigin: "50% 50%" }}>
      <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 46, color: K.sub, letterSpacing: 8, marginBottom: 6, opacity: 1 - lift }}>都说</div>
      <div style={{ position: "relative", padding: "18px 46px 26px", border: `6px solid ${K.seal}`, borderRadius: 10, background: "rgba(184,57,43,0.10)" }}>
        <span style={{ fontFamily: SERIF, fontWeight: 900, fontSize: 168, color: K.fg, letterSpacing: 18, textShadow: SHADOW, lineHeight: 1 }}>富不过三代</span>
      </div>
    </div>
  );
};

// ---------- the Vanderbilt mansion, collapsing ----------
const COLS = 22;
const ROWS = 17;
const Mansion: React.FC<{ t: number; x: number; y: number; w: number; o: number }> = ({ t, x, y, w, o }) => {
  if (o <= 0) return null;
  const h = (w * 1371) / 1800;
  const tw = w / COLS;
  const th = h / ROWS;
  const tiles: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const k = r * COLS + c;
      // falls in three waves on the beats, the lower rows first so the facade sags
      const wave = Math.floor(rnd(k, 9) * 3);
      const start = T.fall + 0.15 + wave * BEAT * 1.5 + (ROWS - r) * 0.012 + rnd(k, 6) * 0.25;
      const d = Math.max(0, t - start);
      const dy = 1500 * d * d;
      const dx = (rnd(k, 7) - 0.5) * 160 * d;
      const rot = (rnd(k, 8) - 0.5) * 220 * d;
      const fade = clamp01(1 - (d - 0.5) / 0.4);
      if (fade <= 0) continue;
      tiles.push(
        <div key={k} style={{ position: "absolute", left: c * tw, top: r * th, width: tw + 0.6, height: th + 0.6,
          backgroundImage: `url(${staticFile("img/cv2.jpg")})`, backgroundSize: `${w}px ${h}px`, backgroundPosition: `${-c * tw}px ${-r * th}px`,
          transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: fade }} />,
      );
    }
  // dust: soft warm puffs rising from the base while it falls
  const dust = Array.from({ length: 26 }, (_, i) => {
    const at = T.fall + 0.3 + rnd(i, 11) * 1.6;
    const d = t - at;
    if (d < 0 || d > 2.4) return null;
    const px = rnd(i, 12) * w;
    const py = h - 40 - d * 90;
    const rr = 60 + d * 120;
    return <div key={`d${i}`} style={{ position: "absolute", left: px - rr, top: py - rr, width: rr * 2, height: rr * 2, borderRadius: "50%",
      background: "radial-gradient(circle, rgba(170,140,100,0.30) 0%, transparent 70%)", opacity: clamp01(1 - d / 2.4) }} />;
  });
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h, opacity: o }}>
      <div style={{ position: "absolute", inset: -14, border: `2px solid rgba(240,192,98,${0.5 * clamp01(1 - (t - T.fall) / 0.6)})`, borderRadius: 4 }} />
      {tiles}
      {dust}
    </div>
  );
};

// ---------- the composition ----------
export const Open: React.FC<{ sound?: boolean; brand?: boolean }> = ({ sound = true, brand = true }) => {
  const t = useT();

  // Rockefeller tree: 7 generations
  const rockCounts = [1, 3, 5, 8, 11, 14, 17];
  const rockSpread = [0, 180, 300, 420, 520, 600, 660];
  // Vanderbilt tree: the son doubled it, then it thinned out
  const vandCounts = [1, 2, 5, 8, 11, 14, 17];

  // camera for the Rockefeller group: centre → right half (scaled) for the pair shot
  const rockShift = keys(t, [[T.vand - 0.2, 0], [T.vand + 0.5, 1], [T.pair - 0.2, 1], [T.pair + 0.5, 2]], EIO);
  const rockCx = rockShift <= 1 ? lerp(960, 1560, rockShift) : lerp(1560, 1340, rockShift - 1);
  const rockScale = rockShift <= 1 ? lerp(1, 0.62, rockShift) : lerp(0.62, 0.86, rockShift - 1);
  const rockDim = rockShift <= 1 ? lerp(1, 0.12, rockShift) : lerp(0.12, 1, rockShift - 1);
  const qDim = lerp(1, 0.22, ramp(t, T.q, T.q + 0.6, EIO));

  const rockNodes = buildTree(0, 0, 66, rockCounts, rockSpread);
  const rockGrow = (n: Node) => (t - (T.rock + 0.35 + n.row * BEAT * 0.9 + n.i * 0.012)) / 0.45;

  const vandNodes = buildTree(0, 0, 66, vandCounts, rockSpread);
  const vandGrow = (n: Node) => (t - (T.pair + 0.1 + n.row * 0.09 + n.i * 0.006)) / 0.35;
  const vandLoss = (n: Node) => (n.row < 2 ? null : T.pair + 0.75 + (n.row - 2) * BEAT * 0.5 + rnd(n.i + n.row * 31, 2) * 0.2);
  const vandGold = (n: Node) => {
    const at = vandLoss(n);
    return at === null ? 1 : 1 - clamp01((t - at) / 0.35);
  };

  // the mansion and its portrait
  const vandIn = win(t, T.vand + 0.05, T.pair + 0.2, 0.5, 0.4);
  const yearK = ramp(t, T.fall + 0.2, T.fall + 2.0, (x) => x);
  const year = Math.round(lerp(1926, 1947, yearK));
  const yearO = win(t, T.fall + 0.1, T.pair, 0.25, 0.35);

  const capY = 884;

  return (
    <AbsoluteFill style={{ background: K.bg, overflow: "hidden" }}>
      <Paper />

      {/* Rockefeller: portrait + seven generations */}
      <div style={{ position: "absolute", left: rockCx - 960, top: 0, width: 1920, height: 1080, opacity: rockDim * qDim * win(t, T.rock, 99, 0.3, 0.3),
        transform: `scale(${rockScale})`, transformOrigin: `960px 520px` }}>
        <div style={{ position: "absolute", left: 960, top: 360 }}>
          <Tree id="rock" nodes={rockNodes} grow={rockGrow} gold={() => 1} t={t} />
        </div>
        <div style={{ position: "absolute", left: 960, top: 360, width: 0, height: 0 }}>
          <Portrait src="img/rock.jpg" x={0} y={-112} r={88} o={ramp(t, T.rock + 0.45, T.rock + 0.9, EO)} />
        </div>
        {/* generation label on the last row */}
        <div style={{ position: "absolute", left: 960 + 360, top: 360 + 6 * 66 - 30, fontFamily: SERIF, fontWeight: 900, fontSize: 52, color: K.gold,
          opacity: ramp(t, T.rock + 0.35 + 6 * BEAT * 0.9, T.rock + 0.35 + 6 * BEAT * 0.9 + 0.4, EO), textShadow: SHADOW, whiteSpace: "nowrap" }}>
          第七代
        </div>
        {/* who he was */}
        <div style={{ position: "absolute", left: 960 + 110, top: 360 - 150, fontFamily: SERIF, fontWeight: 900, fontSize: 40, color: K.goldHi, whiteSpace: "nowrap",
          opacity: ramp(t, T.rock + 0.7, T.rock + 1.1, EO), textShadow: SHADOW }}>
          石油大王<div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 26, color: K.sub }}>约翰 · 洛克菲勒</div>
        </div>
      </div>

      {/* Vanderbilt: the mansion on Fifth Avenue */}
      <Mansion t={t} x={960 - 470} y={96} w={940} o={vandIn} />
      <Portrait src="img/vand.jpg" x={960 - 470 + 6} y={96 + 716 - 30} r={86} o={vandIn * (1 - ramp(t, T.fall + 0.2, T.fall + 0.9, EIO))} />
      {yearO > 0 ? (
        <div style={{ position: "absolute", left: 0, right: 0, top: 300, textAlign: "center", fontFamily: NUM, fontWeight: 900, fontSize: 210, color: K.goldHi,
          letterSpacing: 6, opacity: yearO, textShadow: "0 0 60px rgba(240,192,98,0.45), 0 4px 18px rgba(0,0,0,0.8)" }}>
          {year}
        </div>
      ) : null}

      {/* the pair: Vanderbilt tree, left, losing its gold */}
      {t > T.pair - 0.1 ? (
        <div style={{ position: "absolute", left: 580 - 960, top: 0, width: 1920, height: 1080, opacity: qDim * win(t, T.pair, 99, 0.3, 0.3), transform: "scale(0.86)", transformOrigin: "960px 520px" }}>
          <div style={{ position: "absolute", left: 960, top: 360 }}>
            <Tree id="vand" nodes={vandNodes} grow={vandGrow} gold={vandGold} flakeAt={vandLoss} t={t} />
          </div>
          <div style={{ position: "absolute", left: 960, top: 360, width: 0, height: 0 }}>
            <Portrait src="img/vand.jpg" x={0} y={-112} r={88} o={ramp(t, T.pair, T.pair + 0.4, EO)} />
          </div>
        </div>
      ) : null}
      {/* family names over the pair */}
      {[
        { x: 580, name: "范德比尔特", c: K.ashHi },
        { x: 1340, name: "洛克菲勒", c: K.gold },
      ].map((f) => (
        <div key={f.name} style={{ position: "absolute", left: f.x - 300, width: 600, top: 120, textAlign: "center", fontFamily: SERIF, fontWeight: 900, fontSize: 50, color: f.c,
          opacity: win(t, T.pair + 0.2, T.q + 0.2, 0.35, 0.4), textShadow: SHADOW }}>
          {f.name}
        </div>
      ))}

      {/* captions: one band at the bottom, one line pair at a time */}
      <div style={{ position: "absolute", left: 0, right: 0, top: capY, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Say at={T.rock + 0.25} out={T.vand - 0.1} size={64} parts={["可洛克菲勒家，传到第七代，"]} />
        <Say at={T.rock + 1.2} out={T.vand - 0.1} size={64} parts={["还有约 ", { t: "125 亿", c: K.gold, num: true }, "美元。"]} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: capY, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Say at={T.vand + 0.2} out={T.fall - 0.05} size={64} parts={["比他更早的美国首富范德比尔特，"]} />
        <Say at={T.vand + 1.0} out={T.fall - 0.05} size={64} parts={["留下的家产约合今天 ", { t: "3500 亿", c: K.gold, num: true }, "美元。"]} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: capY, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Say at={T.fall + 0.1} out={T.pair - 0.05} size={64} parts={["到 ", { t: "1947", num: true, c: K.goldHi }, " 年，第五大道上他家的豪宅，"]} />
        <Say at={T.fall + 0.9} out={T.pair - 0.05} size={64} parts={[{ t: "全部拆光。", c: K.fg }]} />
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: capY + 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <Say at={T.pair + 0.15} out={T.q - 0.05} size={64} parts={[{ t: "一家没过几代就散了，", c: K.sub }, { t: "一家传了七代。", c: K.gold }]} />
      </div>

      {/* the question */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <Say at={T.q + 0.1} size={108} serif weight={900} stagger={1.4} parts={["富不过三代，"]} />
        <Say at={T.q + 0.6} size={108} serif weight={900} stagger={1.4} parts={["到底是", { t: "不是真的", mark: true }, "？"]} />
      </div>

      {/* small note: the conversion */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 96 + 716 + 14, textAlign: "center", fontFamily: FONT, fontSize: 24, fontWeight: 500, color: "rgba(244,236,220,0.6)",
        opacity: win(t, T.vand + 1.0, T.fall - 0.05, 0.3, 0.3), textShadow: SHADOW }}>
        按 1877 年遗产占美国 GDP 的比例（约 1/87）换算
      </div>

      <Stamp t={t} />
      {brand ? <BrandMark o={1} /> : null}

      {/* sound */}
      {sound ? <Audio src={staticFile("music.m4a")} startFrom={fr(MUSIC_FROM)} volume={(f) => 0.85 * clamp01((SAMPLE_S - f / FPS) / 1.2)} /> : null}
      <Sequence from={fr(T.stamp)} durationInFrames={fr(1.5)}><Audio src={staticFile("sfx/sfx-impact-16.wav")} volume={0.9} /></Sequence>
      <Sequence from={fr(T.stamp)} durationInFrames={fr(1)}><Audio src={staticFile("sfx/sfx-impact-08.wav")} volume={0.8} /></Sequence>
      <Sequence from={fr(T.rock + 0.3)} durationInFrames={fr(2.5)}><Audio src={staticFile("sfx/sfx-magic-19.wav")} volume={0.35} /></Sequence>
      {[0, 1, 2].map((w) => (
        <Sequence key={w} from={fr(T.fall + 0.2 + w * BEAT * 1.5)} durationInFrames={fr(1.2)}>
          <Audio src={staticFile(w === 2 ? "sfx/sfx-impact-11.wav" : "sfx/sfx-impact-09.wav")} volume={0.75} />
        </Sequence>
      ))}
      <Sequence from={fr(T.pair + 0.75)} durationInFrames={fr(1)}><Audio src={staticFile("sfx/sfx-foley-01.wav")} volume={0.5} /></Sequence>
      <Sequence from={fr(T.q)} durationInFrames={fr(1)}><Audio src={staticFile("sfx/sfx-impact-08.wav")} volume={0.7} /></Sequence>
    </AbsoluteFill>
  );
};
