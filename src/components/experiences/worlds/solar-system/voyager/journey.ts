import { DAY, YEAR, utc, type Ephemeris } from './ephemeris'
export type Chapter = {
	id: string
	title: string
	text: string
	detail: string
	target: string
	from: number
	to: number
	duration: number
	at?: number
	photo?: string
	future?: boolean
}
export type Journey = { chapters: Chapter[]; duration: number }
export function makeJourney(data: Ephemeris): Journey {
	const encounter = (id: string) => data.encounters.find((e) => e.id === id)!.closest
	const chapters: Chapter[] = []
	const add = (chapter: Omit<Chapter, 'from'>) => chapters.push({ ...chapter, from: chapters.at(-1)?.to ?? data.start })
	add({
		id: 'launch',
		title: '带着地球的声音出发',
		text:
			data.mission === 1
				? '1977 年 9 月 5 日，旅行者 1 号启程。它比 2 号晚出发，却将率先抵达木星。'
				: '1977 年 8 月 20 日，旅行者 2 号先行出发。一场跨越四颗巨行星的远行开始了。',
		detail: '各携一张镀金唱片，留下地球的声音、问候与图像。镜头从入轨后开始。',
		target: 'earth',
		to: data.start + 3600,
		duration: 22,
	})
	add({
		id: 'outbound',
		title: '借一次行星的力',
		text: '发动机不会一直推着它。飞船沿引力塑造的轨道滑行，借行星的运动改变方向与日心速度。',
		detail: '行星排列提供了难得的航行窗口。定位圆点经过放大。',
		target: 'overview',
		to: encounter('jupiter') - 2 * DAY,
		duration: 22,
	})
	add({
		id: 'jupiter',
		title: '木星，不再只是远处的一点',
		text:
			data.mission === 1
				? '木星的云带铺满视野。木卫一的火山，让人类第一次看见地球之外正在喷发的火山。'
				: '四个月后，2 号抵达木星。木卫二交错的冰纹，留下一个后来不断被追问的海洋世界之谜。',
		detail: '切换飞船视角，看行星占据多大的天空。',
		target: 'jupiter',
		at: encounter('jupiter'),
		to: encounter('jupiter') + 2 * DAY,
		duration: 42,
		photo: data.mission === 1 ? 'jupiter' : 'europa',
	})
	if (data.mission === 1) {
		add({
			id: 'saturn-cruise',
			title: '为一颗卫星改变去向',
			text: '下一站是土星。为了接近包裹在浓雾中的土卫六，1 号将放弃继续飞向天王星和海王星。',
			detail: '两艘飞船的道路从这里分开：1 号的土卫六飞掠把它送向黄道面以北。',
			target: 'overview',
			to: encounter('titan') - 2 * 3600,
			duration: 18,
		})
		add({
			id: 'titan',
			title: '土卫六的面纱',
			text: '飞船掠过浓厚的大气，却看不穿橙色的雾霾。一个世界的答案，被留给了下一代探测器。',
			detail: '雾霾球面是示意；历史照片另列。',
			target: 'titan',
			at: encounter('titan'),
			to: encounter('titan') + 2 * 3600,
			duration: 27,
			photo: 'titan',
		})
		add({
			id: 'saturn',
			title: '从光环旁离开',
			text: '土星在身后转成弯月。1 号离开行星密集的平面，此后再也没有近距离拜访过一颗行星。',
			detail: '航线向黄道面以北弯折。球面和环的姿态为示意。',
			target: 'saturn',
			at: encounter('saturn'),
			to: encounter('saturn') + DAY,
			duration: 33,
			photo: 'saturn1',
		})
		add({
			id: 'portrait',
			title: '回望，那是我们的全部',
			text: '1990 年 2 月 14 日，旅行者 1 号回望太阳系。地球落在一道杂散光里，小得不到一个像素。',
			detail: '“暗淡蓝点”为滤镜合成。此后相机关闭；更远处画面均为重建。',
			target: 'overview',
			at: utc('1990-02-14T04:48:00Z'),
			to: utc('1990-02-14T04:49:00Z'),
			duration: 30,
			photo: 'pale-blue-dot',
		})
	} else {
		add({
			id: 'saturn-cruise',
			title: '接过继续远行的任务',
			text: '1 号已经转向北方。2 号继续沿着巨行星之间的窄小窗口，赶往下一次引力助推。',
			detail: '任务逐次延长，两颗行星的旅程终于变成四颗。',
			target: 'overview',
			to: encounter('saturn') - 2 * DAY,
			duration: 14,
		})
		add({
			id: 'saturn',
			title: '穿过光环的阴影',
			text: '2 号在土星近旁转弯，朝天王星远去。精细的环纹和冰卫星，改变了人们对这颗行星的认识。',
			detail: '最近接近后，扫描平台卡滞；工程师调整后恢复观测。',
			target: 'saturn',
			at: encounter('saturn'),
			to: encounter('saturn') + DAY,
			duration: 32,
			photo: 'saturn2',
		})
		add({
			id: 'uranus-cruise',
			title: '四年多的寂静',
			text: '两次飞掠之间，是漫长的黑暗。这里快进的是时间，太阳系的距离没有被压缩。',
			detail: '暂停，看两次相遇之间的空白。',
			target: 'overview',
			to: encounter('uranus') - 2 * DAY,
			duration: 14,
		})
		add({
			id: 'uranus',
			title: '横躺着的冰巨星',
			text: '1986 年 1 月，2 号抵达天王星。近乎横躺的自转轴，让这个遥远世界有了极端的季节。',
			detail: '米兰达破碎般的地形，也在此时第一次被近距离看见。',
			target: 'uranus',
			at: encounter('uranus'),
			to: encounter('uranus') + DAY,
			duration: 34,
			photo: 'uranus',
		})
		add({
			id: 'neptune-cruise',
			title: '最后一颗行星',
			text: '再走三年半。阳光越来越弱，地球发来的指令需要数小时才能抵达。',
			detail: '单程光时由地球与飞船的几何距离估算。',
			target: 'overview',
			to: encounter('neptune') - DAY,
			duration: 14,
		})
		add({
			id: 'neptune',
			title: '掠过海王星的云顶',
			text: '1989 年 8 月，2 号从海王星上空掠过。巨大的风暴、细环与云影，从模糊的光点中显现。',
			detail: '视直径来自真实尺寸和距离；相机指向为示意。',
			target: 'neptune',
			at: encounter('neptune'),
			to: encounter('neptune') + 2 * 3600,
			duration: 36,
			photo: 'neptune',
		})
		add({
			id: 'triton',
			title: '冰冷世界，也有活动',
			text: '最后一次近距离相遇留给海卫一。喷流与年轻的地表，说明遥远而寒冷并不意味着死寂。',
			detail: '海卫一逆行公转。飞掠后，2 号向黄道面以南离开。',
			target: 'triton',
			at: encounter('triton'),
			to: encounter('triton') + 5 * 3600,
			duration: 27,
			photo: 'triton',
		})
	}
	add({
		id: 'interstellar',
		title: '跨过太阳风的边界',
		text:
			data.mission === 1
				? '2012 年 8 月 25 日，1 号穿过日球层顶，进入星际空间。太阳的引力影响仍然没有结束。'
				: '2018 年 11 月 5 日，2 号也穿过日球层顶。两条不同方向的航线，测量着太阳风泡的边缘。',
		detail: '参考圈表示太阳风边界的尺度，不是固定球面或引力边界。',
		target: 'overview',
		at: utc(data.mission === 1 ? '2012-08-25T00:00:00Z' : '2018-11-05T00:00:00Z'),
		to: utc(data.mission === 1 ? '2012-08-26T00:00:00Z' : '2018-11-06T00:00:00Z'),
		duration: 24,
	})
	add({
		id: 'present',
		title: '声音仍在远行',
		text: '距离已经以百个天文单位计。我们看见的，是一个逐渐远去的坐标，也是几代人接力守护的工程。',
		detail: '轨道冻结于 2026-09-18，含预测段；非实时遥测。',
		target: 'overview',
		to: data.end,
		duration: 12,
	})
	add({
		id: 'future',
		title: '比一段文明更长的旅程',
		text:
			data.mission === 1
				? '约四万年后，1 号预计从恒星 Gliese 445 约 1.6 光年之外经过。经过附近，并不意味着抵达。'
				: '约四万年后，2 号预计从恒星 Ross 248 约 1.7 光年之外经过。它没有朝某颗恒星导航。',
		detail: '匀速外推忽略太阳、银河与恒星引力。相遇估计另引 NASA，不能用此线预测亿年去向；奥尔特云为推测分布。',
		target: 'future',
		to: data.end + 40000 * YEAR,
		duration: 32,
		future: true,
	})
	return { chapters, duration: chapters.reduce((s, c) => s + c.duration, 0) }
}
export function sampleJourney(journey: Journey, elapsed: number) {
	let start = 0
	for (let index = 0; index < journey.chapters.length; index++) {
		const chapter = journey.chapters[index]
		if (elapsed <= start + chapter.duration || index === journey.chapters.length - 1) {
			const progress = Math.max(0, Math.min(1, (elapsed - start) / chapter.duration))
			let time: number
			if (chapter.at) {
				// Reserve most of the screen time for the closest ±30 minutes.
				const a = Math.max(chapter.from, chapter.at - 1800),
					b = Math.min(chapter.to, chapter.at + 1800)
				const knots = [
					[0, chapter.from],
					[0.25, a],
					[0.5, chapter.at],
					[0.75, b],
					[1, chapter.to],
				]
				let i = 0
				while (i < 3 && progress > knots[i + 1][0]) i++
				const [x, t] = knots[i],
					[y, u] = knots[i + 1]
				time = t + ((u - t) * (progress - x)) / (y - x)
			} else if (chapter.future) time = chapter.from + (chapter.to - chapter.from) * (Math.expm1(progress * 5) / Math.expm1(5))
			else time = chapter.from + (chapter.to - chapter.from) * progress
			return { chapter, index, progress, time, start }
		}
		start += chapter.duration
	}
	throw new Error('Empty journey')
}
export function chapterStart(journey: Journey, index: number) {
	return journey.chapters.slice(0, index).reduce((s, c) => s + c.duration, 0)
}
