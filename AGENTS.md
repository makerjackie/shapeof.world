# Shape of the World

世界的形状（shapeof.world）：看见世界如何运行，一起探索有趣的世界。视频和网站是同一条线：数据短片让人看见，网站上能看片、看源码、亲手玩互动世界。开源仓库 `makerjackie/shapeof.world`，代码 AGPL-3.0，项目原创内容 CC BY-NC 4.0（见 `LICENSING.md`）。

## 常用命令

- 开发：`pnpm dev`；单个世界检查：`pnpm world:check --id <world-id>`
- 检查：`pnpm check`
- 部署主站：`pnpm build && npx wrangler deploy`。用环境变量 `CLOUDFLARE_API_TOKEN` 和 `CLOUDFLARE_ACCOUNT_ID`，不要让作者跑 `wrangler login`。
- 把工作区分支合进 main：`pnpm land`（见下）。

## 现状

- 主站 Worker `shape-of-the-world`：`shapeof.world`。`new.shapeof.world`、`open.shapeof.world` 301 跳到主站；`v2.shapeof.world` 经服务绑定转发 2026-10-21 之前的旧站（Worker `oneworld`，不再更新，禁止被搜索引擎收录）。`v1.shapeof.world` 是更早的版本，不动。
- 世界：`src/components/experiences/worlds/<id>/`，网址 `shapeof.world/<id>`；目录信息在 `src/data/worlds/catalog/`。
- 统计：埋点写入 Analytics Engine `oneworld_events`（只保留三个月）。`infra/insights`（Worker `oneworld-insights`，insights.shapeof.world）每 10 分钟把原始事件归档进 D1 `shapeof-analytics`。部署：在 `infra/insights` 里 `npx wrangler deploy --config wrangler.jsonc`。
- 视频发布套件：`infra/press`（Worker `shapeof-press`，press.shapeof.world），用法见其 README。
- 影片制作在独立私有仓库 `makerjackie/shapeof-world-films`。短片页 `shapeof.world/films/<片>` 由 `src/data/films.json` 和发布套件的 `kit.json` 生成。
- `private/`：本仓里的本地私有文件夹，被 `.gitignore` 忽略，不进 Git，也不是单独的仓库。选题规划、内部笔记、发布记录这类不公开的内容放这里，不能写进本仓的其他地方或公开发布。搜索时它默认被跳过，要找里面的东西就直接指定 `private/` 路径。三台电脑的 `private/` 不经过 GitHub，在 MacBook 上运行 `private/sync.sh` 双向同步。（以前这里是私有仓库 `makerjackie/shapeof-world-dev`，已不再使用。）

## 多个会话一起干活

- 三台电脑都在干活，靠 GitHub 上的 main 同步：MacBook 和 M1 Mac mini 的主目录都是 `~/code/makerjackie/shapeof.world`，M4 Mac mini 是 `/Volumes/DevSSD/Projects/code/shapeof.world`。
- 改代码的会话在自己的工作区里做（`.claude/worktrees/<名字>`，分支 `claude/<名字>`）。做完提交，再运行 `pnpm land`：它先拉下另一台电脑推上来的提交，把分支变基到最新的 main、跑 `pnpm check`，通过后把 main 快进过去并推到 GitHub。不用等作者去合并分支。
- `pnpm land` 停在冲突上时，自己解决冲突（变基冲突就 `git rebase --continue`，合并冲突就 `git commit`），再跑一次。快进或推送被拒（别人先合了）就直接再跑一次。只改文档时可以加 `--skip-check`。
- 直接在主目录（main）上干活的会话，只提交自己改的文件：`git add <路径>`，不要 `git add -A` 或 `git commit -a`，因为别的会话可能正在同一个目录里写东西。提交后 `git pull --no-rebase origin main && git push origin main`，不要变基或 stash 主目录。
- 不要停掉、重启或占用别的会话启动的进程（开发服务器等）。端口被占了就换一个端口。
- 部署：`pnpm land` 已经推到 GitHub，要上线再按上面的命令部署。

## 仅有的几条规矩

- 素材只用自己做的，或允许商用、不用申请授权的第三方素材；第三方素材在旁边写明来源和许可。
- 公开界面保留简体中文和英文。
