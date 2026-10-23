import {VEHICLE_SPEC as S} from './vehicle-spec'

export type SystemId = 'body' | 'powertrain' | 'drivetrain' | 'chassis' | 'steering' | 'brakes' | 'electrical'
export type Point3 = [number, number, number]
export const SYSTEMS: {
	id: SystemId
	name: string
	nameEn: string
	anchor: Point3
	direction: 'left' | 'right'
}[] = [
	{id: 'body', name: '车身', nameEn: 'Body', anchor: [-0.5, 1.2, 0.75], direction: 'left'},
	{id: 'electrical', name: '电气', nameEn: 'Electrical', anchor: [-0.8, 0.58, 0.59], direction: 'left'},
	{id: 'powertrain', name: '动力', nameEn: 'Powertrain', anchor: [1.2, 0.6, 0], direction: 'right'},
	{id: 'steering', name: '转向', nameEn: 'Steering', anchor: [1.3, 0.28, -0.1], direction: 'right'},
	{id: 'drivetrain', name: '传动', nameEn: 'Drivetrain', anchor: [-0.4, 0.36, 0], direction: 'left'},
	{
		id: 'chassis',
		name: '底盘悬架',
		nameEn: 'Chassis & suspension',
		anchor: [-1.425, 0.55, 0.7],
		direction: 'left',
	},
	{id: 'brakes', name: '制动', nameEn: 'Brakes', anchor: [1.425, 0.317, 1.075], direction: 'right'},
]
export type Part = {
	id: string
	system: SystemId
	name: string
	nameEn: string
	function: string
	functionEn: string
	material: string
	materialEn: string
	explode: Point3
	order: number
}
const rows: Part[] = []
function part(
	system: SystemId,
	id: string,
	name: string,
	nameEn: string,
	fn: string,
	fnEn: string,
	material = '钢',
	materialEn = 'Steel',
	count = 1,
) {
	for (let i = 0; i < count; i++)
		rows.push({
			id: count === 1 ? id : `${id}-${i + 1}`,
			system,
			name: count === 1 ? name : `${name} ${i + 1}`,
			nameEn: count === 1 ? nameEn : `${nameEn} ${i + 1}`,
			function: fn,
			functionEn: fnEn,
			material,
			materialEn,
			explode: [0, 0.12 + i * 0.015, 0],
			order: rows.length,
		})
}
part(
	'body',
	'body-shell',
	'车身外壳',
	'Body shell',
	'围合乘员舱，形成空气动力学外形。',
	'Encloses the cabin and shapes airflow.',
	'涂装钢',
	'Painted steel',
)
part(
	'body',
	'roof',
	'车顶和立柱',
	'Roof and pillars',
	'支撑乘员舱的顶部。',
	'Supports the upper cabin.',
	'涂装钢',
	'Painted steel',
)
part(
	'body',
	'body-floor',
	'乘员舱地板',
	'Cabin floor',
	'隔开乘员舱与底部机构。',
	'Separates the cabin from the underbody.',
	'钢与地毯',
	'Steel and carpet',
)
part(
	'body',
	'cabin-glazing',
	'乘员舱玻璃总成',
	'Cabin glazing',
	'隔开气流，保留视野。',
	'Keeps airflow outside while preserving visibility.',
	'玻璃',
	'Glass',
)
part(
	'body',
	'seat-rear',
	'三座后排',
	'Three-place rear bench',
	'承托三位后排乘员。',
	'Supports three rear-seat occupants.',
	'织物与泡棉',
	'Fabric and foam',
)
for (const side of ['left', 'right']) {
	const zh = side === 'left' ? '左' : '右'
	part(
		'body',
		`seat-front-${side}`,
		`${zh}前座椅`,
		`${side === 'left' ? 'Left' : 'Right'} front seat`,
		'承托乘员。',
		'Supports an occupant.',
		'织物与泡棉',
		'Fabric and foam',
	)
	part(
		'body',
		`headlight-${side}`,
		`${zh}前灯`,
		`${side === 'left' ? 'Left' : 'Right'} headlight`,
		'照亮前方并标记车辆。',
		'Illuminates the road and marks the vehicle.',
		'塑料与 LED',
		'Polymer and LEDs',
	)
	part(
		'body',
		`taillight-${side}`,
		`${zh}尾灯`,
		`${side === 'left' ? 'Left' : 'Right'} tail light`,
		'向后方标示车辆。',
		'Marks the car to traffic behind.',
		'塑料与 LED',
		'Polymer and LEDs',
	)
	part(
		'body',
		`mirror-${side}`,
		`${zh}后视镜`,
		`${side === 'left' ? 'Left' : 'Right'} mirror`,
		'扩大驾驶员的后方视野。',
		'Extends the driver’s rearward view.',
		'玻璃与塑料',
		'Glass and polymer',
	)
	for (const end of ['front', 'rear'])
		part(
			'body',
			`door-${end}-${side}`,
			`${zh}${end === 'front' ? '前' : '后'}车门`,
			`${side === 'left' ? 'Left' : 'Right'} ${end} door`,
			'供乘员进出，关闭后围合座舱。',
			'Provides cabin access and closes the passenger compartment.',
			'涂装钢',
			'Painted steel',
		)
}
for (const end of ['front', 'rear'])
	part(
		'body',
		`bumper-${end}`,
		`${end === 'front' ? '前' : '后'}保险杠`,
		`${end === 'front' ? 'Front' : 'Rear'} bumper`,
		'覆盖缓冲结构，整合车身端部。',
		'Covers the impact structure and completes the body end.',
		'涂装塑料',
		'Painted polymer',
	)
