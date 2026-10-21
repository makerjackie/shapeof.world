export const FILM_DURATION = 430
export const POSTER_TIME = 282.5

export const chapters = [
  { start: 0, label: '量速度' },
  { start: 94, label: '光做钟' },
  { start: 182, label: '谁的现在' },
  { start: 250, label: '画出时空' },
  { start: 300, label: '追不上' },
  { start: 334, label: '光是什么' },
  { start: 394, label: '还不知道' },
] as const

type Lesson = 'speed' | 'ball' | 'light' | 'unit'
type Beat = {
  at: number
  /** Physical scene choreography has its own clock, independent of reading time. */
  sceneAt: number
  title: string
  body: string
  detail: string
  equation?: string
  math?: string
  lesson?: Lesson
  proof?: 'clock' | 'measurements'
}

export const story: readonly Beat[] = [
  { at: 0, sceneAt: 0, title: `为什么
追不上光？`, body: '你坐上飞船，追赶一束光。飞船越开越快，光在你那里会不会慢下来？我们从一把尺、一只钟开始。', detail: '跟着画面看，也可以暂停慢慢读' },
  { at: 12, sceneAt: 4, title: `多快，
要用尺和钟量。`, body: '看这个小球：走过 6 米，用了 3 秒。每秒走 2 米，这就是它的速度。测光速，也得量距离和时间。', detail: '看刻度上的小球，与旁边经过的秒数', equation: '6 米 ÷ 3 秒 = 2 米/秒', lesson: 'speed' },
  { at: 28, sceneAt: 10, title: `追一只球，
它会显得慢些。`, body: '地面上，球每秒走 10 米，你每秒追上 6 米。球每秒只离你远 4 米。日常生活里，速度这样相减。', detail: '上下两条轨道，使用同一套地面的尺和钟', equation: '10 − 6 = 4 米/秒', lesson: 'ball' },
  { at: 44, sceneAt: 17, title: `先换一把
更好读的尺。`, body: '光在真空中一秒走过的距离，叫“一光秒”，约三十万公里。它是距离单位。接下来，用它给尺子标刻度。', detail: '光秒是距离，就像公里；不是一种时间', equation: '1 光秒 ÷ 1 秒 = c', lesson: 'unit' },
  { at: 60, sceneAt: 24, title: `换成光，
答案变了。`, body: '你以光速的八成追光。用飞船自己的尺和钟测量，光仍每秒走约三十万公里。实验支持这个出人意料的结果。', detail: '同一束光，各用自己的尺和钟；c 指局部真空光速', equation: '地面测得 c · 飞船也测得 c', lesson: 'light' },
  { at: 76, sceneAt: 30, title: `关键是：
谁的尺，谁的钟？`, body: '测速度，不能只盯着两个东西的间距。飞船用自己的尺和钟，地面用地面的。它们对距离和时间的测量，会有差别。', detail: '下面先看看，为什么两只钟会不同步地滴答', equation: '速度 = 这个观察者量出的距离 ÷ 时间' },
  { at: 94, sceneAt: 34, title: `用一束光，
做一只钟。`, body: '光在两面镜子之间来回。每次回到底部，就算一次“滴答”。先看两只一样的钟：镜距一样，滴答也一样。', detail: '蓝色留在实验室，金色跟着飞船', equation: '一次往返 = 一次滴答' },
  { at: 110, sceneAt: 47, title: `镜子走了，
光得斜着追。`, body: '现在让飞船匀速前进。从地面看，光往上走时，上面的镜子也在向前走。光要碰到它，就得走更长的斜线。', detail: '盯住金色光点：它必须和上镜在同一处相遇', equation: '同样的镜距 · 更长的光路' },
  { at: 128, sceneAt: 61, title: `多走的路，
要多花时间。`, body: '把半程拆开看：镜距 3 光秒，侧移 4 光秒，斜路长 5 光秒。船上量到 3 秒，地面量到 5 秒。光速一样，时间就不能一样。', detail: '飞船速度 0.8c · 半程到上镜，来回才是一拍', proof: 'clock' },
  { at: 146, sceneAt: 70, title: `船上的一秒，
没有变难熬。`, body: '船上的人看自己的钟，一切正常。地面拿自己的钟去比较，才发现运动钟滴答更慢。这叫“时间膨胀”。', detail: '画面放慢播放，让一次滴答看得见', equation: '地面经过 5 秒 · 船上经过 3 秒', math: 'Δτ / Δt = √(1 − v²/c²) = 0.6' },
  { at: 164, sceneAt: 74, title: `不只是
镜子里的把戏。`, body: '换成原子钟，也能测到时间差。匀速飞行时，船上的人也会判断地面的钟慢：双方使用的“同时”不同，比较方式也不同。', detail: '先记住：每个人自己的钟都正常；接着解释“同时”', equation: '运动没有一个公认的绝对静止背景' },
  { at: 182, sceneAt: 78, title: `记录一件事，
要写“哪里、几点”。`, body: '一盏灯闪了一下。给这件事记下位置和时刻，就得到一个“事件”。图上的点，是一件事的地址：既有地点，也有时间。', detail: '下面比较闪光发生的时刻，不是眼睛看见它的时刻', equation: '事件 = 某处，某时，发生了一件事' },
  { at: 198, sceneAt: 85, title: `两盏灯同闪，
谁说了算？`, body: '实验室两端的钟已经对好时，两盏灯同时闪光。飞船也用自己对好时的钟记录，却认为两次闪光先后发生。', detail: '已扣除光传到眼睛的延迟；这是记录时刻的差异', equation: '同一对闪光 · 对“同时”有不同判断' },
  { at: 214, sceneAt: 91, title: `这张薄面，
就是一份“现在”。`, body: '薄面上的点，是一个观察者认为同时发生的事。换到运动的飞船，这份“现在”就斜过去了。时间和位置因此联系在一起。', detail: '格线是我们画的坐标，不是宇宙里真实的网', math: 't′ = γ(t − vx/c²)' },
  { at: 230, sceneAt: 103, title: `距离变了，
时间也一起变。`, body: '只看同一次发射和接收。地面量出 1 光秒、1 秒；飞船量出 0.5 光秒、0.5 秒。各自把距离除以时间，光速都一样。', detail: '飞船速度 0.6c · 两地时刻由各自参考系中对好时的钟记录', proof: 'measurements' },
  { at: 250, sceneAt: 114, title: `把一圈圈光，
叠成一段历史。`, body: '一闪之后，光向外扩散。每个圆圈记录一个时刻。把晚一些的圆圈放高一些，就得到上半部的漏斗形状：未来光锥。', detail: '向上是更晚的时间；向旁边是更远的地点', equation: '光锥 = 一次闪光的传播历史' },
  { at: 268, sceneAt: 128, title: `有些事，
现在还来不及影响。`, body: '从中间的发光点发信号，光沿上半部锥面前进，慢一些的物体走在里面。锥外的那个事件发生得太早，信号赶不到。再晚一点，那个地点就可能收到。', detail: '限制的是“某地、某时”这一件事，不是某地点永远去不了', equation: '最早能到的时刻，由 c 决定' },
  { at: 284, sceneAt: 139, title: `光没有
自己的静止座位。`, body: '你不能坐进一个与光并排静止的参考系。所以不能说“光自己觉得一瞬间就到了”。图上的发射点和接收点，依然是两件不同的事。', detail: '数学上的零时空间隔，不等于零距离、同一事件', math: 's² = (cΔt)² − Δr² = 0' },
  { at: 300, sceneAt: 150, title: `越接近，
越难再快一点。`, body: '给有质量的飞船增加能量，它会变快。但越接近 c，同样的提速需要越多能量。要真正达到 c，需要无限能量。', detail: '看金色轨迹逼近光锥边缘，却始终留在里面', equation: '可以越来越接近，无法加速到 c', math: 'E = γmc²；γ = 1 / √(1 − v²/c²)' },
  { at: 316, sceneAt: 164, title: `一直飞，
为什么不用一直推？`, body: '汽车要烧油，是在克服阻力。没有外力时，普通物体也会一直匀速运动。光同样不需要持续推力；真空中的光子也没有从静止加速的阶段。', detail: '动力改变运动；保持匀速不需要持续推力', equation: '没有静止质量 ≠ 没有能量或动量' },
  { at: 334, sceneAt: 178, title: `光到底
是什么在动？`, body: '画面中的起伏代表电场、磁场的变化。这种变化会传播、传递能量。量子理论把光的能量交换描述成一份份的“光子”。', detail: '波形画的是场的数值，不是光子的外形', equation: '光是电磁波 · 光子是电磁场的量子' },
  { at: 350, sceneAt: 185, title: `遇到玻璃，
材料也加入了。`, body: '光的电场推动材料里的电荷振动。电荷产生的场再和光叠加，整体波形便走得慢一些。看玻璃里的波峰，挤得更密了。', detail: '连续的集体响应，不是光子一站站停车再出发', equation: '这里玻璃内的相速度 = c ÷ 1.5' },
  { at: 366, sceneAt: 191, title: `变慢的是
介质中的传播。`, body: '光进入这块静止的透明玻璃，频率不变，波长缩短。离开玻璃又恢复。相对论中那个共同的 c，指的是真空光速。', detail: '画面采用理想透明、无色散介质', equation: '真空中 c · 玻璃中约 ⅔c' },
  { at: 380, sceneAt: 202, title: `为什么恰好是
三十万公里？`, body: '这个数字取决于单位。用光秒量距离，光速就写成 1。现行“米”用光速来定义；这并没有解释为什么不同观察者测得的光速相同。', detail: '数值怎样写，与自然界遵守什么规律，是两个问题', equation: '299,792,458 米/秒 = 1 光秒/秒' },
  { at: 394, sceneAt: 212, title: `放到最小，
时空会有像素吗？`, body: '一些量子引力理论提出离散结构，但还没有实验定论。普朗克长度也不是已经发现的像素大小。画面里的格子，只是在帮我们表示坐标。', detail: '时空是否连续，仍是开放问题', equation: '理论提出了可能 · 实验尚未确认' },
  { at: 410, sceneAt: 225, title: `光速，连着
我们的钟和尺。`, body: '你现在已经看到：速度来自钟和尺；换一个观察者，时间、距离和“同时”一起改变，光速仍相同。相对论说明它们怎样配合；自然为何选择这套规律，仍没有终极答案。', detail: '点“亲手试试”，改变速度，再换到飞船看一遍', equation: '不同的钟与尺 · 同一个 c' },
]

