import type {Location} from './model'
export interface Region {id:string;title:string;kicker:string;body:string;at:Location;camera:Location;distance:number;kind:'wind'|'ocean'|'both'}
export const REGIONS:Region[]=[
  {id:'atlantic',title:'北大西洋',kicker:'一股强流，卷出很多旋涡',body:'从北美东岸向东北找，看看海水怎样转弯、分叉和卷成涡旋。这里的细节来自 2014 年的 OSCAR 格点；放出一组标记，看相邻起点会不会越走越远。',at:{lon:-65,lat:37.7},camera:{lon:-45,lat:29},distance:2.7,kind:'ocean'},
  {id:'kuroshio',title:'日本以东',kicker:'黑潮离开海岸以后',body:'沿着日本南侧走向外海，寻找这份快照里的强流带。海岸附近有缺测，标记会在缺测边界停住；那不是模拟出的搁浅。',at:{lon:151.3,lat:35.6},camera:{lon:142,lat:31},distance:2.55,kind:'ocean'},
  {id:'equator',title:'赤道太平洋',kicker:'同一片海，风和水会同向吗',body:'把风和洋流叠在一起，在同一处各放一个标记。它们使用各自的真实速度，并共享漂流时钟；风场与五日洋流产品的时间尺度不同。',at:{lon:-145,lat:3},camera:{lon:-147,lat:8},distance:2.8,kind:'both'},
  {id:'antarctic',title:'南大洋',kicker:'绕过地球的水与风',body:'把镜头转向南纬四五十度，沿着南大洋寻找较连续的流带。经纬网能帮你辨认纬度；OSCAR 在南纬 80 度以外没有数据。',at:{lon:59,lat:-45},camera:{lon:40,lat:-49},distance:2.8,kind:'both'},
  {id:'indian',title:'印度洋',kicker:'用一个历史切片，认识一个季节',body:'这里是 2014 年一月底，不是今天，也不能用它概括全年。看看阿拉伯海与赤道两侧的向量，再把空气与海水的路线放在一起比较。',at:{lon:65,lat:8},camera:{lon:62,lat:12},distance:2.75,kind:'both'},
  {id:'pacific',title:'北太平洋',kicker:'把一片海完整地展开',body:'从北美西侧转到亚洲东侧，寻找大范围弯曲的流线。漂流轨迹只把这一帧保持不变，不包含未来天气、潮汐、波浪或漂浮物受风。',at:{lon:-155,lat:27},camera:{lon:-155,lat:28},distance:3.1,kind:'ocean'},
  {id:'africa',title:'非洲南端',kicker:'水流在大陆边缘转身',body:'在非洲东南侧和南端附近寻找较强的海流。移动测量点，比较顺着风走的空气与沿海水速度走的标记，观察两者的夹角。',at:{lon:20,lat:-39.3},camera:{lon:26,lat:-30},distance:2.7,kind:'both'},
  {id:'wind',title:'全球近地风',kicker:'离地十米的一层运动',body:'这一层是 GFS 在 2014 年 1 月 31 日 03:00 UTC 的十米风，包含陆地。风向读数按气象习惯报告从哪里来，流线箭头与标记则朝它吹去的方向。',at:{lon:-35,lat:45},camera:{lon:-23,lat:25},distance:3.7,kind:'wind'},
]
