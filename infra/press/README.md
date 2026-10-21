# 发布套件（press.shapeof.world）

每支定稿视频一个发布套件：上传用的视频文件、候选标题、简介和封面，按定稿日期从新到旧排。作者在页面上选标题、简介和封面，选择会保存，换设备也在。

整站公开、不设密码（作者 2026-10-20 决定），只用 `noindex` 和 `robots.txt` 挡住搜索引擎。任何打开页面的人都能改选择，所以保存只接受本站页面发出的请求，并按 IP 限速（每分钟 30 次）。

独立的 Cloudflare Worker `shapeof-press`，和主站无关。页面由 `scripts/build.mjs` 从 `kits/` 生成到 `dist/`（不进 Git），视频和封面放 R2，作者的选择放 KV。

大图和视频只放 R2，不进 Git（作者 2026-10-20 的规矩）。仓库里每个套件只有一个 `kit.json`。

## 新增套件

1. 建 `kits/<定稿日期>-<slug>/kit.json`，字段照现有套件抄。
2. 上传用视频放 R2 桶 `shapeof-press`，键名写进 `kit.json` 的 `video.key`（在仓库根目录运行）：

   ```bash
   pnpm exec wrangler r2 object put shapeof-press/<key> --file <mp4> --content-type video/mp4 --remote
   ```

   页面通过 `/media/<key>` 播放和下载，支持拖动。换视频时用新键名，再删掉旧对象。
3. 封面也放 R2，目录写进 `kit.json` 的 `coversKey`（如 `ai-shape/2026-10-20/covers`），文件名 `cover-<套>-4x3.jpg|webp` 和 `cover-<套>-16x9.jpg|webp`，`.jpg` 用 `--content-type image/jpeg`，`.webp` 用 `image/webp`。只做横版：4:3 给 B站、抖音、视频号，16:9 给 YouTube。

## 读取作者的选择

存在 KV `PRESS_PICKS` 的 `press-picks:v1`（在仓库根目录运行）：

```bash
pnpm exec wrangler kv key get --config infra/press/wrangler.jsonc --binding PRESS_PICKS press-picks:v1 --remote --text
```

## 命令

```bash
pnpm --dir infra/press test             # 单元测试
pnpm --dir infra/press build            # 生成 dist/
pnpm --dir infra/press deploy:dry-run   # 检查配置
pnpm --dir infra/press deploy           # 生成、测试、部署
```

本地预览：先 `pnpm --dir infra/press build`，再在仓库根目录运行

```bash
pnpm exec wrangler dev --config infra/press/wrangler.jsonc
```

本地预览用的是本地模拟的 KV 和 R2，看不到线上的视频和选择。
