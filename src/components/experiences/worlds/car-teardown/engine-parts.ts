import { ENGINE_EXPLOSION, ENGINE_GEOMETRY as C, VEHICLE_SPEC } from './vehicle-spec'

const E = VEHICLE_SPEC.engine
const G = E.geometry
const centerX = E.cylinder1X - E.cylinderSpacing * 1.5
export type EnginePartId = keyof typeof ENGINE_EXPLOSION
export type EnginePoint = [number, number, number]
export type EngineText = { zh: string; en: string }
export interface EnginePart {
	id: EnginePartId
	name: EngineText
	description: EngineText
	material: EngineText
	count: number
	data: { label: EngineText; value: string }[]
	offset: readonly [number, number, number]
	anchor: EnginePoint
	partIds: string[]
}
const text = (zh: string, en: string): EngineText => ({ zh, en })
const numberIds = (prefix: string, count: number) =>
	Array.from({ length: count }, (_, i) => `${prefix}-${i + 1}`)
const valveIds = (prefix: string) =>
	['intake', 'exhaust'].flatMap((side) =>
		[1, 2, 3, 4].flatMap((cylinder) =>
			[1, 2].map((index) => `${prefix}-${side}-${cylinder}-${index}`),
		),
	)
const aluminum = text('铸铝合金', 'Cast aluminum')
const steel = text('机加工合金钢', 'Machined alloy steel')
const millimetres = (metres: number) => `${Number((metres * 1000).toFixed(3))} mm`
const part = (
	id: EnginePartId,
	name: EngineText,
	description: EngineText,
	material: EngineText,
	count: number,
	anchor: EnginePoint,
	partIds: string[],
	data: EnginePart['data'],
): EnginePart => ({
	id,
	name,
	description,
	material,
	count,
	anchor,
	partIds,
	data,
	offset: ENGINE_EXPLOSION[id],
})

/** UI anchors and mesh wrappers read the same offsets. All anchors are in the
 * vehicle frame; the scene adds its powertrain system offset after this. */
