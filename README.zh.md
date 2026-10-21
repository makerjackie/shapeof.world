# Shape of the World

[English](./README.md) · [中文](./README.zh.md)

Shape of the World（世界的形状）：看见世界如何运行。一组面向普通人的可玩视觉世界：先用美、惊喜和触感把人留下来，再让科普自然发生。网站：[shapeof.world](https://shapeof.world)。

本仓库包含网站、世界运行时和世界本身。旧的私有仓 `oneworld` 仅作为历史档案保留。本站不出售任何东西。

根目录 [`AGENTS.md`](./AGENTS.md) 记录全仓仅有的几条事实和规则。

## 本地开发

```sh
pnpm install
pnpm dev
```

打开 `http://localhost:3000`。默认语言是简体中文；英文页面在 `/en` 下。

官方 Three.js 元素周期表示例的上游快照与本项目的改编版本保存在
`vendor/three-periodic-table/`；改动后运行 `pnpm build:periodic-table`。

## 验证

```sh
pnpm check
```

`pnpm check` 是本地质量门禁：类型、单元与基础设施测试、生成器、生产构建、
客户端资产预算与 Worker 打包预算。仓库不配置 GitHub Actions，发布者在干净的
工作区上运行该命令。

单个世界的开发循环用 `pnpm world:check --id <world-id>`。

## 部署

生产环境是 Cloudflare Workers：Worker `shape-of-the-world` 服务 `shapeof.world`。
2026-10-21 之前的旧版网站保留在 `v2.shapeof.world`，不被搜索引擎收录。统计
（`infra/insights`）和视频发布套件（`infra/press`）各自是独立的 Worker。

```sh
pnpm check
pnpm build
npx wrangler deploy
```

## 产品架构

- TanStack Start + TanStack Router：服务端渲染与路由
- 客户端体验注册表：每个世界的主组件、私有 CSS 与英文词典并行懒加载；大型浏览器引擎不进入 Worker 服务端包
- 384×256 目录缩略图：目录与系列卡片不会下载 2560px 海报
- deck.gl / Flowmap.gl、model-viewer、Mol* 与 Three.js 适配器：流网络、结构、分子、行星影像与原生互动实验
- Cloudflare Workers：边缘部署、同源资产与匿名事件
- 构建预算：Worker、全局 CSS、共享体验运行时、单个 JS chunk 与 Cloudflare 静态资产体积
- 可安装的 PWA 外壳
- 匿名产品事件：打开、真实互动、有效停留、收藏、分享与远程资产加载失败；不记录知识内容与个人身份

## 世界与来源

每个世界都在代码旁自带来源与权利记录；项目只发布自绘自建，或第三方许可为
「无需申请、署名即可、允许商用」的素材。新世界的进仓门槛见
[`AGENTS.md`](./AGENTS.md)。

- 第三方代码与资产：[OSS_NOTICES.md](./OSS_NOTICES.md)
- 数据来源与依据：[DATA_SOURCES.md](./DATA_SOURCES.md)
- 产品范围与术语：[CONTEXT.md](./CONTEXT.md)

## 许可与商业条款

- 本仓项目方软件：[`AGPL-3.0-only`](./LICENSE)。完整履行相应用途下 AGPL
  义务的商业使用无需付费许可；超出 AGPL 授权范围把代码用于闭源产品时，需另签
  [商业授权](./COMMERCIAL_LICENSE.md)。
- 项目方原创文案与视觉内容：[`CC BY-NC 4.0`](./CONTENT_LICENSE.md)；超出
  `NonCommercial` 范围且依法需要版权许可时须另行授权。
- 第三方代码、模型、数据、图片、字体、音频与服务继续遵循各自许可证，不因位于
  本仓而重新授权。
- “Shape of the World / 世界的形状”名称、标识与品牌不随代码或内容授权开放：
  [TRADEMARKS.md](./TRADEMARKS.md)。

完整边界见 [LICENSING.md](./LICENSING.md)；贡献规则见
[CONTRIBUTING.md](./CONTRIBUTING.md)，可版权化贡献需按 [CLA.md](./CLA.md) 或
[CCLA.md](./CCLA.md) 完成核验。

## 贡献者

- [MakerJackie](https://github.com/makerjackie)：创作与维护。
- 历史贡献者：余（[yuzerofish](https://github.com/yuzerofish)），2026 年 7 月至 10 月参与设计与开发。

## 赞助

本项目由 叠加态社区（SUPERPOSITION）与 数耀量生（QuantSparkle）赞助。

<table>
  <tr>
    <td align="center" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./public/assets/sponsors/superposition-white.svg">
        <img src="./public/assets/sponsors/superposition-black.svg" alt="叠加态社区 SUPERPOSITION" width="240">
      </picture>
    </td>
    <td align="center" valign="middle">
      <picture>
        <source media="(prefers-color-scheme: dark)" srcset="./public/assets/sponsors/quantsparkle-white.png">
        <img src="./public/assets/sponsors/quantsparkle-black.png" alt="数耀量生 QuantSparkle" width="360">
      </picture>
    </td>
  </tr>
</table>

赞助方标识的权利说明见 [asset notice](./public/assets/sponsors/NOTICE.md)。
