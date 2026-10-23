import type {Part, SystemId} from './parts'
const rows: Part[] = []
function add(
	system: SystemId,
	id: string,
	name: string,
	nameEn: string,
	fn: string,
	fnEn: string,
	material = '合金钢',
	materialEn = 'Alloy steel',
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
			explode: [0, 0, 0],
			order: rows.length,
		})
}
add(
	'steering',
	'steering-intermediate-shaft',
	'转向中间轴',
	'Intermediate steering shaft',
	'跨过发动机舱，把方向盘输入送到下转向柱。',
	'Carries steering input through the engine bay to the lower column.',
)
add(
	'steering',
	'steering-lower-shaft',
	'下转向柱',
	'Lower steering shaft',
	'连接第二个万向节和转向小齿轮。',
	'Connects the second universal joint to the rack pinion.',
)
add(
	'steering',
	'steering-universal',
	'转向万向节',
	'Steering universal joint',
	'让转动经过倾斜的轴线；成对等角布置抵消转速波动。',
	'Transmits rotation across angled axes; equal-angle pairs cancel speed fluctuation.',
	'合金钢',
	'Alloy steel',
	2,
)
add(
	'steering',
	'steering-pinion',
	'转向小齿轮',
	'Steering pinion',
	'12 齿小齿轮把方向盘转角变成齿条行程。',
	'The 12-tooth pinion converts steering rotation into rack travel.',
)
add(
	'steering',
	'steering-rack-bar',
	'转向齿条',
	'Rack bar',
	'沿横向平移，通过横拉杆改变前轮方向。',
	'Translates laterally to steer the front wheels through tie rods.',
)
add(
	'steering',
	'steering-rack-boot',
	'齿条防尘套',
	'Rack gaiter',
	'保护齿条端部球铰，阻止尘土进入。',
	'Protects the rack-end ball joint from dust.',
	'橡胶',
	'Rubber',
	2,
)
add(
	'drivetrain',
	'differential-housing',
	'后桥壳',
	'Rear-axle housing',
	'支承主减速器和差速器，并容纳润滑油。',
	'Supports the final drive and differential and contains lubricant.',
	'铸铝',
	'Cast aluminum',
)
add(
	'drivetrain',
	'differential-carrier',
	'差速器壳',
	'Differential carrier',
	'随齿圈公转，并带着行星齿轮轴一起转。',
	'Rotates with the ring gear and carries the planet shaft.',
	'球墨铸铁',
	'Ductile iron',
)
add(
	'drivetrain',
	'differential-cross-pin',
	'行星齿轮轴',
	'Differential cross pin',
	'支承两个行星齿轮，轴本身随差速器壳公转。',
	'Supports the two planet gears and orbits with the carrier.',
)
add(
	'drivetrain',
	'differential-side-gear',
	'半轴齿轮',
	'Differential side gear',
	'16 齿锥齿轮分别带动左右半轴。',
	'Each 16-tooth bevel gear drives one rear half shaft.',
	'合金钢',
	'Alloy steel',
	2,
)
add(
	'drivetrain',
	'differential-planet',
	'差速行星齿轮',
	'Differential planet gear',
	'10 齿行星轮在转弯时自转，让左右轮速产生差值。',
	'The 10-tooth planet spins in a turn to allow unequal rear-wheel speeds.',
	'合金钢',
	'Alloy steel',
	2,
)
export const STEERING_PARTS = rows
