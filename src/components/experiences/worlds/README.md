# 世界源码目录

这里存放按新约定制作的 World。一个目录只对应一个 `world-id`，入口为
`index.tsx`，并导出 `worldRenderer`：

```ts
export { ExampleWorld, ExampleWorld as worldRenderer } from './ExampleWorld'
```

目录可以包含主组件、纯模型、固定数据、测试和私有 CSS。世界之间不得互相
import；需要复用的能力放到共享层。入口由
`src/worlds/experience-registry.ts` 的目录 glob 自动发现，因此新增世界不应
编辑共享 registry。

英文覆盖、catalog 元数据和海报分别位于对应的 per-world 文件。共享壳层（GuideTour、Freebar、GhostHint）留在上一层，世界之间不得互相 import。

`works` 根分类（作品）下的世界是数学与艺术作品，不回答某一个日常问题，不按
`METHOD.md` 的五拍来做，也不在重做计划和形状审计（`audit:shape`）之内。