part(
	'body',
	'dashboard',
	'仪表台',
	'Dashboard',
	'容纳车内仪表和通风管路。',
	'Houses instruments and ventilation.',
	'塑料',
	'Polymer',
)
part(
	'powertrain',
	'engine-block',
	'缸体',
	'Cylinder block',
	'缸孔引导活塞，轴承支撑曲轴。',
	'Bores guide pistons and bearings support the crank.',
	'铸铝',
	'Cast aluminum',
)
part(
	'powertrain',
	'cylinder-head',
	'缸盖',
	'Cylinder head',
	'封住气缸，容纳气门。',
	'Closes the cylinders and houses the valves.',
	'铸铝',
	'Cast aluminum',
)
part(
	'powertrain',
	'cam-cover',
	'凸轮轴盖',
	'Cam cover',
	'封住气门机构并容纳润滑油。',
	'Encloses the valve mechanism and contains oil.',
	'聚合物',
	'Polymer',
)
part(
	'powertrain',
	'main-bearing',
	'主轴承盖',
	'Main bearing cap',
	'把曲轴主轴颈约束在轴线上。',
	'Holds the main journal on the crank axis.',
	'铸铝',
	'Cast aluminum',
	5,
)
part(
	'powertrain',
	'crankshaft',
	'曲轴',
	'Crankshaft',
	'把活塞的往复运动变为转动。',
	'Converts reciprocating motion to rotation.',
)
part(
	'powertrain',
	'piston',
	'活塞',
	'Piston',
	'承受燃烧压力，推动连杆。',
	'Receives combustion pressure and drives the rod.',
	'铝合金',
	'Aluminum alloy',
	4,
)
part(
	'powertrain',
	'piston-rings',
	'活塞环组',
	'Piston ring set',
	'密封燃气并控制油膜。',
	'Seals gases and controls the oil film.',
	'钢',
	'Steel',
	4,
)
part(
	'powertrain',
	'piston-pin',
	'活塞销',
	'Piston pin',
	'连接活塞和连杆小头。',
	'Joins the piston to the small end.',
	'钢',
	'Steel',
	4,
)
part(
	'powertrain',
	'connecting-rod',
	'连杆',
	'Connecting rod',
	'把活塞力传给曲轴。',
	'Transfers piston force to the crank.',
	'钢',
	'Steel',
	4,
)
for (const valve of ['intake', 'exhaust']) {
	const zh = valve === 'intake' ? '进气' : '排气'
	const en = valve === 'intake' ? 'Intake' : 'Exhaust'
	part(
		'powertrain',
		`${valve}-camshaft`,
		`${zh}凸轮轴`,
		`${en} camshaft`,
		'按正时曲线压下气门。',
		'Opens valves according to the timing curve.',
	)
	for (let cylinder = 1; cylinder <= S.engine.cylinders; cylinder++) {
		for (let valveIndex = 1; valveIndex <= 2; valveIndex++) {
			const suffix = `${valve}-${cylinder}-${valveIndex}`
			part(
				'powertrain',
				`valve-${suffix}`,
				`${cylinder} 缸${zh}门 ${valveIndex}`,
				`Cylinder ${cylinder} ${valve} valve ${valveIndex}`,
				'控制气缸的进排气通道。',
				'Controls gas flow into or out of the cylinder.',
			)
			part(
				'powertrain',
				`valve-spring-${suffix}`,
				`${cylinder} 缸${zh}门弹簧 ${valveIndex}`,
				`Cylinder ${cylinder} ${valve} spring ${valveIndex}`,
				'让气门回到关闭位置。',
				'Returns the valve to its seat.',
				'弹簧钢',
				'Spring steel',
			)
		}
	}
}
part(
	'powertrain',
	'spark-plug',
	'火花塞',
	'Spark plug',
	'在压缩末期点燃混合气。',
	'Ignites the mixture near the end of compression.',
	'陶瓷与钢',
	'Ceramic and steel',
	4,
)
part(
	'powertrain',
	'ignition-coil',
	'点火线圈',
	'Ignition coil',
	'把低电压变为点火高电压。',
	'Raises battery voltage for ignition.',
	'铜与塑料',
	'Copper and polymer',
	4,
)
part(
	'powertrain',
	'timing-chain',
	'正时链',
	'Timing chain',
	'以 2:1 关系连接曲轴和凸轮轴。',
	'Links the crankshaft and cams at a 2:1 ratio.',
)
for (const shaft of ['crank', 'intake', 'exhaust'])
	part(
		'powertrain',
		`${shaft}-sprocket`,
		`${shaft === 'crank' ? '曲轴' : shaft === 'intake' ? '进气凸轮轴' : '排气凸轮轴'}链轮`,
		`${shaft === 'crank' ? 'Crankshaft' : shaft === 'intake' ? 'Intake cam' : 'Exhaust cam'} sprocket`,
		'引导正时链，保持配气相位。',
		'Guides the timing chain and maintains valve phase.',
	)
