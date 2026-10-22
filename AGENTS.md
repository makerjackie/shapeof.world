# Shape of the World

世界的形状（shapeof.world）：看见世界如何运行，一起探索有趣的世界。视频和网站是同一条线：数据短片让人看见，网站上能看片、看源码、亲手玩互动世界。开源仓库 `makerjackie/shapeof.world`，代码 AGPL-3.0，项目原创内容 CC BY-NC 4.0（见 `LICENSING.md`）。

## 常用命令

- 开发：`pnpm dev`；单个世界检查：`pnpm world:check --id <world-id>`
- 检查：`pnpm check`
- 部署主站：`pnpm build && npx wrangler deploy`

## 现状

- 主站 Worker `shape-of-the-world`：`shapeof.world`。`new.shapeof.world`、`open.shapeof.world` 301 跳到主站；`v2.shapeof.world` 经服务绑定转发 2026-10-21 之前的旧站（Worker `oneworld`，不再更新，禁止被搜索引擎收录）。`v1.shapeof.world` 是更早的版本，不动。
- 世界：`src/components/experiences/worlds/<id>/`，网址 `shapeof.world/<id>`；目录信息在 `src/data/worlds/catalog/`。
- 统计：埋点写入 Analytics Engine `oneworld_events`（只保留三个月）。`infra/insights`（Worker `oneworld-insights`，insights.shapeof.world）每 10 分钟把原始事件归档进 D1 `shapeof-analytics`。部署：在 `infra/insights` 里 `npx wrangler deploy --config wrangler.jsonc`。
- 视频发布套件：`infra/press`（Worker `shapeof-press`，press.shapeof.world），用法见其 README。
- 短片源码：`films/<片>/`，成片和音频不进 Git，见 `films/README.md`；做片方法见 `films/METHOD.md`。网站上的短片页 `shapeof.world/films/<片>` 由 `src/data/films.json` 和发布套件的 `kit.json` 生成。
- `private/`：作者的私有仓库 `makerjackie/shapeof-world-dev`（章程，部署成 dev.shapeof.world；旧版短片、调研和发布记录），被本仓 `.gitignore` 忽略，是独立的 Git 仓库，在里面单独提交。里面的内容不能写进本仓或公开发布。搜索时它默认被跳过，要找里面的东西就直接指定 `private/` 路径。

## 仅有的几条规矩

- 素材只用自己做的，或允许商用、不用申请授权的第三方素材；第三方素材在旁边写明来源和许可。
- 公开界面保留简体中文和英文。
- 视频结尾的品牌片尾要用片子自己的风格来做：片名变成"世界的形状"，再接 logo、"看见世界如何运行"和 MakerJackie。`public/assets/brand/outro/` 里的成品片尾，只给录屏这类没法自己做片尾的片子用。做视频的规矩见 `films/METHOD.md`。
