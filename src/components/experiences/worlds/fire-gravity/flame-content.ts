export type FlameRegion = 'whole' | 'core' | 'luminous' | 'outer'
export const flameRegions = [
  { id: 'whole', label: '全貌', title: '烛火最亮的地方，就是最热的地方吗？', body: '最亮的是黄色那一片；更热的，往往是外侧那层不起眼的薄边。剖开它，看看燃料和空气在哪里相遇。', fact: '自然外观 · 火焰的边界由反应与流动形成', focus: 0 },
  { id: 'core', label: '焰心', title: '焰心：暗处也有燃料', body: '烛芯上方聚集着蜡蒸气。这里氧气较少，燃料还没有充分燃烧。', fact: '焰心 · 富燃料、少氧气 · 暗不等于冷', focus: 1 },
  { id: 'luminous', label: '内焰', title: '内焰：微小烟炱烧得发亮', body: '蜡蒸气受热分解，形成微小烟炱。炽热颗粒发出黄光，构成最醒目的亮区。', fact: '内焰 · 烟炱白炽发光 · 最亮未必最热', focus: 2 },
  { id: 'outer', label: '外焰', title: '外焰：氧气从外面进来', body: '燃料与周围氧气在外侧相遇，氧化反应更充分。薄薄的外缘常比黄色亮区更热，却不那么显眼。', fact: '外焰 · 富氧反应区 · 蓝色外缘已增强显示', focus: 3 },
] as const
import type { ChemistryView } from './combustion-model'
type FlameChapter = { title: string; body: string; region: FlameRegion; peel: number; transport: boolean; gravity: number; chemistry?: ChemistryView }
export const flameStory: readonly FlameChapter[] = [
  { title: '最亮，未必最热', body: '烛火看起来是一团黄光。它的暗心、亮区和微弱外缘，正在做不同的事。', region: 'whole', peel: 0, transport: false, gravity: 1 },
  { title: '蜡先变成气体，才进入火焰', body: '热融化蜡；液蜡沿烛芯上升，再受热汽化。跟着金色光点，看燃料从蜡池进入火中。', region: 'whole', peel: .5, transport: true, gravity: 1 },
  { title: '剖开亮光，里面是暗的', body: '焰心富含蜡蒸气，却缺少足够氧气。剖面里的暗区就在烛芯上方，不是一个空洞。', region: 'core', peel: 1, transport: true, gravity: 1 },
  { title: '黄色，是烟炱在发光', body: '内焰里形成的微小烟炱受热发亮。可见亮度与温度并非一回事，不能只凭颜色比较冷热。', region: 'luminous', peel: 1, transport: false, gravity: 1 },
  { title: '外侧，燃料遇见氧气', body: '蓝色示踪从空气进入反应边缘。氧化释放热，热又帮助蜡继续熔化和汽化，燃烧得以维持。', region: 'outer', peel: 1, transport: true, gravity: 1 },
  { title: '蜡变少了，原子还在', body: '化学视角用甲烷这个简单烃作例子：同样九个原子，重排成二氧化碳和水。烛蜡更复杂，但也遵守原子守恒。', region: 'whole', peel: 0, transport: true, gravity: 1, chemistry: 'products' },
  { title: '少一点氧气，多一些未完成的反应', body: '供氧受限时，可能留下烟炱和一氧化碳。烟炱可以看见；一氧化碳不能靠烟色判断。自由探索时，再亲手减少供氧。', region: 'whole', peel: 0, transport: true, gravity: 1, chemistry: 'incomplete' },
  { title: '成键与断键之间，留下能量差', body: '反应先需要跨过能垒。成键释放的能量超过断键所需时，整体放热；一部分热又回到蜡池。', region: 'whole', peel: 0, transport: true, gravity: 1, chemistry: 'energy' },
  { title: '火焰里，还有反应接力', body: 'H与O₂反应，可生成O和OH两个活泼链载体。真实火焰靠许多传播、分支和终止步骤共同演化。', region: 'whole', peel: 0, transport: true, gravity: 1, chemistry: 'chain' },
  { title: '连火焰的尖，也是流动塑成的', body: '减弱浮力，向上对流也随之减弱。静止空气中的微重力烛火可以收成圆顶；回到地球，再亲手剖开各层。', region: 'whole', peel: 0, transport: true, gravity: 0 },
] as const
