/**
 * Search-facing copy for the worlds that carry an extended search profile.
 * The shell uses it for the page title, meta description and the short answer
 * block; the route uses it for keywords and LearningResource structured data.
 */

export const searchPilotWorldIds = [
  'solar-system',
  'moon-voyage',
  'mandelbrot-zoom',
  'fluid-sim',
  'black-hole-flyby',
] as const

export type SearchPilotWorldId = (typeof searchPilotWorldIds)[number]

export type WorldSearchCopy = {
  title: string
  description: string
  answer: string
  queries: Array<string>
  teaches: Array<string>
}

export type WorldSearchProfile = {
  zh: WorldSearchCopy
  en: WorldSearchCopy
}

const solarSystem: WorldSearchProfile = {
  zh: {
    title: '太阳系互动模型：真实比例、卫星与旅行者号航迹',
    description:
      '在三维太阳系里切换真实比例与示意视图，查看八大行星、20 颗主要卫星和小天体，并沿 NASA 存档轨道跟随旅行者 1 号、2 号的飞掠与历史照片。',
    answer:
      '太阳系的尺寸和间距悬殊。真实比例视图让天体大小与轨道距离共用同一把线性尺子；示意视图保留天体之间的直径比例，只把轨道距离压缩，方便同屏查看。行星位置由冻结的 J2000 开普勒根数计算，卫星的初始相位与轨道朝向只是示意，不是实时星历。',
    queries: ['太阳系 3D 模型', '太阳系真实比例', '旅行者号航迹', '各行星公转周期'],
    teaches: ['天体直径与轨道距离相差多大', '行星公转周期与开普勒轨道', '主要卫星与母行星的关系', '旅行者号的飞掠路线'],
  },
  en: {
    title: 'Interactive Solar System Model: True Scale, Moons and Voyager Paths',
    description:
      'Switch a 3D Solar System between true-scale and illustrated views, inspect the eight planets, 20 selected moons and small bodies, and follow Voyager 1 and 2 along archived NASA trajectories with historical photographs.',
    answer:
      'Sizes and distances in the Solar System differ enormously. The true-scale view measures body sizes and orbital distances with one linear ruler; the illustrated view keeps the ratios between body diameters but compresses the orbital distances so everything fits on screen. Planet positions come from frozen J2000 Keplerian elements, while moon phases and orbit orientations are illustrative rather than live ephemerides.',
    queries: ['3D solar system model', 'solar system to scale', 'Voyager trajectory', 'orbital period of each planet'],
    teaches: [
      'how far apart planets are compared with their size',
      'orbital periods and Keplerian orbits',
      'which moons belong to which planet',
      'the route of the Voyager flybys',
    ],
  },
}

const moonVoyage: WorldSearchProfile = {
  zh: {
    title: '地球到月球要几天？阿波罗量级奔月飞行互动演示',
    description:
      '约一百秒走完一次阿波罗量级的奔月旅程：升空、地球停泊轨道、转移点火、滑行和绕月制动，可暂停也可拖动时间轴回看每一段。',
    answer:
      '阿波罗式任务从发射到进入环月轨道约 76 小时，三天出头，抵达时已是第四天。飞船不会对着月球现在的位置直飞，而是先绕地球加速，再沿转移轨道飞向月球届时所在的位置，接近后制动才被月球留住。这里到达的是月球轨道，没有登月。',
    queries: ['地球到月球要多久', '飞到月球需要几天', '阿波罗奔月轨道', '地月转移轨道'],
    teaches: ['奔月航程的时间构成', '地月转移轨道为何不是直线', '地球停泊轨道与绕月制动'],
  },
  en: {
    title: 'How Many Days to the Moon? An Apollo-Scale Flight You Can Scrub',
    description:
      'Watch an Apollo-scale trip to the Moon in about a hundred seconds: launch, Earth parking orbit, the transfer burn, coasting and lunar orbit insertion, with a timeline you can pause and drag back.',
    answer:
      'An Apollo-style mission reaches lunar orbit about 76 hours after launch, a little over three days, so arrival falls on day four. The spacecraft does not aim at where the Moon is now: it speeds up around Earth, then follows a transfer orbit toward where the Moon will be, and must brake near the end to be captured. This world ends in lunar orbit, not a landing.',
    queries: ['how many days to fly to the moon', 'time to travel from Earth to the Moon', 'Apollo flight path to the Moon', 'Earth-Moon transfer orbit'],
    teaches: [
      'how the trip time to the Moon adds up',
      'why the transfer path is not a straight line',
      'Earth parking orbit and lunar orbit insertion',
    ],
  },
}

