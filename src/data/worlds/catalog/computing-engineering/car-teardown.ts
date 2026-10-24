import type {WorldExperience} from '../../types'

export default {
	id: 'car-teardown',
	publication: 'making',
	title: '一辆车，一层一层拆开',
	poster: '/assets/posters/car-teardown.webp',
	posterMobile: '/assets/posters/mobile/car-teardown.webp',
	posterDesktop: '/assets/posters/desktop/car-teardown.webp',
	posterTitle: '一辆车，一层一层拆开',
	posterHook: '车身升起，线束浮在中间，发动机、传动和底盘留在下面。再拆到零件，机构还在动。',
	posterSource: '原创程序化模型 · 虚构车辆代表值 · 理想机构模型',
	posterPosition: '50% 50%',
	question: '一辆车里的零件怎样一起工作？',
	hook: '把一辆后驱轿车拆成七个系统，再拆到零件。看四个缸轮流做功、齿轮换挡、车轮转向、卡钳夹紧和悬架过坎。',
	payoff:
		'换挡是把一个常啮合齿轮锁到输出轴上；转弯时，差速器让外侧轮转得更快。拆下覆盖件，还能看到保护乘员舱和负责吸能的不同钢材。',
	topicLabel: '汽车机构',
	translations: {
		en: {
			title: 'A car, taken apart layer by layer',
			posterTitle: 'A car, taken apart layer by layer',
			posterHook: 'The body lifts away, the wiring floats in between, and the engine, drivetrain and chassis stay below. Take them down to parts and the mechanisms keep moving.',
			posterSource: 'Original procedural model · Fictional vehicle values · Ideal mechanisms',
			question: 'How do the parts of a car work together?',
			hook: 'Split a rear-wheel-drive sedan into seven systems, then into parts. Watch cylinders fire, gears shift, wheels steer, brakes clamp and suspension cross a bump.',
			payoff:
				'A shift locks one constantly meshing gear to the output shaft. In a turn, the differential lets the outer wheel spin faster. Removing the panels reveals steels that protect the cabin and others assigned to absorb impact.',
			topicLabel: 'Automotive mechanisms',
		},
	},
	primaryCategoryId: 'machines-mechanisms',
	runtime: 'scene-3d',
	difficulty: 'advanced',
	lane: 'structure',
	renderer: 'car-teardown',
	experiencePolicy: {entryMode: 'direct', shellMode: 'minimal'},
	duration: 600,
	evidence: 'modeled',
	accent: '#9fb4c8',
	related: [],
	sources: [
		{
			label: 'Heywood · 内燃机原理',
			labelEn: 'Heywood · Internal Combustion Engine Fundamentals',
			url: 'https://www.mheducation.com/highered/mhp/product/internal-combustion-engine-fundamentals-2e.html',
			note: '四冲程机构的原理参考；本车尺寸和正时为虚构代表值。',
			noteEn:
				'Background on four-stroke mechanisms; dimensions and timing are fictional representative values.',
		},
		{
			label: 'Naunheimer 等 · 汽车变速器',
			labelEn: 'Naunheimer et al. · Automotive Transmissions',
			url: 'https://link.springer.com/book/10.1007/978-3-642-16214-5',
			note: '三轴变速器和换挡原理参考；齿数组合为本作品设计值。',
			noteEn: 'Background on three-shaft gearboxes and shifts; the tooth counts are chosen for this model.',
		},
		{
			label: 'KHK · 齿轮尺寸计算',
			labelEn: 'KHK · Calculation of Gear Dimensions',
			url: 'https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html',
			note: '渐开线与斜齿轮法向、端面参数关系。',
			noteEn: 'Involute geometry and the relation between normal and transverse helical-gear parameters.',
		},
		{
			label: 'Gillespie · 汽车动力学基础',
			labelEn: 'Gillespie · Fundamentals of Vehicle Dynamics',
			url: 'https://saemobilus.sae.org/books/fundamentals-vehicle-dynamics-r-114',
			note: '转向与悬架的背景读物；本作品使用理想阿克曼和线性四分之一车模型。',
			noteEn: 'Background reading on steering and suspension. This world uses ideal Ackermann geometry and a linear quarter-car model.',
		},
		{
			label: 'Limpert · 制动设计与安全',
			labelEn: 'Limpert · Brake Design and Safety',
			url: 'https://saemobilus.sae.org/books/brake-design-safety-third-edition-r-398',
			note: '液压制动与制动力矩的背景读物；踏板力、缸径和摩擦系数为代表值。',
			noteEn: 'Background reading on hydraulic brakes and brake torque. Pedal force, bore sizes and friction are representative choices.',
		},
		{
			label: '轮胎尺寸标记说明',
			labelEn: 'Tyre size markings explained',
			url: 'https://www.michelin.co.uk/auto/advice/tyre-basics/tyre-markings-explained',
			note: '235/40 R19 的宽度、扁平比和轮辋直径读法；滚动半径另取 0.335 m。',
			noteEn: 'How width, aspect ratio and rim diameter are encoded in 235/40 R19. Rolling radius is modeled as 0.335 m.',
		},
		{
			label: 'WorldAutoSteel · 热成形钢概览',
			labelEn: 'WorldAutoSteel · Press-hardened steels overview',
			url: 'https://ahssinsights.org/forming/press-hardened-steels/phs-and-pqs-overview/',
			note: '约 1,500 MPa 热成形钢的强度背景；白车身的分区和 340–800 MPa 区间为示意设计。',
			noteEn: 'Background for the roughly 1,500 MPa press-hardened steel class. Body zoning and the 340–800 MPa band are illustrative design choices.',
		},
	],
	fieldNotes: [
		{
			label: '这是什么',
			labelEn: 'What this is',
			body: '一辆虚构的 2.0 升前置后驱轿车，全部几何由代码生成，不对应任何品牌。尺寸、齿数、正时和材料强度采用一组代表值。七个系统都能拆到零件；真实转速与画面慢放分开显示。',
			bodyEn: 'A fictional 2.0-liter front-engine, rear-wheel-drive sedan, generated entirely in code. It represents no brand. Dimensions, tooth counts, timing and steel strengths are selected reference values. All seven systems separate into parts. Physical RPM and screen slowdown are displayed separately.',
		},
		{
			label: '模型边界',
			labelEn: 'Model limits',
			body: '发动机使用精确曲柄滑块、固定气门正时和示意点火提前；不计算燃烧压力。同步器转速匹配为运动学示意，锥齿轮不是生产用齿面。转向为理想阿克曼，不计轮胎侧偏。制动采用固定摩擦和 1 g 附着上限，间隙放大 20 倍；不模拟 ABS 控制器。悬架为线性两自由度四分之一车，不计侧倾和轮胎离地。白车身颜色表示材料类别，不是碰撞应力；拆解路径是展示排布，不是维修步骤。',
			bodyEn:
				'The engine uses exact slider-crank motion, fixed valve timing and illustrative spark advance, without combustion-pressure calculations. Synchronizers use prescribed speed matching; bevel gears are teaching geometry. Steering is ideal Ackermann without tyre slip angles. Brakes use fixed friction, a 1 g grip cap and gaps enlarged 20 times, not an ABS controller. Suspension is a linear two-degree-of-freedom quarter-car model without roll or tyre lift-off. Body colors identify steel classes, not crash stress. Exploded paths are display layouts, not service instructions.',
		},
	],
	provenance: {origin: 'human-led'},
	presentation: 'full-bleed',
	// Procedural geometry; budget covers code and poster fallback, with no model downloads.
	transferBudgetMb: 3,
	fallback: 'poster',
} satisfies WorldExperience
