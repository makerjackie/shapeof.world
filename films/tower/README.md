# 深圳写字楼空了四分之一，为什么还在盖？（films/tower）

2:52.9、1920×1080、30fps，无旁白。v4（2026-10-23）是 v2 成片之后的重写：开头先问"空着这么多，为什么还要盖？"，再跟着深圳能源大厦找答案。剧本和小节表见 `SCRIPT.md`，发布文案和来源见 `DESCRIPTION.md`，调研见 `research.md`、`research/`。

- 成片：`out/tower-v4.mp4`；封面：`out/covers-v4/cover-16x9.jpg`、`cover-3x4.jpg`。
- v2（`out/tower-v2.mp4`，SVG 地图版）的代码还在：composition `FilmV2`（`src/Film.tsx`、`src/scenes/`、`src/geo/MapView.tsx`）。

## 画面：一个三维的深圳

`src/world/` 是一个 three.js 场景，整部片只有这一个 WebGL 画布，每帧在 layout effect 里同步渲染完，再 `gl.finish()`，Remotion 截图时画面一定是完整的。

- `engine.ts`：城市本体。地面（陆地、海、公园、水面）、道路、车流、地铁、楼、塔、道具（地块、叠层、光柱、人流）都由一个 `WorldState` 决定；`camera.ts` 把旧 SVG 地图的相机参数（中心、像素/米、朝向、倾角）换成透视相机，标注用同一台相机投影。
- `shaders.ts`：楼的立面。窗户按楼层和开间程序化画出，远处按像素大小自动变成平均色，不闪；写字楼按租户整段亮灯，住宅一扇扇亮；空置率、亮灯、高亮、楼高都是每栋楼的状态（浮点贴图）。深圳能源大厦单独画折板立面。
- `src/v4/world.ts`：整部片的相机路线和城市状态，按小节写；`yearAt()` 让楼按真实竣工年份沉下去、再长出来。`src/v4/Film4.tsx` 是字幕、标注、图表和声音。

数据（都是派生的压缩图层，进 Git）：

| 文件 | 内容 | 来源 |
|---|---|---|
| `src/geo/city.json` | 福田 6×6 公里的建筑轮廓、道路、地铁站、深圳能源大厦、CTBUH 150 米以上的楼 | OSM（ODbL）+ CTBUH，`tools/geo-prep.mjs` |
| `src/world/ground.json` | 珠三角陆地、福田公园和水面、全深圳主干道和地铁线（带线路颜色） | OSM，`tools/world3d-prep.mjs` |
| `src/world/nanshan.json` | 南山（后海、科技园、粤海、前海、蛇口）7,831 栋建筑和道路，162 栋配上 CTBUH 高度和年份 | OSM（Geofabrik 广东数据包），`tools/pbf-nanshan.py` → `tools/nanshan-prep.mjs` |

楼高：CTBUH > OSM `height` > `building:levels` × 3.4 > 低矮的画法默认值（只用于画面，不当数据）。全城视角下 CTBUH 的楼高放大 2 倍，屏幕上有说明。

重新生成南山：

```bash
curl -L -o /tmp/guangdong.osm.pbf https://download.geofabrik.de/asia/china/guangdong-latest.osm.pbf   # 约 170 MB
~/.venvs/shapeof-films/bin/python tools/pbf-nanshan.py /tmp/guangdong.osm.pbf /tmp/tower3-ns          # 需要 pip install osmium
node tools/nanshan-prep.mjs /tmp/tower3-ns
```

（`tools/fetch-nanshan.sh` 走 Overpass，公共服务器经常 502 / 超时，所以改用数据包。）

## 声音

- 配乐《千年之后（氛围版）》，和乐府，取自 <https://music.01mvp.com/>，不进 Git：`curl -L -o public/music.m4a https://music.01mvp.com/audio/qian-nian-zhi-hou-bv1xmn36aexp.m4a`。拍点 111.62 BPM、第一拍 0.487 s，片中第 b 小节 = 曲子第 b + 2 小节；片子在片中第 80.2 小节结束，最后约 4 秒淡出。
- 四个音效来自自己的曲库（开关、时钟滴答、风声、木块敲击），不进 Git：`bash tools/fetch-sfx.sh`。

## 渲染

WebGL 要走 GPU（Mac 上 ANGLE → Metal），`remotion.config.ts` 已设 `setChromiumOpenGlRenderer("angle")`；脚本渲染时传 `chromiumOptions: { gl: "angle" }`。

```bash
npm ci
npx remotion render Film out/tower-v4.mp4 --gl=angle --concurrency=4 --crf=20 --audio-bitrate=192k   # M4 上约 3 分钟
COMP=cover-16x9 node tools/lab.mjs /tmp/cov 0      # 封面（cover-3x4 同理），也可以渲任意帧：COMP=Film SCALE=0.5 node tools/lab.mjs out/s 300 900
```
