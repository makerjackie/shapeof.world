// Fast cut. 120 BPM, cuts on half-beats. 53 s.
export const TIMELINE = {
  fps: 60,
  width: 1920,
  height: 1080,
  total: 53,
  scenes: [
    { id: "hook",    start: 0,    end: 5.5,  title: "又开源了" },
    { id: "split",   start: 5.5,  end: 11,   title: "模型与引擎" },
    { id: "war",     start: 11,   end: 17.5, title: "调度战争" },
    { id: "open",    start: 17.5, end: 23,   title: "开源" },
    { id: "recipe",  start: 23,   end: 25.5, title: "翻译器" },
    { id: "cost",    start: 25.5, end: 30,   title: "成本" },
    { id: "control", start: 30,   end: 34,   title: "控制权" },
    { id: "chips",   start: 34,   end: 37.5, title: "选择权" },
    { id: "limits",  start: 37.5, end: 44,   title: "边界" },
    { id: "close",   start: 44,   end: 49,   title: "用得起" },
    { id: "outro",   start: 49,   end: 53,   title: "" },
  ],
};
