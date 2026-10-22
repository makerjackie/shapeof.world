# 雨水雕山 · 出处

这个世界里没有第三方素材：地形、颜色、雨和界面都由本目录的代码实时生成。
2026-10 之前这里是一套 10 章的地貌课件（作者提供的 GPT 原型，MIT 许可），这次整体重写，旧代码没有保留。

## 模型

- 河流功率模型 ∂h/∂t = U − K·A^m·S^n，取 m = 0.5、n = 1；山脉高度存在上限、抬升与侵蚀趋于平衡：
  Whipple, K. X. & Tucker, G. E. (1999). Dynamics of the stream-power river incision model. *JGR Solid Earth* 104(B8). https://doi.org/10.1029/1999JB900120
- 隐式 O(n) 解法（从出海口往上游逐点求解）：
  Braun, J. & Willett, S. D. (2013). A very efficient O(n), implicit and parallel method to solve the stream power equation. *Geomorphology* 180–181. https://doi.org/10.1016/j.geomorph.2012.10.008
- 洼地填平与流向排序（priority-flood）：
  Barnes, R., Lehman, C. & Mulla, D. (2014). Priority-flood. *Computers & Geosciences* 62. https://doi.org/10.1016/j.cageo.2013.04.024
- 抬升速率的量级（台湾中央山脉每年几毫米，抬升和侵蚀同样快）：
  Dadson, S. J. et al. (2003). Links between erosion, runoff variability and seismicity in the Taiwan orogen. *Nature* 426. https://doi.org/10.1038/nature02150

## 参数（`landscape-model.ts`）

| 量 | 取值 | 说明 |
|---|---|---|
| 格子 | 112 × 112，每格 400 m | 地块约 45 km 见方 |
| 手下的抬升 | 4 mm/年 | 与活跃造山带同一量级 |
| 区域抬升 | 0.15 mm/年 | 让低地不至于被冲到海平面 |
| K（可蚀性） | 5 × 10⁻⁶ /年 | 文献常见范围内，挑了让 1–2 百万年内达到平衡的值 |
| 硬岩 | K 的 0.12 倍 | |
| D（坡面扩散） | 0.02 m²/年 | |
| 时间比例 | 1 秒 = 20 万年 | |

## 换算用的数字

- 泰山主峰玉皇顶海拔 1,545 米（新华社等普遍采用的数值）。
- 北京市面积 16,410.54 平方千米（北京统计年鉴）：https://nj.tjj.beijing.gov.cn/nj/main/2006_ch/e/content/V4_03-04.htm
- 人类有文字的历史约 5,000 年。
