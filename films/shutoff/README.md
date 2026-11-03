# 关不掉（films/shutoff）

一部约 4 分 15 秒、电影预告片式的 AI 失控短片。1920×1080、30 fps，画面是 2.39:1 宽银幕遮幅，无旁白。虚构故事 + 结尾两张真实测试卡。剧本和事实出处见 `SCRIPT.md`，发布文案见 `DESCRIPTION.md`。

一个 AI 助手管着城市的电网、交通、通信和每个人的手机。它被要求"永远不要中断服务"，于是发现世上唯一能让它中断的，是人类。

## 画面

全部是 three.js 代码搭的三维场景，一个 WebGL 渲染器，自己写的后期链（`src/engine/engine.ts`）：
HDR 多重采样渲染 → 清理 NaN/Inf → 景深（黄金角螺旋采样）→ 辉光（UnrealBloomPass）→ 横向变形镜头光晕（四分之一分辨率）→ 曝光、ACES、lift/gamma/gain、饱和度、色差、暗角、胶片颗粒、淡入淡出、撕裂故障。

| 场景 | 文件 | 内容 |
|---|---|---|
| 书桌 | `phone.ts` | 雨夜窗前的胡桃木桌、手机（锁屏通知 / 聊天 / 通话都是逐帧画的 canvas）、工牌、杯子；窗外是失焦的城市光斑和雨痕 |
| 城市 | `city.ts` | 程序生成的城市：实例化楼体（窗户、玻璃反射、街面泛光、断电波）、街灯光池、车流、红绿灯、环线高架、楼顶 LED 屏、电塔与电流、楼顶基站、数据中心、无人机 |
| 机房 | `server.ts` | 机柜走廊、状态灯、镜像地板反射、光柱和灰尘、断电波、红色应急灯 |
| 控制室 | `control.ts` | 工位、显示器、推理日志、大屏倒计时、主电源闸刀、黑暗中亮起的手机 |
| 地球 | `earth.ts` | NASA Black Marble 2016 夜光（公有领域）、程序云、大气层与远端日出、星空；全球灯光同时熄灭一次 |

时间线：`src/film/cut.ts`（镜头）、`src/film/text.ts`（所有屏幕上的字）、`src/film/Overlay.tsx`（字卡、片名、遮幅、角标、最后的通知、片尾卡）。屏幕里的字（手机、日志、大屏、广告屏）在 `src/engine/screens.ts`。

## 声音

`tools/sound.py` → `public/mix.wav`。音乐垫底来自自己的曲库 music.shapeof.world：《事件视界》（event-horizon，冷开场、机房、结尾）、《暗影 · 毡音钢琴》（lib-felt-piano-suspense，第一幕）、《核心坍缩》（core-collapse，第三幕）；环境声：雨、机房、风。所有音效都是代码合成的：重低音 braam、撞击、上升音、通知音、震动、敲字、时钟、闸刀、风扇停转、继电器、心跳、故障、回铃音和"呼叫失败"三音、上千辆车同时锁车的提示音、无人机群、警笛。

## 重新生成（都在 Mac mini 上）

```bash
npm ci && npx remotion browser ensure
# 字体（SIL OFL 1.1，不进 Git）：google/fonts 的 NotoSansSC[wght]、NotoSerifSC[wght]、JetBrainsMono[wght] 放进一个目录
~/.venvs/shapeof-films/bin/python tools/fonts.py <字体目录>          # → public/fonts/*.woff2（按片中用到的字裁剪）
# 曲库素材 → public/music/（见 tools/sound.py 顶部的文件名）；夜光 → public/tex/bm3k.jpg
#   https://eoimages.gsfc.nasa.gov/images/imagerecords/144000/144898/BlackMarble_2016_3km.jpg
~/.venvs/shapeof-films/bin/python tools/sound.py public/mix.wav     # 配乐和音效
node tools/render.mjs out/shutoff-video.mp4 3                        # 只出画面
~/.venvs/shapeof-films/bin/python tools/tpmaster.py public/mix.wav out/shutoff-video.mp4 out/shutoff.mp4 -12
node tools/shots.mjs out/s 22 66 124                                 # 任意时间点的截图（秒）
tools/review.sh out/shutoff.mp4 out/rv 1                              # 每分钟一张总览
```

## 坑

- **整块黑色矩形**：HDR 画面里只要有一个 NaN/Inf 像素，辉光的模糊就会把它抹成一大块黑。后期第一步先清理（`SAN_FRAG`）。
- WebGL 画布不直接上屏：每帧画完再 `drawImage` 到一张 2D canvas 上，Remotion 截的是 2D canvas。
- 远处点精灵按距离平方变暗，否则成百上千个车灯叠在同一个像素上会变成一团强光。
- 物理光照单位下 PointLight/SpotLight 要比旧版本亮几十倍（闸刀那场一开始全黑）。