const mandelbrotZoom: WorldSearchProfile = {
  zh: {
    title: '曼德勃罗集放大镜：沿分形边界逐层深入的在线互动',
    description:
      '在浏览器里用 GPU 实时放大曼德勃罗集，沿边界找到海马谷与螺旋；每个像素对应一个复数 c，颜色记录迭代 z²+c 多少步后逃逸，还可切换到 Julia 集。',
    answer:
      '从 z=0 出发反复计算 z²+c，若数值始终保持有界，c 就属于曼德勃罗集。画面中黑色表示在迭代上限内没有看到逃逸，彩色按逃逸所需的步数着色，色带循环使用，并不代表越亮越快。真正的边界有无限细节，本页只能用有限精度和有限迭代次数近似。',
    queries: ['曼德勃罗集放大', '曼德博集合是什么', '分形在线放大', 'z²+c 迭代'],
    teaches: ['曼德勃罗集如何由 z²+c 定义', '逃逸时间着色的读法', '分形边界的自相似与精度极限'],
  },
  en: {
    title: 'Mandelbrot Set Magnifier: Dive Along a Fractal Boundary in Your Browser',
    description:
      'Zoom into the Mandelbrot set in real time on your GPU and follow its boundary to the seahorse valley and spirals. Each pixel is a complex number c, colored by how many steps of z²+c it takes to escape; a Julia mode is included.',
    answer:
      'Start at z = 0 and keep applying z²+c: if the values stay bounded, c belongs to the Mandelbrot set. Black pixels here are ones that had not escaped within the iteration limit; the colors count the steps before escape and cycle through a palette, so a brighter shade does not mean a faster escape. The true boundary has endless detail, which this page can only approximate with finite precision and finite iterations.',
    queries: ['zoom into the Mandelbrot set', 'what is the Mandelbrot set', 'fractal zoom in browser', 'z squared plus c iteration'],
    teaches: [
      'how z²+c defines the Mandelbrot set',
      'how to read escape-time colors',
      'self-similarity and the precision limit of fractal boundaries',
    ],
  },
}

const fluidSim: WorldSearchProfile = {
  zh: {
    title: '流体涡旋模拟器：用鼠标搅动染料，看漩涡生成与消散',
    description:
      '在画布上拖动鼠标或手指，实时搅动 GPU 求解的流体；染料随水流拉长、卷起，调高黏度后细小的旋转会更快消失。',
    answer:
      '流动会带着已有的速度向前走，快慢不同的相邻水层在交界处互相卷绕，形成涡旋；黏性再把速度差一点点抹平，小涡先消失。纳维－斯托克斯方程把输运、压力与黏性写进同一个式子，这个模拟让你能亲手观察它们的效果。',
    queries: ['流体模拟器在线', '漩涡是怎么形成的', '搅咖啡为什么有旋涡', '纳维－斯托克斯方程 可视化'],
    teaches: ['涡旋怎样在速度差处出现', '黏性怎样让小尺度旋转消失', '纳维－斯托克斯方程的直观含义'],
  },
  en: {
    title: 'Fluid Vortex Simulator: Stir Dye and Watch Eddies Form and Fade',
    description:
      'Drag a mouse or finger across the canvas to stir a fluid solved on your GPU in real time. Dye stretches and rolls up with the flow, and raising the viscosity makes the smallest swirls die out sooner.',
    answer:
      'A flow carries its own velocity forward, so neighboring layers moving at different speeds wrap around each other where they meet and form vortices; viscosity then smooths the speed differences out, and the smallest eddies vanish first. The Navier–Stokes equations combine transport, pressure and viscosity, and this simulation lets you see each effect by hand.',
    queries: ['fluid simulation online', 'how do whirlpools form', 'why does stirred coffee spin', 'Navier–Stokes equations visualized'],
    teaches: [
      'how vortices appear where velocities differ',
      'how viscosity removes small-scale swirls',
      'what the Navier–Stokes equations say, intuitively',
    ],
  },
}

const blackHoleFlyby: WorldSearchProfile = {
  zh: {
    title: '掠过黑洞会看到什么？实时引力透镜与吸积盘模拟',
    description:
      '驾驶飞行器从深空接近一个不旋转的黑洞，实时渲染吸积盘、光环与被弯曲的星空；可开关引力透镜与多普勒效应，也可调整吸积盘温度。',
    answer:
      '黑洞附近的强引力把光线弯折，背后的星空和吸积盘会呈现成扭曲、重复的像，并在黑洞周围聚成明亮的光环。事件视界本身不发光，只显示为暗区；它的轮廓靠周围发光的物质和被弯曲的光来勾勒。本模拟采用史瓦西度规，不含自旋，吸积盘是简化的薄盘，背景星空由程序生成。',
    queries: ['黑洞附近能看到什么', '引力透镜模拟', '黑洞吸积盘', '黑洞光环'],
    teaches: ['引力如何弯曲光线', '吸积盘与光环的成因', '事件视界为什么是暗的'],
  },
  en: {
    title: 'What Do You See Passing a Black Hole? Live Gravitational Lensing',
    description:
      'Fly a spacecraft in from deep space toward a non-rotating black hole and watch a real-time render of its accretion disc, bright rings and warped stars. Toggle lensing and the Doppler effect, or change the disc temperature.',
    answer:
      'Close to a black hole, strong gravity bends light, so the stars behind it and the accretion disc show up as distorted, repeated images and gather into bright rings around it. The event horizon itself emits nothing and appears as a dark region, outlined by glowing matter and bent light. The model uses a Schwarzschild metric with no spin, a simplified thin disc and a procedurally generated sky.',
    queries: ['what does a black hole look like up close', 'gravitational lensing simulation', 'black hole accretion disc', 'black hole photon ring'],
    teaches: [
      'how gravity bends light',
      'what produces the accretion disc and bright rings',
      'why the event horizon looks dark',
    ],
  },
}

const profiles: Record<SearchPilotWorldId, WorldSearchProfile> = {
  'solar-system': solarSystem,
  'moon-voyage': moonVoyage,
  'mandelbrot-zoom': mandelbrotZoom,
  'fluid-sim': fluidSim,
  'black-hole-flyby': blackHoleFlyby,
}

export function getWorldSearchProfile(worldId: string): WorldSearchProfile | undefined {
  return Object.hasOwn(profiles, worldId) ? profiles[worldId as SearchPilotWorldId] : undefined
}
