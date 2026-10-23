import type {WorldExperience} from '../../types'

export default {
	id: 'car-teardown',
	publication: 'making',
	title: '一辆车，一层一层拆开',
	posterTitle: '一辆车，一层一层拆开',
	posterHook: '从完整轿车钻进七个系统，看四个气缸轮流做功。',
	posterSource: '程序化几何 · 四冲程运动学 · 虚构车辆',
	question: '一辆车里的零件怎样一起工作？',
	hook: '拆开一辆虚构的后驱轿车，走近正在运转的直列四缸发动机。',
	payoff:
		'曲轴每转两圈，四个缸按 1—3—4—2 的顺序各做功一次。画面转速经过慢放，尺寸和正时使用同一组代表值。',
	topicLabel: '汽车机构',
	translations: {
		en: {
			title: 'A car, taken apart layer by layer',
			posterTitle: 'A car, taken apart layer by layer',
			posterHook: 'Explore seven systems and watch four cylinders take turns making power.',
			posterSource: 'Procedural geometry · Four-stroke kinematics · Fictional vehicle',
			question: 'How do the parts of a car work together?',
			hook: 'Take apart a fictional rear-wheel-drive sedan and explore its running inline-four engine.',
			payoff:
				'Every two crankshaft turns, each cylinder fires once in the order 1—3—4—2. The animation runs in slow motion; dimensions and timing share one representative specification.',
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
		},
		{
			label: 'KHK · 齿轮尺寸计算',
			labelEn: 'KHK · Calculation of Gear Dimensions',
			url: 'https://khkgears.net/new/gear_knowledge/gear_technical_reference/calculation_gear_dimensions.html',
		},
	],
	fieldNotes: [
		{
			label: '模型边界',
			labelEn: 'Model limits',
			body: '虚构的 2.0 升前置后驱轿车，不对应任何品牌。运动学使用精确曲柄滑块和固定气门正时；点火提前是示意曲线。五挡变速箱展示常啮合与换挡；同步器转速匹配为运动学示意。转向使用理想阿克曼并展示四轮轮速与差速器。制动按踏板力计算液压和摩擦，ABS 为 1 g 附着限幅示意。悬架用线性两自由度四分之一车模型，不计侧倾和轮胎离地。',
			bodyEn:
				'A fictional 2.0-liter front-engine, rear-wheel-drive sedan with no brand affiliation. Exact slider-crank kinematics and fixed valve timing; ignition advance is illustrative. The five-speed gearbox demonstrates constant mesh and shifts with idealized synchronizer speed matching. Ideal Ackermann steering drives four wheel speeds and an open differential. Braking derives hydraulic pressure and friction from pedal force; ABS is illustrated as a 1 g adhesion cap. Suspension uses a linear two-degree-of-freedom quarter-car model without roll or tyre lift-off.',
		},
	],
	provenance: {origin: 'human-led'},
	presentation: 'full-bleed',
	transferBudgetMb: 3,
	fallback: 'poster',
} satisfies WorldExperience