export function storyIndex(time: number) {
  let index = 0
  for (let i = 1; i < story.length; i++) if (time >= story[i].at) index = i
  return index
}

export function chapterIndex(time: number) {
  let index = 0
  for (let i = 1; i < chapters.length; i++) if (time >= chapters[i].start) index = i
  return index
}

export function smoothStep(value: number) {
  const x = Math.max(0, Math.min(1, value))
  return x * x * (3 - 2 * x)
}

/** Monotone, seekable mapping: more reading time never changes the physical example. */
export function sceneTimeAt(time: number) {
  const clamped = Math.max(0, Math.min(FILM_DURATION, time))
  const current = story[storyIndex(clamped)]
  const next = story[storyIndex(clamped) + 1] ?? { at: FILM_DURATION, sceneAt: 240 }
  const fraction = (clamped - current.at) / (next.at - current.at)
  return current.sceneAt + (next.sceneAt - current.sceneAt) * fraction
}

const sceneChapterStarts = [0, 34, 78, 114, 150, 178, 212]
function chapterBeta(time: number, chapter: number) {
  if (chapter === 1) return .8 * smoothStep((time - 43) / 13)
  if (chapter === 2) return .6
  if (chapter === 3) return .6 * Math.sin((time - 114) * .07)
  if (chapter === 4) return .4 + .58 * smoothStep((time - 150) / 13)
  return .8
}

