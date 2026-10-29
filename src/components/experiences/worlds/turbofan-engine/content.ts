export const PARTS = [
  { id: 'fan', number: '01', name: '风扇', subtitle: '大部分空气，在外面走', color: '#87c5cf', x: -4,
    body: '前方的大风扇把空气分成两路。外涵道空气绕过燃烧室，直接向后喷出；内涵道空气进入核心机。两股气流的动量变化一起贡献推力。',
    experiment: '试着增大涵道比。更多空气由低压涡轮带动的风扇加速，同时需要更多轴功。' },
  { id: 'compressor', number: '02', name: '压气机', subtitle: '一排转子，一排静子', color: '#d4bc89', x: -1.8,
    body: '旋转叶片把轴功交给空气，静止叶片把流动转回来，并帮助扩压。沿着多级压气机，压力和温度一起升高。高压轴由后面的高压涡轮驱动。',
    experiment: '降低压气机效率：达到相同压比需要更多轴功，出口也更热。观察高压涡轮必须取走多少能量。' },
  { id: 'combustor', number: '03', name: '燃烧室', subtitle: '持续燃烧，接近等压加热', color: '#eeaa73', x: .5,
    body: '燃油通过周向排列的喷嘴进入环形燃烧室。旋流器形成回流区帮助稳住火焰，只有部分空气参与初始燃烧，其余空气冷却和稀释热气。',
    experiment: '加大油门，燃烧室出口总温上升。燃油流量由能量平衡计算；金色流点只是热气路径的示意。' },
  { id: 'turbine', number: '04', name: '两套涡轮', subtitle: '同轴套在一起，各转各的', color: '#c3a9a0', x: 2.7,
    body: '高温气体先经过高压涡轮，驱动压气机；再经过低压涡轮，驱动风扇。两根同心轴允许两套转子用不同转速运行。涡轮做功时，气体总温与总压下降。',
    experiment: '切到轴系视图并慢放。青色低压轴连接风扇和低压涡轮，金色高压空心轴连接压气机和高压涡轮。' },
  { id: 'nozzle', number: '05', name: '尾喷管', subtitle: '剩余能量，成为喷流', color: '#9db3c6', x: 4.7,
    body: '喷管把气流剩余的压强能和热能转成速度。核心喷流和外涵道喷流分开排出。若收敛喷管达到临界压比，喉口阻塞，此时出口压力还会贡献推力。',
    experiment: '切换地面起飞与高空巡航。推力同时取决于进气、喷流动量和出口压力，不只取决于火焰。' },
] as const
export type PartId = typeof PARTS[number]['id']
export type EngineView = 'cutaway' | 'assembled' | 'shafts' | 'front'
