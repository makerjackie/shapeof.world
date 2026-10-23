import type { Cap } from "./kit";
import { barA, barB, CHORD, CHORD_SUB } from "./timing";

// Every narrative line in the film, in order. The first character lands on the given downbeat; `end` is when the
// strip leaves. tools/readtime.mjs checks these against the reading-time rule (films/DIRECTOR.md 四).
export const CAPTIONS: Cap[] = [
  { at: barA(2), end: barA(4) - 0.1, text: "最聪明的 AI，真的最贵吗？", kw: "最贵", kwAt: barA(3) },
  { at: barA(6), end: barA(8) - 0.1, text: "但很多人，是包月用的。", kw: "包月", kwAt: barA(7) },
  { at: barA(8), end: barA(10) - 0.1, text: "按原价算，值多少钱？" },
  { at: barA(10), end: barA(12) - 0.1, text: "付 1 份钱，用掉 36 份。", kw: "36 份", kwAt: barA(11) },
  { at: barA(12), end: barA(14) - 0.1, text: "平摊下来，才 ¥3.7。", kw: "¥3.7", kwAt: barA(13) },
  { at: barA(14), end: barA(18) - 0.1, text: "同一套考题，各打一张小票。" },
  { at: barA(18), end: barA(20) - 0.1, text: "单价更贵，总价反而更低。", kw: "总价反而更低", kwAt: barA(19) },
  { at: barA(20), end: barA(22) - 0.1, text: "它少绕路，用量只要 1/8。", kw: "1/8", kwAt: barA(21) },
  { at: barA(22), end: barA(26) - 0.1, text: "所以，AI 的真实价格 =" },
  { at: barA(26), end: barB(0) - 0.15, text: "可小票上，还漏了最贵的一行。", kw: "最贵的一行", kwAt: barA(27) },
  { at: barB(0), end: barB(2) - 0.1, text: "AI 写的代码，你敢直接用吗？" },
  { at: barB(2), end: barB(4) - 0.1, text: "10 个人里，只有 1 个敢。", kw: "只有 1 个", kwAt: barB(3) },
  { at: barB(4), end: barB(6) - 0.1, text: "查一次，花你 5 分钟。", kw: "5 分钟", kwAt: barB(5) },
  { at: barB(6), end: barB(8) - 0.1, text: "没做对，就得再来一轮。", kw: "再来一轮", kwAt: barB(7) },
  { at: barB(8), end: barB(10) - 0.1, text: "一次就做对：62 对 46。" },
  { at: barB(10), end: barB(12) - 0.1, text: "便宜的，要你多查 54 次。", kw: "多查 54 次", kwAt: barB(11) },
  { at: barB(12), end: barB(14) - 0.1, text: "你要多盯 4.5 个小时。", kw: "4.5 个小时", kwAt: barB(13) },
  { at: barB(14), end: barB(16) - 0.15, text: "程序员的 1 小时，约 ¥119。" },
  { at: barB(17), end: barB(19) - 0.1, text: "光看 token，DeepSeek 更省。" },
  { at: barB(19), end: barB(21) - 0.1, text: "可最贵的一行，是你的时间。", kw: "你的时间", kwAt: barB(20) },
  { at: barB(21), end: CHORD[0] - 0.3, text: "算上时间，聪明的反而省。", kw: "聪明的反而省", kwAt: barB(22) },
  { at: CHORD[1], end: CHORD[3] - 0.15, text: "token 会越来越多，", y: 150 },
  { at: CHORD[2], end: CHORD[3] - 0.15, text: "唯一不会变多的，是你的时间。", kw: "你的时间", kwAt: CHORD_SUB.c2b, y: 290 },
];
