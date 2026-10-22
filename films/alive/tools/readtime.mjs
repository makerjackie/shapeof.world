// Reading-time audit (films/METHOD.md, STYLE.md 三、3). Rule from films/house/tools/reading.mjs: big lines (≥ 56 px)
// 0.6 s + 0.15 s per character, context lines (40–55 px) 0.5 s + 0.12 s, never under 1.2 s; smaller notes only
// need to be seen. Each row is a line as placed in src/scenes: [scene start bar, appears at beat, leaves at beat
// (scene-local; default = scene end), size px, text]. Keep this table in step with the scenes.
import { need } from "../../house/tools/reading.mjs";

const BAR = (4 * 60) / 111.62; // 千年之后, 111.62 BPM
const L = [
  [0, -1, 8, 104, "活着是主线，其他都是支线。"],
  [2, 8.8, 13, 92, "79 岁 ≈ 4,100 周"],
  [5, 2.6, 7, 56, "30 岁这一年 = 52 周"],
  [5, 7, 12, 40, "一周 = 7 天 × 24 小时 = 168 小时"],
  [5, 7.5, 12, 84, "这 4100 个星期，都去哪了？"],
  [8, 0, 8, 170, "活着是主线"],
  [10, 0, 15.6, 64, "把平均的一天，摊到一生："],
  [10, 16, 28, 64, "醒着的时间里，一半多给了“要做的事”。"],
  [10, 17, 28, 110, "53% 要做的事"],
  [17, 0, 9, 60, "上学、工作、赚钱、买房、升职——"],
  [17, 3, 9, 76, "这些，是支线。"],
  [17, 9.5, 16, 80, "中间这条，是主线：活着。"],
  [21, 0, 12, 72, "对工作提不起劲？"],
  [21, 1.5, 12, 40, "全世界的员工里，真正投入工作的，只有五分之一。"],
  [21, 8, 12, 72, "你不是一个人。"],
  [24, 0, 16, 68, "把喜欢的事，变成“应该”，"],
  [24, 9, 16, 68, "兴趣可能会变淡。"],
  [28, 0, 16, 68, "真感兴趣的时候，"],
  [28, 2.5, 16, 68, "不用催，"],
  [28, 4, 16, 68, "自己就走远了。"],
  [32, 0, 12, 72, "有些事，不喜欢也得做。"],
  [32, 6.5, 12, 72, "没关系，那是支线。"],
  [35, 0, 9, 72, "别把支线，当成活着的意义。"],
  [35, 10, 20, 72, "支线会断，"],
  [35, 12.5, 20, 84, "主线一直在。"],
  [40, 0, 20, 64, "1938 年起，哈佛跟踪了两组人的一生："],
  [40, 9, 20, 40, "跟到老，最能预示他们健康、快乐的——"],
  [40, 10.5, 20, 96, "是关系，不是成就。"],
  [45, 0, 12, 76, "关系更紧密的人，"],
  [45, 1.5, 12, 76, "存活几率高 50%。"],
  [48, 1, 12, 110, "活着本身，就够了。"],
  [51, 0, 7, 64, "过去的格子，不用涂黑。"],
  [51, 7.5, 16, 64, "剩下的，留给你自己选颜色。"],
  [55, 0, 12, 80, "用自己的方式，过完一生，"],
  [55, 3, 12, 124, "活着便是成功。"],
  [58, 0, 8, 104, "活着是主线，其他都是支线。"],
];

let bad = 0;
for (const [bar, at, until, size, text] of L) {
  const have = ((until - Math.max(at, 0)) * BAR) / 4;
  const want = need(text, size);
  const ok = have + 1e-6 >= want;
  if (!ok) bad++;
  console.log(`${ok ? "ok " : "LOW"} bar ${String(bar).padStart(2)} +${String(at).padEnd(4)} ${have.toFixed(2)}s / ${want.toFixed(2)}s  ${size}px  ${text}`);
}
console.log(bad ? `${bad} line(s) too short` : "all lines have enough time");
process.exit(bad ? 1 : 0);
