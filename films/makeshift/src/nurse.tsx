// 护士的一个班 (sb 40–56): one shift as a log. Problems come in a row at a time; the "怎么处理" column fills yellow,
// 自己补上, with the odd green 上报; the log runs past the 19:00 end of shift; the yellow cells lift and the red is
// still underneath. Two lines: the world runs on quiet patches, and stays makeshift because of them.
import React from "react";
import { Box, clamp01, EIO, EO, ramp, Say, useT, win } from "./kit";
import { Note2 } from "./open";
import { Chrome } from "./sheet";
import { FONT, HAN, K, NUM } from "./theme";
import { S } from "./time";

export const NURSE_IN = S(40);
export const NURSE_OUT = S(56);

// Kinds of failure from the study (missing or wrong information, supplies, equipment, waiting); the wording is ours.
const LOG: [string, string, string][] = [
  ["07:12", "药房的药没送上来", "自己跑去药房拿"],
  ["07:40", "床单不够", "从隔壁病区借"],
  ["08:05", "医嘱字迹看不清", "打电话去问"],
  ["08:31", "体温计找不到", "先用别床的"],
  ["09:10", "病历没跟着病人转过来", "自己去找"],
  ["09:48", "输液泵报错", "重启，先凑合用"],
  ["10:20", "找不到负责的医生", "一直打电话"],
  ["11:02", "化验单填错了科室", "手改了再送"],
  ["11:35", "缺一把剪刀", "从护士站拿"],
  ["12:14", "病号饭送错了", "自己去换"],
  ["13:00", "交接单少了一页", "凭记忆补上"],
  ["13:42", "轮椅被借走了", "上报"],
  ["14:20", "检查结果迟迟不回", "催了三次"],
  ["15:05", "敷料规格不对", "两片拼着用"],
  ["15:50", "电话转接到错的科室", "自己跑一趟"],
  ["16:30", "药房发来的药贴错了标签", "上报"],
  ["17:15", "监护仪导线不够长", "挪了床"],
  ["18:02", "新病人没有床位信息", "自己排"],
  ["18:40", "夜班的药还没到", "先垫上"],
  ["19:00", "——下班——", ""],
  ["19:12", "补写今天的记录", "自己补上"],
  ["19:31", "把借来的东西还回去", "自己补上"],
  ["19:45", "交代夜班注意事项", "自己补上"],
];
const RHT = 62;
const TOP = 202;
const SX = 80;
const WS = [150, 560, 420];
const SHEET_W = WS[0] + WS[1] + WS[2] + 60;
const ROW_AT = (i: number) => S(40.3) + i * (i < 12 ? 0.42 : 0.32);
const FILL_AT = (i: number) => S(45.5) + i * 0.09;

