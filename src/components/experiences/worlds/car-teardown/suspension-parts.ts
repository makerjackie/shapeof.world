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
	count: number,
) {
	for (let i = 1; i <= count; i++)
		parts.push({
			id: `${id}-${i}`,
			system: 'chassis',
			name: `${name} ${i}`,
			nameEn: `${nameEn} ${i}`,
			function: fn,
			functionEn,
			material,
			materialEn,
			explode: [0, 0, 0],
			order: parts.length,
		})
}
add(
	'suspension-knuckle',
	'轮端转向节',
	'Wheel carrier',
	'把轮毂、摆臂和减振器连接起来，承受轮端载荷。',
	'Joins the hub, control arms and damper and carries wheel loads.',
	'铸铝',
	'Cast aluminum',
	4,
)
add(
	'suspension-ball-joint',
	'悬架球铰',
	'Suspension ball joint',
	'允许摆臂和轮端之间改变角度。',
	'Allows the control arm and wheel carrier to change their relative angle.',
	'硬化钢与橡胶防尘套',
	'Hardened steel and rubber dust boot',
	4,
)
add(
	'suspension-damper-rod',
	'减振器活塞杆',
	'Damper piston rod',
	'在固定长度的减振器筒内伸缩，把悬架运动传给内部阻尼活塞。',
	'Slides inside the fixed-length damper body and transfers suspension motion to its internal piston.',
	'镀铬钢',
	'Chrome-plated steel',
	4,
)
add(
	'suspension-spring-seat',
	'弹簧座',
	'Spring seat',
	'定位螺旋弹簧并把弹簧力传给悬架。',
	'Locates the coil spring and transfers its force into the suspension.',
	'冲压钢',
	'Stamped steel',
	8,
)

/** Existing springs, dampers, arms, hubs and subframes remain in the main registry. */
export const SUSPENSION_PARTS: readonly Part[] = parts