export const ENGINE_PARTS: readonly EnginePart[] = [
	part(
		'ignition-coils',
		text('点火线圈与火花塞', 'Ignition coils & spark plugs'),
		text(
			'线圈升高电压，火花塞按点火顺序跳火。',
			'Coils raise the voltage; plugs fire in cylinder order.',
		),
		text('铜、陶瓷与钢', 'Copper, ceramic and steel'),
		8,
		[E.cylinder1X, G.camY + G.coilHeight, 0],
		[...numberIds('ignition-coil', 4), ...numberIds('spark-plug', 4)],
		[{ label: text('点火顺序', 'Firing order'), value: '1 — 3 — 4 — 2' }],
	),
	part(
		'cam-cover',
		text('气门室盖', 'Cam cover'),
		text(
			'双拱壳体封住凸轮机构，中央留出火花塞井。',
			'The twin-arched shell seals the cams around four plug wells.',
		),
		text('铝合金与橡胶密封', 'Aluminum with rubber seals'),
		1,
		[centerX, C.coverValleyY + C.coverLobeHeight, 0],
		['cam-cover'],
		[
			{ label: text('盖体长度', 'Cover length'), value: millimetres(C.coverLength) },
			{
				label: text('火花塞井内径', 'Plug-well diameter'),
				value: millimetres(C.coverPlugWellRadius * 2),
			},
		],
	),
	part(
		'intake-camshaft',
		text('进气凸轮轴', 'Intake camshaft'),
		text(
			'八个凸轮按升程曲线推开进气门。',
			'Eight lobes open the intake valves with the prescribed lift law.',
		),
		steel,
		1,
		[centerX, G.camY, -G.camZ],
		['intake-camshaft'],
		[
			{ label: text('最大升程', 'Maximum lift'), value: '9.5 mm' },
			{ label: text('转速 / 曲轴', 'Speed / crankshaft'), value: '1 : 2' },
		],
	),
	part(
		'exhaust-camshaft',
		text('排气凸轮轴', 'Exhaust camshaft'),
		text(
			'八个凸轮在排气冲程前后开启排气门。',
			'Eight lobes open the exhaust valves around the exhaust stroke.',
		),
		steel,
		1,
		[centerX, G.camY, G.camZ],
		['exhaust-camshaft'],
		[
			{ label: text('最大升程', 'Maximum lift'), value: '9.0 mm' },
			{ label: text('持续角', 'Duration'), value: '240°' },
		],
	),
	part(
		'valve-springs',
		text('气门弹簧', 'Valve springs'),
		text(
			'弹簧让气门持续跟随凸轮并回到阀座。',
			'The springs keep the valves following their cams and returning to their seats.',
		),
		text('弹簧钢', 'Spring steel'),
		16,
		[centerX, G.camY - E.timing.camBaseRadius, G.camZ],
		valveIds('valve-spring'),
		[
			{ label: text('弹簧圈数', 'Spring turns'), value: String(G.valveSpringTurns) },
			{ label: text('线径', 'Wire diameter'), value: millimetres(G.valveSpringWire * 2) },
		],
	),
	part(
		'valves',
		text('进排气门', 'Intake & exhaust valves'),
		text(
			'每缸两进两排，控制气体进出。',
			'Two intake and two exhaust valves control each cylinder.',
		),
		text('耐热钢', 'Heat-resistant steel'),
		16,
		[centerX, G.valveSeatY + G.valveStemLength / 2, G.valveZOffset],
		valveIds('valve'),
		[{ label: text('气门重叠', 'Valve overlap'), value: '20°' }],
	),
	part(
		'cylinder-head',
		text('缸盖', 'Cylinder head'),
		text(
			'燃烧室、进排气道和凸轮轴座铸在同一壳体里。',
			'Combustion chambers, ports and cam bearings share one casting.',
		),
		aluminum,
		1,
		[centerX, G.deckY + G.headHeight / 2, G.headWidth / 2],
		['cylinder-head'],
		[{ label: text('结构', 'Layout'), value: 'DOHC · 16V' }],
	),
	part(
		'head-gasket',
		text('气缸垫', 'Head gasket'),
		text(
			'薄金属垫隔开燃烧室、水套和润滑油道。',
			'The thin gasket seals combustion, coolant and oil passages.',
		),
		text('多层钢片', 'Multi-layer steel'),
		1,
		[centerX, G.deckY, 0],
		['head-gasket'],
		[{ label: text('垫片厚度', 'Gasket thickness'), value: millimetres(C.gasketThickness) }],
	),
	part(
		'piston-assemblies',
		text('活塞连杆组', 'Piston & rod assemblies'),
		text(
			'活塞的直线运动通过连杆传给曲轴。',
			'The rods transmit each piston’s linear motion to the crankshaft.',
		),
		text('铝活塞与锻钢连杆', 'Aluminum pistons, forged steel rods'),
		E.cylinders,
		[centerX, E.crankY + E.rodLength, 0],
		[
			...numberIds('piston', 4),
			...numberIds('piston-rings', 4),
			...numberIds('piston-pin', 4),
			...numberIds('connecting-rod', 4),
		],
		[
			{ label: text('缸径 × 行程', 'Bore × stroke'), value: '86 × 86 mm' },
			{ label: text('连杆中心距', 'Rod length'), value: '145 mm' },
		],
	),
	part(
		'engine-block',
		text('缸体', 'Cylinder block'),
		text(
			'四个缸孔外是水套，下方裙部支撑五道主轴承。',
			'Coolant jackets surround four bores; the skirt supports five main bearings.',
		),
		aluminum,
		1,
		[centerX, G.blockBottom + E.bore / 2, G.blockWidth / 2],
		['engine-block'],
		[
			{ label: text('排量', 'Displacement'), value: '1,998 cc' },
			{ label: text('压缩比', 'Compression ratio'), value: '10.5 : 1' },
		],
	),
	part(
		'crankshaft',
		text('曲轴', 'Crankshaft'),
		text(
			'四个曲拐把连杆往复运动变成旋转。',
			'Four throws turn the rods’ reciprocating motion into rotation.',
		),
		text('锻造合金钢', 'Forged alloy steel'),
		1,
		[centerX, E.crankY, 0],
		['crankshaft'],
		[{ label: text('曲柄半径', 'Crank radius'), value: '43 mm' }],
	),
	part(
		'main-bearing-caps',
		text('主轴承盖', 'Main bearing caps'),
		text(
			'五个轴承盖与缸体隔板一起夹住主轴颈。',
			'Five caps close the block’s bearing saddles around the main journals.',
		),
		aluminum,
		5,
		[centerX, E.crankY - G.crankMainRadius, 0],
		numberIds('main-bearing', 5),
		[
			{
				label: text('主轴颈直径', 'Main-journal diameter'),
				value: millimetres(G.crankMainRadius * 2),
			},
		],
	),
	part(
		'oil-pan',
		text('油底壳', 'Oil pan'),
		text('下方的深集油槽储存回流润滑油。', 'The deep sump collects returning lubricating oil.'),
		aluminum,
		1,
		[centerX + C.sumpOffsetX, C.skirtBottomY - C.sumpDepth, 0],
		['oil-pan'],
		[{ label: text('集油槽深度', 'Sump depth'), value: millimetres(C.sumpDepth) }],
	),
	part(
		'intake-manifold',
		text('进气歧管与节气门', 'Intake manifold & throttle'),
		text(
			'节气门后的稳压腔通过四根弯管分配空气。',
			'The plenum distributes air from the throttle through four curved runners.',
		),
		text('增强塑料与铝合金', 'Reinforced polymer and aluminum'),
		2,
		[centerX, C.intakePlenumY, C.intakePlenumZ],
		['intake-manifold', 'throttle-body'],
		[
			{
				label: text('进气支管内径', 'Runner inside diameter'),
				value: millimetres((C.intakeRunnerRadius - C.intakeRunnerWall) * 2),
			},
			{ label: text('节气门直径', 'Throttle diameter'), value: millimetres(C.throttleRadius * 2) },
		],
	),
	part(
		'exhaust-manifold',
		text('四合一排气歧管', 'Four-into-one exhaust manifold'),
		text(
			'四根独立排气管汇入同一个集气口。',
			'Four separate exhaust runners merge into one collector.',
		),
		text('耐热铸钢', 'Heat-resistant cast steel'),
		1,
		[C.exhaustCollectorX, C.exhaustCollectorY, C.exhaustCollectorZ],
		['exhaust-manifold'],
		[
			{
				label: text('排气支管内径', 'Runner inside diameter'),
				value: millimetres((C.exhaustRunnerRadius - C.exhaustRunnerWall) * 2),
			},
			{ label: text('汇集方式', 'Collector layout'), value: `${E.cylinders} → 1` },
		],
	),
	part(
		'timing-cover',
		text('正时罩', 'Timing cover'),
		text('贴着链轮轮廓的薄壳封住正时链。', 'The contoured front shell seals the timing chain.'),
		aluminum,
		1,
		[G.timingFrontX + C.timingCoverDepth, (G.camY + E.crankY) / 2, 0],
		['timing-cover'],
		[
			{
				label: text('前盖壁厚', 'Front-cover wall'),
				value: millimetres(C.timingCoverFaceThickness),
			},
		],
	),
	part(
		'timing-chain',
		text('正时链与链轮', 'Timing chain & sprockets'),
		text(
			'20 齿曲轴轮带动两个 40 齿凸轮轴轮。',
			'A 20-tooth crank sprocket drives two 40-tooth cam sprockets.',
		),
		steel,
		4,
		[G.timingFrontX, G.camY, 0],
		['timing-chain', 'crank-sprocket', 'intake-sprocket', 'exhaust-sprocket'],
		[{ label: text('齿数', 'Teeth'), value: '20 : 40' }],
	),
	part(
		'flywheel',
		text('飞轮', 'Flywheel'),
		text(
			'转动惯量平滑每次做功之间的转速起伏。',
			'Rotational inertia smooths speed changes between power strokes.',
		),
		steel,
		1,
		[centerX - G.blockLength / 2 - G.shaftEnd / 2, E.crankY, 0],
		['flywheel'],
		[
			{ label: text('外径', 'Outside diameter'), value: millimetres(G.flywheelRadius * 2) },
			{ label: text('厚度', 'Thickness'), value: millimetres(G.flywheelThickness) },
		],
	),
]

export function enginePartOffset(id: string, amount: number): EnginePoint {
	const offset = ENGINE_EXPLOSION[id as EnginePartId]
	const t = Math.max(0, Math.min(1, amount))
	return offset ? (offset.map((value) => value * t) as EnginePoint) : [0, 0, 0]
}

export function enginePartAnchor(id: string, amount: number): EnginePoint {
	const part = ENGINE_PARTS.find((candidate) => candidate.id === id)
	if (!part) return [centerX, E.crankY, 0]
	const offset = enginePartOffset(id, amount)
	return part.anchor.map((value, index) => value + offset[index]) as EnginePoint
}
