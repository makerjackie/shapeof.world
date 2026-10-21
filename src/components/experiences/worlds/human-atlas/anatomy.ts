export type SystemId =
  | 'skeletal'
  | 'muscular'
  | 'arterial'
  | 'venous'
  | 'nervous'
  | 'digestive'
  | 'respiratory'
  | 'urinary'
  | 'reproductive'
  | 'lymphatic'
  | 'endocrine'
  | 'integumentary'
  | 'connective'
  | 'sensory'
  | 'cardiac'

export type SystemInfo = {
  id: SystemId
  color: string
}

export const SYSTEMS: ReadonlyArray<SystemInfo> = [
  {id: 'skeletal', color: '#e2d9ba'},
  {id: 'muscular', color: '#a85b50'},
  {id: 'cardiac', color: '#b96760'},
  {id: 'sensory', color: '#b0c8ce'},
  {id: 'arterial', color: '#c05245'},
  {id: 'venous', color: '#527c9f'},
  {id: 'nervous', color: '#d8b565'},
  {id: 'respiratory', color: '#b98991'},
  {id: 'digestive', color: '#b8916b'},
  {id: 'urinary', color: '#b47961'},
  {id: 'lymphatic', color: '#879f7c'},
  {id: 'endocrine', color: '#c5a09a'},
  {id: 'reproductive', color: '#bda098'},
  {id: 'integumentary', color: '#ba9b7d'},
  {id: 'connective', color: '#aec3bb'},
]

export const SYSTEM_IDS = SYSTEMS.map((system) => system.id)

export interface Part {
  id: string
  name: string
  conceptId: string
  system: SystemId
  chunk: number
  positions: number
  normals: number
  indices: number
  vertexCount: number
  indexCount: number
  bounds: [number[], number[]]
}

export interface Concept {
  id: string
  name: string
  elements: string[]
}

export interface AtlasChunk {
  url: string
  bytes: number
  gzip?: string
  gzipBytes?: number
}

export interface Atlas {
  version: string
  sex?: 'male'
  source?: string
  scope?: string
  parts: Part[]
  concepts: Concept[]
  chunks: AtlasChunk[]
  triangles: number
}

export type View = 'three-quarter' | 'front' | 'back' | 'side'

export interface SceneState {
  inspectorOpen?: boolean
  explode: number
  visible: SystemId[]
  selected: string[]
  isolate: boolean
  view: View
  rotate: boolean
  reset: number
}

export const DEFAULT_VISIBLE: SystemId[] = [
  'cardiac',
  'sensory',
  'skeletal',
  'muscular',
  'arterial',
  'venous',
  'nervous',
  'respiratory',
  'digestive',
  'urinary',
  'lymphatic',
  'endocrine',
  'reproductive',
  'connective',
]

export const ORGAN_PRESET: SystemId[] = [
  'cardiac',
  'respiratory',
  'digestive',
  'urinary',
  'endocrine',
  'reproductive',
]

export const FEATURED_CONCEPT_NAMES = [
  'heart',
  'brain',
  'liver',
  'stomach',
  'spleen',
  'pancreas',
  'urinary bladder',
  'trachea',
] as const

export const STRUCTURE_NOTES: Record<string, string> = {
  heart: '胸腔里的肌性泵。右侧把血送进肺，左侧把血送进全身循环。',
  liver: '膈肌右侧下方的大器官。处理吸收来的养分，制造胆汁，并合成许多血浆蛋白。',
  brain: '神经系统的中枢。不同区域分工处理感知、运动、记忆、语言和内脏调节。',
  stomach: '食管与小肠之间的肌性囊。把食物与酸、酶混合后再送入十二指肠。',
  spleen: '左上腹的淋巴器官。过滤血液、清除衰老血细胞，并参与免疫反应。',
  pancreas: '同时有消化和内分泌功能。向小肠输送消化酶，并向血液释放胰岛素和胰高血糖素。',
  'urinary bladder': '骨盆里的肌性储袋。肾脏形成的尿液经输尿管到达这里。',
  trachea: '连接喉与支气管的主气道。软骨环让它在呼吸时保持开放。',
  diaphragm: '分隔胸腔和腹腔的阔肌。收缩时胸腔容积增大，空气被吸入肺。',
}

export function structureNote(name: string, system: SystemId): string | undefined {
  return STRUCTURE_NOTES[name.toLowerCase()] ?? SYSTEM_NOTES[system]
}

export const SYSTEM_NOTES: Record<SystemId, string> = {
  skeletal: '骨骼构成身体的支架，保护器官，并给肌肉提供附着点。骨内组织还储存矿物质、制造血细胞。',
  muscular: '骨骼肌通过牵拉附着点产生运动。它们与肌腱一起活动关节、维持姿势，并产热。',
  cardiac: '心脏是有四个腔的肌性泵。瓣膜引导血液单向流过肺循环和体循环。',
  sensory: '这些结构参与视觉、听觉和平衡等特殊感觉，把刺激交给神经系统处理。',
  arterial: '动脉把血液从心脏送向组织；在肺循环里，则把血送向肺。',
  venous: '静脉把血液送回心脏。浅、深两套网络收集组织回流；肺静脉把含氧血从肺带回。',
  nervous: '脑、脊髓和周围神经传递并处理信号，支持感觉、运动、协调和自主调节。',
  respiratory: '气道把空气送到肺，氧气和二氧化碳在此与血液交换。呼吸靠呼吸肌改变胸腔压力。',
  digestive: '消化道分解食物、吸收养分和水，并把残渣向前推进。附属器官提供胆汁和消化酶。',
  urinary: '肾脏过滤血液，调节体液、电解质和酸碱平衡。尿液经输尿管到膀胱，再经尿道排出。',
  lymphatic: '淋巴管把多余组织液送回循环。淋巴结等淋巴器官参与免疫监视。',
  endocrine: '内分泌器官把激素释放进血液，协调代谢、生长、应激和生殖。',
  reproductive: '这里呈现的是男性生殖结构，参与精子的生成、成熟、输送和性激素分泌。',
  integumentary: '体表提供外轮廓参照。皮肤构成屏障，并参与感觉和体温调节。',
  connective: '软骨、韧带和其他结缔组织支撑、连接并分隔结构，稳定关节并分散载荷。',
}

export const SYSTEM_LABELS: Record<SystemId, string> = {
  skeletal: '骨骼',
  muscular: '肌肉',
  cardiac: '心脏',
  sensory: '感觉器官',
  arterial: '动脉',
  venous: '静脉',
  nervous: '神经系统',
  respiratory: '呼吸',
  digestive: '消化',
  urinary: '泌尿',
  lymphatic: '淋巴',
  endocrine: '内分泌',
  reproductive: '生殖',
  integumentary: '体表',
  connective: '结缔组织',
}

export const ATLAS_URL = '/assets/human-atlas/models/atlas.json'
