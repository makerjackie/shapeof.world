// Hand-timed for a silent, text-first cut. 120 BPM = 0.5 s per beat.
export const TIMELINE = {
  fps: 60,
  width: 1920,
  height: 1080,
  total: 116,
  scenes: [
    { id: "hook",    start: 0,   end: 8,   title: "又开源了" },
    { id: "what",    start: 8,   end: 19,  title: "模型与引擎" },
    { id: "war",     start: 19,  end: 32,  title: "调度战争" },
    { id: "open",    start: 32,  end: 43,  title: "开源" },
    { id: "recipe",  start: 43,  end: 52,  title: "翻译器" },
    { id: "inside",  start: 52,  end: 64,  title: "引擎里" },
    { id: "cost",    start: 64,  end: 75,  title: "成本" },
    { id: "control", start: 75,  end: 84,  title: "控制权" },
    { id: "chips",   start: 84,  end: 92,  title: "选择权" },
    { id: "limits",  start: 92,  end: 104, title: "边界" },
    { id: "close",   start: 104, end: 112, title: "用得起" },
    { id: "outro",   start: 112, end: 116, title: "" },
  ],
};
