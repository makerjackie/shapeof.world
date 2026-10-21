# 世界 catalog 目录

catalog 按根 Category 分目录。新增一个 World 时新增一个文件：

```text
src/data/worlds/catalog/<root-category-id>/<world-id>.ts
```

文件默认导出一个 `WorldExperience`。根目录 `index.ts` 用一次递归 eager glob
自动发现所有条目，并按相对路径排序；脚本通过同样的路径顺序扫描 catalog。
普通新增不修改 `worlds.ts`、共享 catalog 巨型文件或 root registry。

`id`、文件名、`renderer`、世界源码目录和生成英文词典必须一致。新世界默认
`publication` 为 `making`；公开前由集中策展明确写入 `publication: 'public'`。
目录文件只描述世界；Category 的层级、Facet 的定义和 Path 的顺序属于内容图与
集中策展层。

网站源码和元数据是唯一来源。
