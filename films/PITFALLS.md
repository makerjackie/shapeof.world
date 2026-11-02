# 渲染的坑

只记查起来费劲、AI 不容易自己想到的。做片的规矩见 [`DIRECTOR.md`](DIRECTOR.md)。

- **长片个别帧的字变乱码或残影，看着像在闪。** Chrome 用 GPU 栅格化网页时偶发出错，短片段复现不出来。用 `--disable-gpu-rasterization` 启动 Chrome（WebGL 照样走 GPU，做法见《高层》的 `tools/chrome.sh`）；定稿前整片渲两遍，逐帧比对。
- **AAC 编码会抬高真峰值**，ffmpeg 自带的 `aac` 能冲过 2.7 dB。母带从原始 WAV 做，用 Apple 的 `aac_at` 编码（`films/ai-impact/tools/tpmaster.py`）。
- **渲染排队**：一台 Mac 最多同时跑两个 `remotion render`，开渲前先 `pgrep -fl "remotion render"`。
- **WebGL**：headless Chrome 加 `--use-angle=metal`，否则慢好几倍；截图前 three.js 要同步渲染完再 `gl.finish()`，否则偶尔截到半帧（`films/tower/src/world/engine.ts`）。
- **两台机器之间，改过的文件要确认同步了再渲。** 开渲前对一遍两边源文件的 md5。
- **多标签页渲染时，图表上的 CSS `filter` 会逐帧漂移**，别用。
- **three.js 按 `onBeforeCompile` 的函数源码缓存着色器。** 几个材质共用一个函数、只是闭包里的参数不同（比如麦秆和麦穗的颜色），会悄悄共用第一个编译出来的着色器。每个材质设一个 `customProgramCacheKey`（《现代战争》`src/e3/engine.ts`）。
- **画面里随机出现整块黑色矩形（同一帧每次都一样）。** HDR 渲染目标里只要有一个 NaN/Inf 像素，UnrealBloomPass 的多级模糊就会把它抹成一大块，色调映射后变黑。后期第一步先清理：`isnan/isinf` 置零、`clamp` 到几百（《关不掉》`films/shutoff/src/engine/engine.ts` 的 `SAN_FRAG`）。关 MSAA、加 `gl.finish` 都没用。