part(
	'powertrain',
	'oil-pan',
	'油底壳',
	'Oil sump',
	'储存回流的润滑油。',
	'Collects returning lubricating oil.',
	'铸铝',
	'Cast aluminum',
)
part(
	'powertrain',
	'flywheel',
	'飞轮',
	'Flywheel',
	'储存转动能量，平滑各缸的动力脉冲。',
	'Stores rotational energy and smooths firing pulses.',
)
part(
	'powertrain',
	'intake-manifold',
	'进气歧管',
	'Intake manifold',
	'把进入的空气分配给四个气缸。',
	'Distributes incoming air to four cylinders.',
	'聚合物',
	'Polymer',
)
part(
	'powertrain',
	'exhaust-manifold',
	'排气歧管',
	'Exhaust manifold',
	'汇集四个气缸排出的废气。',
	'Collects exhaust from all four cylinders.',
	'不锈钢',
	'Stainless steel',
)
part(
	'powertrain',
	'throttle-body',
	'节气门体',
	'Throttle body',
	'调节进入发动机的空气量。',
	'Meters airflow into the engine.',
	'铝合金',
	'Aluminum alloy',
)
part(
	'powertrain',
	'radiator',
	'散热器与风扇',
	'Radiator and fan',
	'把冷却液中的热量传给空气。',
	'Transfers coolant heat to the air.',
	'铝与塑料',
	'Aluminum and polymer',
)
part(
	'powertrain',
	'fuel-tank',
	'燃油箱',
	'Fuel tank',
	'储存供发动机使用的燃油。',
	'Stores fuel for the engine.',
	'塑料',
	'Polymer',
)
part(
	'powertrain',
	'exhaust',
	'排气管与消声器',
	'Exhaust and muffler',
	'导出废气，减弱压力脉动。',
	'Routes exhaust and reduces pressure pulses.',
	'不锈钢',
	'Stainless steel',
)
part(
	'drivetrain',
	'gearbox',
	'变速箱',
	'Transmission',
	'用不同传动比连接发动机和车轮。',
	'Connects engine and wheels through selectable ratios.',
	'铸铝',
	'Cast aluminum',
)
part(
	'drivetrain',
	'clutch',
	'离合器',
	'Clutch',
	'接合或断开发动机与传动轴系。',
	'Connects or disconnects engine and driveline.',
)
part(
	'drivetrain',
	'driveshaft',
	'传动轴',
	'Propeller shaft',
	'把转矩送到后桥。',
	'Carries torque to the rear axle.',
)
part(
	'drivetrain',
	'differential',
	'差速器',
	'Differential',
	'允许左右后轮以不同速度转动。',
	'Allows the rear wheels to turn at different speeds.',
)
part(
	'drivetrain',
	'halfshaft',
	'半轴',
	'Half shaft',
	'把差速器输出传到车轮。',
	'Carries differential output to a wheel.',
	'钢',
	'Steel',
	2,
)
part(
	'chassis',
	'subframe',
	'副车架',
	'Subframe',
	'把悬架载荷传给车身。',
	'Transfers suspension loads to the body.',
	'钢',
	'Steel',
	2,
)
part(
	'chassis',
	'control-arm',
	'下摆臂',
	'Lower control arm',
	'约束前轮的运动路径。',
	'Locates the front wheel.',
	'钢',
	'Steel',
	2,
)
part(
	'chassis',
	'rear-link',
	'后悬连杆',
	'Rear suspension link',
	'共同约束后轮姿态。',
	'Locates and orients the rear wheel.',
	'钢',
	'Steel',
	10,
)
part(
	'chassis',
	'damper',
	'减振器',
	'Damper',
	'耗散悬架振动能量。',
	'Dissipates suspension oscillations.',
	'钢',
	'Steel',
	4,
)
part(
	'chassis',
	'spring',
	'悬架弹簧',
	'Suspension spring',
	'支撑车重并储存弹性能。',
	'Supports vehicle weight and stores elastic energy.',
	'弹簧钢',
	'Spring steel',
	4,
)
part(
	'chassis',
	'hub',
	'轮毂',
	'Hub',
	'支撑车轮并传递载荷。',
	'Supports the wheel and transfers loads.',
	'钢',
	'Steel',
	4,
)
for (const end of ['front', 'rear'])
	for (const side of ['left', 'right']) {
		const zh = `${side === 'left' ? '左' : '右'}${end === 'front' ? '前' : '后'}`
		const en = `${side === 'left' ? 'Left' : 'Right'} ${end}`
		part(
			'chassis',
			`tyre-${end}-${side}`,
			`${zh}轮胎`,
			`${en} tire`,
			'通过接地面传递驱动、制动和转向力。',
			'Transfers drive, braking and cornering forces at the contact patch.',
			'橡胶',
			'Rubber',
		)
		part(
			'chassis',
			`rim-${end}-${side}`,
			`${zh}轮辋`,
			`${en} rim`,
			'支承轮胎，把载荷传给轮毂。',
			'Supports the tire and transfers loads to the hub.',
			'铝合金',
			'Aluminum alloy',
		)
	}