export function narrativeScene(time: number) {
  const chapter = chapterIndex(time)
  const sceneTime = sceneTimeAt(time)
  const transition = smoothStep((sceneTime - sceneChapterStarts[chapter]) / 2.8)
  const targetBeta = chapterBeta(sceneTime, chapter)
  const previousBeta = chapter > 0 ? chapterBeta(sceneChapterStarts[chapter], chapter - 1) : targetBeta
  const beta = previousBeta + (targetBeta - previousBeta) * transition
  const beat = story[storyIndex(time)]
  const nextBeat = story[storyIndex(time) + 1]
  return {
    sceneTime,
    chapter: chapter === 0 ? 0 : chapter - 1 + transition,
    beta,
    frame: sceneTime >= 103 && sceneTime < 114 ? 'ship' as const : 'lab' as const,
    refractiveIndex: 1 + .5 * smoothStep((sceneTime - 179) / 6),
    showGeometry: sceneTime >= 47 && sceneTime < 78,
    showMeasurements: sceneTime >= 91 && sceneTime < 114,
    lesson: beat.lesson,
    lessonTime: Math.max(0, time - beat.at),
    lessonProgress: Math.max(0, Math.min(1, (time - beat.at) / ((nextBeat?.at ?? FILM_DURATION) - beat.at))),
  }
}

export function formatTime(time: number) {
  const seconds = Math.floor(Math.max(0, Math.min(FILM_DURATION, time)))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}
