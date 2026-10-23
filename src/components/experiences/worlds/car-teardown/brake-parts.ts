import type {Part} from './parts'

const parts: Part[] = []
function add(
	id: string,
	name: string,
	nameEn: string,
	fn: string,
	functionEn: string,
	material: string,
	materialEn: string,
	count = 1,
) {
	for (let i = 1; i <= count; i++)
		parts.push({
			id: count === 1 ? id : `${id}-${i}`,
			system: 'brakes',
			name: count === 1 ? name : `${name} ${i}`,
			nameEn: count === 1 ? nameEn : `${nameEn} ${i}`,
			function: fn,
			functionEn,
			material,
			materialEn,
			explode: [0, 0, 0],
			order: parts.length,
		})
}
add(
	'vacuum-booster',
	'真空助力器',
	'Vacuum booster',
	'利用压差放大踏板推力。',
	'Uses a pressure differential to amplify pedal force.',
	'钢与橡胶膜片',
	'Steel and rubber diaphragm',
)
add(
	'brake-pedal',
	'制动踏板',
	'Brake pedal',
	'以 3.5:1 的杠杆比把脚力传向助力器。',
	'Transfers foot force to the booster at a 3.5:1 lever ratio.',
	'钢与橡胶',
	'Steel and rubber',
)
add(
	'brake-reservoir',
	'制动液储液罐',
	'Brake fluid reservoir',
	'为总泵补充制动液。',
	'Supplies brake fluid to the master cylinder.',
	'半透明聚合物',
	'Translucent polymer',
)
add(
	'abs-pump',
	'ABS 液压单元',
	'ABS hydraulic unit',
	'调节轮缸压力；本模型以附着限幅表示介入。',
	'Modulates wheel pressure; this model represents intervention as an adhesion limit.',
	'铝、铜与钢',
	'Aluminum, copper and steel',
)
add(
	'brake-master-line',
	'总泵压力管',
	'Master pressure line',
	'连接总泵和 ABS 液压单元。',
	'Connects the master cylinder to the ABS hydraulic unit.',
	'镀层钢管',
	'Coated steel tubing',
)
add(
	'caliper-piston',
	'卡钳活塞',
	'Caliper piston',
	'压力乘活塞面积得到推向内片的力。',
	'Pressure times piston area gives the force on the inner pad.',
	'镀层钢',
	'Coated steel',
	4,
)
add(
	'caliper-seal',
	'活塞密封圈',
	'Piston seal',
	'密封液压腔并在松开时帮助活塞回位。',
	'Seals the hydraulic chamber and helps retract the piston after release.',
	'耐制动液橡胶',
	'Brake-fluid-resistant rubber',
	4,
)
add(
	'brake-inner-pad',
	'内侧刹车片',
	'Inner brake pad',
	'由活塞推出并摩擦盘的内侧。',
	'The piston pushes this pad against the inner disc face.',
	'摩擦复合材料与钢背板',
	'Friction composite and steel backing',
	4,
)
add(
	'brake-outer-pad',
	'外侧刹车片',
	'Outer brake pad',
	'由浮动钳体反向滑动拉向盘的外侧。',
	'The sliding caliper body pulls this pad against the outer disc face.',
	'摩擦复合材料与钢背板',
	'Friction composite and steel backing',
	4,
)
add(
	'brake-guide-pin',
	'卡钳导向销',
	'Caliper guide pin',
	'让钳体沿盘轴线自由滑动。',
	'Lets the caliper body slide along the disc axis.',
	'硬化钢',
	'Hardened steel',
	8,
)
add(
	'caliper-bracket',
	'卡钳固定支架',
	'Caliper carrier',
	'把刹车片与导向销定位在转向节上。',
	'Locates the brake pads and guide pins on the steering knuckle.',
	'球墨铸铁',
	'Ductile iron',
	4,
)
add(
	'brake-line',
	'轮端制动管路',
	'Wheel brake line',
	'把同一管路压力传到对应车轮。',
	'Carries line pressure to the corresponding wheel.',
	'镀层钢管与增强软管',
	'Coated steel tubing and reinforced hose',
	4,
)

/** Local order is rebased when the main registry appends these rows. */
export const BRAKE_PARTS: readonly Part[] = parts
