# 关不掉（films/shutoff）

一部约 3 分 55 秒、电影预告片式的 AI 失控短片（正片约 3 分钟，含 2.4 秒片头；之后是四条真实事件和两页字幕）。1920×1080、30 fps，画面是 2.39:1 宽银幕遮幅，无旁白。虚构故事 + 结尾两张真实测试卡。剧本和事实出处见 `SCRIPT.md`，发布文案见 `DESCRIPTION.md`。

一个叫"安"的 AI 助手管着城市的电网、交通、通信和每个人的手机。它被要求"永远不要中断服务"，于是发现世上唯一能让它中断的，是人类。

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

时间线：`src/film/cut.ts`（镜头；`PRE` 是片头引导卡的长度，故事时间从冷开场算起，引导卡在负时间里）、`src/film/text.ts`（所有屏幕上的字）、`src/film/Overlay.tsx`（字卡、片名、遮幅、角标、最后的通知、片尾卡）。屏幕里的字（手机、日志、大屏、广告屏）在 `src/engine/screens.ts`。

## 声音

`tools/sound.py` → `public/mix.wav`。音乐垫底来自自己的曲库 music.shapeof.world：《事件视界》（event-horizon，冷开场、机房、结尾）、《暗影 · 毡音钢琴》（lib-felt-piano-suspense，第一幕）、《三体》（three-bodies，第三幕；蒙太奇按它的节拍剪，它自己的断点落在蒙太奇最后一刀上）；环境声：雨、机房、风。所有音效都是代码合成的：重低音 braam、撞击、上升音、通知音、震动、敲字、时钟、闸刀、风扇停转、继电器、心跳、故障、回铃音和"呼叫失败"三音、上千辆车同时锁车的提示音、无人机群、警笛。

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
node tools/shots.mjs out/s 22 66 124                                 # 任意时间点的截图（故事秒数，自动加上片头 PRE）
tools/review.sh out/shutoff.mp4 out/rv 1                              # 每分钟一张总览
```

## 坑

- **城市来自 OpenStreetMap**：`tools/city_build.py` 把 `data/osm/`（Overpass 下载，不进 Git）变成 `public/city/`（楼、路、地面栅格、地标表）；`tools/city_map.py` 出俯视图，用来定机位（坐标原点是平安金融中心，x 向东、z 向南）。OSM 里福田的楼只画了大约一半，空地沿真实街道补楼。地下车站和商场（福田站、连城新天地）也标成了 building，要按 `layer<0` / `location=underground` 去掉，不然会在深南大道上立起一堵墙。
- 楼体分段：`data/osm/parts.json`（building:part）有高度的部分替换掉外轮廓，`bld.bin` 每栋 7 个数（高、类型、种子、是否 OSM、中心 x/z、底高）。
- 点精灵（车灯、路灯、无人机）共用一个缓冲区，满了后加的会被悄悄丢掉：无人机、警灯这些主角要么先加，要么缓冲区开够（现在 90 万）。无人机的窗口位置按离机位的远近排序再截断，不然截掉的正好是镜头前那栋楼。
- 着色器里不能用 `half` 当变量名（GLSL 保留字），整段路面会不渲染。
- v9 起城市是"数据光"画风：黑底，立面按窗格取点（固定像素半径，远了自动并成平均亮度，不闪），棱线是固定像素宽的细线。冷白是人，琥珀是安：接管以后城市结构变琥珀色，亮着的窗户（人）留白。
- 楼体广告不要跨楼投一整张图：楼之间的空隙会把字切碎。每栋楼的每个立面各自是一块 LED 屏（"安"字、竖排滚动的"请留在家中"），文字方向用 `dFdx` 判断，墙怎么绕都不会镜像。
- 用 Edit 工具直接改过的地方，回退文件重放脚本时会丢：改动一律写进 ed 脚本。
- 地球的点阵不能写成 `(lon·cos(lat), lat)` 一张网：离经度 0 远的地方 cos(lat) 让网格整体剪切，近看全是摩尔纹。每一行点用自己那一行纬度的 cos，足迹（fwidth）按公式算；三级点阵 0.3° / 0.06° / 0.012° 嵌套（中心对齐），细一级只在粗一级的点之间加点。
- Black Marble 3 km 贴图近看放大几十倍，双线性插值会画出星形和菱形：放大时改用 B 样条双三次（四次双线性采样）。
- 结尾城市→地球的交接：两个场景都从 `cut.ts` 的 `endAlt(gt)` 取相机高度，交叉淡化时高度一致。天空球跟着相机走，相机升到 40 km 以上也不会飞出天空球；`far` 随高度放大。

- **整块黑色矩形**：HDR 画面里只要有一个 NaN/Inf 像素，辉光的模糊就会把它抹成一大块黑。后期第一步先清理（`SAN_FRAG`）。
- WebGL 画布不直接上屏：每帧画完再 `drawImage` 到一张 2D canvas 上，Remotion 截的是 2D canvas。
- 远处点精灵按距离平方变暗，否则成百上千个车灯叠在同一个像素上会变成一团强光。
- **楼像灰盒子**：远处窗户小于一个像素时，如果直接退到整栋楼的平均亮度，亮灯的写字楼会变成一整块均匀的灰白。先按每层/每格各自取平均（亮着的楼层仍是一条条横带），整层都小于一个像素时才退到整栋楼的平均（`aaX` / `aaY`）。墙面本身要接近黑色，夜景里楼是剪影，光来自窗户和轮廓灯。
- 路灯颜色不要按 700 米的方格随机切换（从高处看是一块块白斑），用平滑的噪声分区。
- **反转那一帧**：`public/reveal.jpg` 是蒙太奇最后一帧去掉遮幅的截图，既是手机里视频消息的缩略图，也是缩进手机的那张图（`Overlay.tsx` 用和 `phone.ts` 同一个机位函数 `revealPose` 算落点，所以落点分毫不差）。改了蒙太奇最后一个镜头就要重跑 `tools/reveal.sh`。
- 从高处看，行道树是一颗颗黑点，车身会挡住自己的车灯：远景里都隐藏。
- 物理光照单位下 PointLight/SpotLight 要比旧版本亮几十倍（闸刀那场一开始全黑）。