part(
	'steering',
	'steering-wheel',
	'方向盘',
	'Steering wheel',
	'输入驾驶员的转向意图。',
	'Receives the driver’s steering input.',
	'钢与聚合物',
	'Steel and polymer',
)
part(
	'steering',
	'steering-column',
	'转向柱',
	'Steering column',
	'把方向盘转角传到转向机。',
	'Transmits steering-wheel rotation.',
)
part(
	'steering',
	'steering-rack',
	'转向机',
	'Steering rack',
	'把转动变成横向位移。',
	'Converts rotation into lateral motion.',
)
part(
	'steering',
	'tie-rod',
	'横拉杆',
	'Tie rod',
	'把齿条运动传到转向节。',
	'Transfers rack motion to the knuckle.',
	'钢',
	'Steel',
	2,
)
part(
	'brakes',
	'disc',
	'刹车盘',
	'Brake disc',
	'把动能转变为摩擦热。',
	'Converts kinetic energy into frictional heat.',
	'铸铁',
	'Cast iron',
	4,
)
part(
	'brakes',
	'caliper',
	'浮动卡钳',
	'Floating caliper',
	'把两块刹车片压向盘面。',
	'Presses both pads against the disc.',
	'铸铝',
	'Cast aluminum',
	4,
)
part(
	'brakes',
	'master-cylinder',
	'总泵与真空助力器',
	'Master cylinder and booster',
	'放大踏板输入并建立液压。',
	'Amplifies pedal input and builds hydraulic pressure.',
	'铝与钢',
	'Aluminum and steel',
)
part(
	'brakes',
	'brake-lines',
	'制动管路',
	'Brake lines',
	'把液压传到四个车轮。',
	'Carries hydraulic pressure to all four wheels.',
)
part(
	'electrical',
	'battery',
	'12 V 蓄电池',
	'12 V battery',
	'供电并储存启动所需能量。',
	'Supplies power and stores starting energy.',
	'铅与塑料',
	'Lead and polymer',
)
part(
	'electrical',
	'ecu',
	'发动机电脑',
	'Engine ECU',
	'管理喷油和点火。',
	'Controls fuel injection and ignition.',
	'电子元件与铝',
	'Electronics and aluminum',
)
part(
	'electrical',
	'fuse-box',
	'保险丝盒',
	'Fuse box',
	'保护各个用电回路。',
	'Protects electrical circuits.',
	'塑料与铜',
	'Polymer and copper',
)
part(
	'electrical',
	'wiring-harness',
	'主线束',
	'Main wiring harness',
	'连接供电、传感器与执行器。',
	'Connects power, sensors, and actuators.',
	'铜与绝缘层',
	'Copper and insulation',
)
part(
	'electrical',
	'alternator',
	'发电机',
	'Alternator',
	'把发动机的机械能转化成电能。',
	'Converts engine rotation into electrical energy.',
	'铝与铜',
	'Aluminum and copper',
)
part(
	'electrical',
	'starter',
	'起动机',
	'Starter motor',
	'用电池能量带动发动机开始转动。',
	'Uses battery energy to crank the engine.',
	'钢与铜',
	'Steel and copper',
)
part(
	'electrical',
	'alternator-belt',
	'发电机皮带',
	'Alternator drive belt',
	'把曲轴的转动传给发电机。',
	'Transfers crank rotation to the alternator.',
	'纤维增强橡胶',
	'Fiber-reinforced rubber',
)
part(
	'electrical',
	'crank-pulley',
	'曲轴皮带轮',
	'Crankshaft pulley',
	'从曲轴取出附件驱动动力。',
	'Takes accessory-drive power from the crankshaft.',
)
part(
	'electrical',
	'alternator-pulley',
	'发电机皮带轮',
	'Alternator pulley',
	'让发电机以曲轴约 2.7 倍的转速运行。',
	'Turns the alternator at about 2.7 times crank speed.',
)
export const PARTS: readonly Part[] = rows
export const partCount = (system: SystemId) => PARTS.filter((p) => p.system === system).length

export function systemProgress(id: SystemId, amount: number): number {
	// Seven 80 ms starts within the 1.6 s action; scrubbing remains deterministic.
	const order = SYSTEMS.findIndex((system) => system.id === id)
	const start = (order * S.explosion.stagger) / S.explosion.duration
	const t = Math.min(1, Math.max(0, (amount - start) / (1 - start)))
	return t * t * (3 - 2 * t)
}

export function systemOffset(id: SystemId, amount: number): Point3 {
	const vector = id === 'brakes' ? [0, 0, 0] : S.explosion[id]
	return vector.map((value) => value * systemProgress(id, amount)) as Point3
}
