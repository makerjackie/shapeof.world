// Reading-time audit (films/METHOD.md, STYLE.md 三、3). Rule from films/house/tools/reading.mjs: big lines (≥ 56 px)
// 0.6 s + 0.15 s per character, context lines (40–55 px) 0.5 s + 0.12 s, never under 1.2 s; smaller notes only
// need to be seen. Each row is a line as placed in src/scenes: [scene start bar, appears at beat, leaves at beat
// (scene-local; default = scene end), size px, text]. Keep this table in step with the scenes.
import { need } from "../../house/tools/reading.mjs";

const BAR = 2.5; // 96 BPM
const L = [
  [0, -1, 8, 104, "活着是主线，其他都是支线。"],
  [2, 0, 8, 48, "人这一生，大约"],
  [2, 0.5, 8, 72, "4100 个星期"],
  [4, 0, 8, 84, "这些格子，都去哪了？"],
  [4, 3.5, 8, 84, "又该怎么过？"],
  [6, 0, 8, 170, "活着是主线"],
  [8, 0, 12, 76, "醒着的时间里，"],
  [8, 1.5, 12, 76, "一半多给了“要做的事”。"],
  [8, 8, 12, 190, "53%"],
  [11, 0, 12, 68, "上学、工作、赚钱——"],
  [11, 2.5, 12, 76, "这些是支线。"],
  [11, 6, 12, 68, "中间这条，"],
  [11, 7.5, 12, 76, "是主线：活着。"],
  [14, 0, 12, 76, "对工作提不起劲？"],
  [14, 1.5, 12, 44, "全世界的员工里，真正投入的只有"],
  [14, 2.7, 12, 190, "20%"],
  [14, 6, 12, 44, "东亚：18%"],
  [14, 8, 12, 84, "你不是一个人。"],
  [17, 0, 12, 76, "把喜欢的事，变成“应该”，"],
  [17, 5.5, 12, 76, "兴趣可能会变淡。"],
  [20, 0, 12, 76, "真感兴趣的时候，"],
  [20, 3, 12, 76, "不用催，"],
  [20, 4.5, 12, 76, "自己就走远了。"],
  [23, 0, 8, 84, "有些事，不喜欢也得做。"],
  [23, 1.8, 8, 44, "房租 家人 生计"],
  [23, 4.5, 8, 84, "没关系，那是支线。"],
  [25, 0, 12, 76, "别把支线，"],
  [25, 1.2, 12, 76, "当成活着的意义。"],
  [25, 5.5, 12, 76, "支线会断，"],
  [25, 7.5, 12, 76, "主线一直在。"],
  [28, 0, 16, 68, "哈佛从 1938 年起，"],
  [28, 1.5, 16, 68, "跟踪了 724 个人的一生。"],
  [28, 4.5, 16, 44, "跟到老，最能预示他们健康、快乐的——"],
  [28, 8, 16, 100, "是关系，不是成就。"],
  [32, 0, 8, 76, "关系更紧密的人，"],
  [32, 1.5, 8, 76, "存活几率高 50%"],
  [34, 0, 12, 40, "我们的看法："],
  [34, 1, 12, 110, "活着本身，"],
  [34, 3, 12, 110, "就够了。"],
  [37, 0, 6.5, 72, "过去的格子，不用涂黑。"],
  [37, 7, 16, 72, "剩下的，留给你自己选颜色。"],
  [41, 0, 12, 84, "用自己的方式，过完一生，"],
  [41, 3, 12, 128, "活着便是成功。"],
  [44, 0, 8, 104, "活着是主线，其他都是支线。"],
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
