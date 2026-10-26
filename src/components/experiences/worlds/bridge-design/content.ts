import type { BridgeKind } from './model'

export const BRIDGES: { id: BridgeKind; name: string; verb: string; heading: string; solves: string; cost: string; steps: string[]; detail: string; reading: string }[] = [
  { id: 'beam', name: '梁桥', verb: '托住', heading: '同一根梁，上面压，下面拉。', solves: '一根梁就能跨过去，桥上不用立塔。', cost: '跨度变大，弯曲迅速增加，需要更深的梁或更多桥墩。', steps: ['桥面弯曲', '上压下拉', '桥墩入地'], detail: '红色在上，蓝色在下。这对力一起抵抗弯曲；粗细表示弯矩换算的力偶，不是整根梁的轴力。', reading: '最大弯矩' },
  { id: 'arch', name: '拱桥', verb: '撑开', heading: '拱把重量往下送，也把两岸向外推。', solves: '弯成一道拱，让压力沿拱圈走向两岸。', cost: '两岸必须顶住向外的推力；偏载时，拱也会弯曲。', steps: ['桥面压立柱', '拱圈传压力', '两岸顶住推力'], detail: '看拱脚向外的红箭头。地基既承受向下的重量，也必须抵抗水平推力。这里是无系杆三铰拱；系杆拱另有拉杆承担推力。', reading: '每岸水平推力' },
  { id: 'suspension', name: '悬索桥', verb: '悬挂', heading: '主缆受拉，把桥面挂起来。', solves: '吊杆把桥面挂到主缆上，主缆把荷载带到桥塔和锚碇。', cost: '两端要有牢固的锚碇，桥面还要抵抗风引起的摆动和扭转。', steps: ['吊杆向上拉', '主缆受拉', '桥塔压地基'], detail: '蓝色主缆只能拉，不能推。桥塔受压；两端的锚碇还要把主缆牢牢拉住。移动卡车，看看哪一侧变粗。索形只作平衡示意，不表示真实桥的变形。', reading: '主缆水平拉力' },
  { id: 'stayed', name: '斜拉桥', verb: '牵住', heading: '一根根斜索，直接拉到塔上。', solves: '斜索直接拉住桥面，不需要一条跨过全桥的主缆。', cost: '斜索同时把桥面向塔挤压；偏载还会让桥塔和基础承受弯矩。', steps: ['桥面交给斜索', '斜索直接拉塔', '桥塔与基础承载'], detail: '蓝色斜索受拉，红色桥面受压。本模型把桥面分成独立承载的小段；真实连续桥面会把荷载分给多根索。', reading: '桥塔竖向荷载' },
]