export const Nurse: React.FC = () => {
  const t = useT();
  if (t < NURSE_IN - 0.3 || t > NURSE_OUT + 0.3) return null;
  const inK = ramp(t, NURSE_IN - 0.25, NURSE_IN + 0.15, EO);
  const shown = LOG.filter((_, i) => t >= ROW_AT(i)).length;
  const scroll = Math.max(0, shown - 12) * RHT;
  const scrollE = (() => {
    // ease the scroll so rows glide up rather than jump
    const i = shown - 1;
    if (i < 12) return 0;
    const k = ramp(t, ROW_AT(i), ROW_AT(i) + 0.25, EO);
    return scroll - RHT * (1 - k);
  })();
  const peel = ramp(t, S(50.1), S(51.0), EIO);
  const pull = ramp(t, S(52.4), S(53.2), EIO);
  const counter = Math.round(194 * ramp(t, S(43), S(44.6), (x) => x));
  return (
    <div style={{ position: "absolute", inset: 0, opacity: inK * (1 - ramp(t, NURSE_OUT - 0.1, NURSE_OUT + 0.25)) }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${1 - 0.3 * pull}) translate(${pull * 40}px, ${pull * -40}px)`, transformOrigin: "40% 30%" }}>
        <div style={{ position: "absolute", left: SX, top: TOP, width: SHEET_W, height: 1034 - TOP, background: K.paper, overflow: "hidden", boxShadow: "0 0 160px 40px rgba(214,236,222,0.07)" }}>
          <div style={{ position: "absolute", left: 0, top: 0, width: SHEET_W, height: 44, background: K.head, borderBottom: "1px solid #cfd3cd", zIndex: 2, display: "flex", fontFamily: HAN, fontWeight: 800, fontSize: 22, color: K.headText }}>
            <div style={{ width: 60 }} />
            {["时间", "出了什么岔子", "怎么处理"].map((h, i) => (
              <div key={i} style={{ width: WS[i], display: "flex", alignItems: "center", padding: "0 14px", boxSizing: "border-box", borderLeft: "1px solid #d6d9d3" }}>
                {h}
              </div>
            ))}
          </div>
          <div style={{ position: "absolute", left: 0, top: 44 - scrollE, width: SHEET_W }}>
            {LOG.map(([time, what, fix], i) => {
              const k = ramp(t, ROW_AT(i), ROW_AT(i) + 0.2, EO);
              if (k <= 0) return null;
              const off = what.startsWith("——");
              const rep = fix === "上报";
              const f = rep ? ramp(t, FILL_AT(i), FILL_AT(i) + 0.15) : ramp(t, FILL_AT(i), FILL_AT(i) + 0.15);
              const lift = rep ? 0 : peel * clamp01(1 - (i % 7) * 0.08);
              return (
                <div key={i} style={{ position: "absolute", left: 0, top: i * RHT, width: SHEET_W, height: RHT, opacity: k, borderBottom: off ? `3px dashed ${K.err}` : `1px solid ${K.grid}`, display: "flex", fontFamily: FONT, fontSize: 27, color: K.ink }}>
                  <div style={{ width: 60, background: K.head, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: NUM, fontSize: 18, color: K.headText }}>{i + 1}</div>
                  <div style={{ width: WS[0], display: "flex", alignItems: "center", padding: "0 14px", fontFamily: NUM, fontWeight: 600, color: off ? K.err : "#4a514c", borderLeft: `1px solid ${K.grid}` }}>{time}</div>
                  <div style={{ width: WS[1], display: "flex", alignItems: "center", padding: "0 14px", borderLeft: `1px solid ${K.grid}`, color: off ? K.err : K.ink, fontWeight: off ? 800 : 500 }}>{off ? "下班" : what}</div>
                  <div style={{ width: WS[2], position: "relative", borderLeft: `1px solid ${K.grid}`, perspective: 600 }}>
                    {!off && f > 0 ? (
                      <>
                        {/* the problem underneath: still there */}
                        <div style={{ position: "absolute", inset: 2, background: rep ? "transparent" : "rgba(255,77,77,0.85)", display: "flex", alignItems: "center", padding: "0 14px", fontFamily: HAN, fontWeight: 800, fontSize: 24, color: "#fff", opacity: peel }}>{rep ? "" : "明天还会坏"}</div>
                        <div
                          style={{
                            position: "absolute",
                            inset: 2,
                            background: rep ? "rgba(61,220,132,0.9)" : "#ffe266",
                            display: "flex",
                            alignItems: "center",
                            padding: "0 14px",
                            fontFamily: HAN,
                            fontWeight: 700,
                            fontSize: 25,
                            color: rep ? "#08391f" : "#5a4a10",
                            opacity: f,
                            transformOrigin: "50% 0%",
                            transform: `rotateX(${lift * 78}deg) translateY(${-lift * 10}px)`,
                            boxShadow: lift > 0 ? `0 ${10 * lift}px ${16 * lift}px rgba(0,0,0,0.25)` : undefined,
                          }}
                        >
                          {fix}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <Chrome o={(1 - pull) * 1} name="C14" formula={<span>自己补上</span>} file="护士的一个班.xlsx" />
      {/* right-hand column: counter and type */}
      <div style={{ position: "absolute", left: 1420, top: 250, width: 460, opacity: win(t, S(42.9), S(45.4), 0.3, 0.3) }}>
        <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 130, color: K.err, lineHeight: 1 }}>{counter}</div>
        <div style={{ fontFamily: HAN, fontWeight: 700, fontSize: 32, color: K.fg, marginTop: 10 }}>次，239 小时里</div>
      </div>
      <div style={{ position: "absolute", left: 1420, top: 250, width: 460, opacity: win(t, S(45.6), S(50), 0.3, 0.3) }}>
        <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 130, color: "#ffe266", lineHeight: 1 }}>93%</div>
        <div style={{ fontFamily: HAN, fontWeight: 700, fontSize: 32, color: K.fg, marginTop: 10 }}>自己补上</div>
        <div style={{ fontFamily: NUM, fontWeight: 900, fontSize: 64, color: K.ok, marginTop: 30 }}>7%</div>
        <div style={{ fontFamily: HAN, fontWeight: 700, fontSize: 28, color: K.fg }}>去追根源</div>
      </div>
      <Box x={1420} y={640}>
        <Say at={S(40.2)} out={S(42.8)} parts={["可平时那么多洞，"]} size={44} />
        <Say at={S(40.6)} out={S(42.8)} parts={["世界为什么没塌？"]} size={44} />
      </Box>
      <Box x={1420} y={800}>
        <Say at={S(41.3)} out={S(42.8)} parts={["研究者跟着 ", { t: "26", num: true }, " 个护士，"]} size={36} />
        <Say at={S(41.7)} out={S(42.8)} parts={["记录了 ", { t: "239", num: true }, " 个小时。"]} size={36} />
      </Box>
      <Box x={1420} y={620}>
        <Say at={S(43)} out={S(45.4)} parts={["流程出岔子，"]} size={44} />
        <Say at={S(43.6)} out={S(45.4)} parts={["约 ", { t: "74", num: true, c: "#ff6b6b" }, " 分钟一次。"]} size={44} />
      </Box>
      <Box x={1420} y={640}>
        <Say at={S(45.7)} out={S(47.9)} parts={["她们自己想办法补上，"]} size={40} />
        <Say at={S(46.2)} out={S(47.9)} parts={["接着干。"]} size={40} />
      </Box>
      <Box x={1420} y={640}>
        <Say at={S(48.0)} out={S(49.9)} parts={["九成护士下班后，"]} size={40} />
        <Say at={S(48.4)} out={S(49.9)} parts={["平均多留 ", { t: "45", num: true, c: K.tape }, " 分钟，"]} size={40} />
        <Say at={S(48.8)} out={S(49.9)} parts={["没有加班费。"]} size={40} />
      </Box>
      <Box x={1420} y={300}>
        <Say at={S(50.1)} out={S(52.3)} parts={["补上了，病人没事。"]} size={42} />
        <Say at={S(50.8)} out={S(52.3)} parts={["可没人往上报，"]} size={42} />
        <Say at={S(51.2)} out={S(52.3)} parts={[{ t: "明天它还会坏", c: "#ff6b6b" }, "。"]} size={42} />
      </Box>
      <Box x={1230} y={300}>
        <Say at={S(53.1)} out={S(55.9)} parts={["世界能转下去，"]} size={50} />
        <Say at={S(53.5)} out={S(55.9)} parts={["靠的是", { t: "悄悄补上", c: "#ffe266" }, "。"]} size={50} />
      </Box>
      <Box x={1230} y={560}>
        <Say at={S(54.4)} out={S(55.9)} parts={["它一直是草台班子，"]} size={50} />
        <Say at={S(54.8)} out={S(55.9)} parts={["也是因为", { t: "悄悄补上", c: "#ffe266" }, "。"]} size={50} />
      </Box>
      <Note2 at={S(41.3)} out={S(52.3)}>Tucker & Edmondson, California Management Review 2003：美国 9 家医院、26 名护士、239 小时观察，194 次流程故障，93% 当场自行处理；全程跟班的 10 名护士里 9 名下班后平均多留 45 分钟。表中事件为示意。</Note2>
    </div>
  );
};
