import {useMemo} from 'react'
import {GuideTour, type GuideStep} from '~/components/experiences/GuideTour'
import {usePartText} from './localized-parts'
import {bilingual as b} from './teardown-types'
const STOPS = [
	b('从一辆车开始', 'Start with a whole car'),
	b('七个系统，各司其职', 'Seven systems, one car'),
	b('四个缸，轮流做功', 'Four cylinders take turns'),
	b('拆开，仍然同步', 'Apart, but still in time'),
	b('换挡，换的是连接', 'Shifting changes the connection'),
	b('外侧轮多走一段路', 'The outside wheel travels farther'),
	b('一只活塞，夹住两面', 'One piston clamps both sides'),
	b('轮子先动，车身随后', 'The wheel moves first'),
	b('车壳与座舱分开看', 'Separate the skin and cabin'),
]
const COPY = [
	b('拖动可以绕车看。也可以跟着这九站，把一辆车拆到会动的零件。', 'Orbit the car yourself, or follow nine stops down to its moving parts.'),
	b(
		'车身、动力、传动、悬架、转向、制动和电气，沿各自的装配方向分开。',
		'Body, engine, driveline, suspension, steering, brakes and electrics separate into seven layers.',
	),
	b(
		'四个缸轮流做功，曲轴每转两圈，每个缸点一次火。',
		'Each cylinder fires once every two crankshaft revolutions. The four cylinders take turns.',
	),
	b(
		'零件移开了，曲轴、活塞和凸轮的节拍没有变。画面是慢放。',
		'The parts move apart while the crank, pistons and cams stay synchronized. This view runs in slow motion.',
	),
	b(
		'从 1 挡换到 3 挡。齿轮一直咬合，结合套把另一只齿轮锁到输出轴上。',
		'Watch first shift into third. The gears stay meshed; a sleeve locks a different gear to the output shaft.',
	),
	b(
		'外侧轮多走一段路。差速器里的行星齿轮开始自转，让左右轮转得不一样快。',
		'The outside wheel travels farther. The small differential gears spin to let the two rear wheels turn at different speeds.',
	),
	b(
		'液压走到四个车轮。内侧活塞推片，整个浮动卡钳滑动，把外侧片拉过来。',
		'Pressure reaches all four wheels. The inner piston pushes one pad; the caliper slides and pulls the outer pad against the disc.',
	),
	b(
		'弹簧接住冲击，减振器让来回晃动停下来。曲线里能看到轮子与车身的时间差。',
		'The spring takes the impact; the damper settles the bounce. The traces show the body following the wheel.',
	),
	b(
		'车身外壳和内饰按层分开。导入的概念车不是量产白车身；这里不展示未经验证的钢材分区。',
		'Separate the body and interior. The imported concept car is not a production body-in-white; no unverified steel-strength zones are shown.',
	),
]
export function CarGuide({open, onStep, onExit}: {open: boolean; onStep: (index: number) => void; onExit: () => void}) {
	const text = usePartText()
	const steps = useMemo<GuideStep[]>(
		() =>
			STOPS.map((title, index) => ({
				title: text(title),
				body: text(COPY[index]),
				action: () => onStep(index),
				replay: () => onStep(index),
				durationMs: [6500, 6500, 8500, 8500, 9500, 11000, 10000, 9500, 9000][index],
			})),
		[text, onStep],
	)
	return (
		<GuideTour
			worldId="car-teardown"
			defaultOpen={open}
			onExit={onExit}
			steps={steps}
			placement="stage"
			stagePlan={[
				{
					position: 'top-left',
					mobilePosition: 'top-left',
					tone: 'light',
					treatment: 'caption',
					width: 'narrow',
					motion: 'fade',
				},
			]}
		/>
	)
}
