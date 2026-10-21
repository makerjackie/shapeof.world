import type { Path } from '../types'

export default {
  id: 'orbital-mechanics',
  slug: 'always-falling',
  publication: 'public',
  title: '一直在坠落',
  titleEn: 'Always Falling',
  description: '轨道不是漂浮，而是一场永远够不到地面的坠落。从行星尺度看清引力如何把直线变成轨道，去一趟月球，再看三个天体如何互相牵扯。',
  descriptionEn: 'An orbit is not floating; it is a fall that keeps missing the ground. See gravity bend straight lines into orbits at planetary scale, fly to the Moon, then watch three bodies pull on one another.',
  worldIds: ["solar-system","moon-voyage","three-body"],
  stopLabels: [{"zh":"太阳系","en":"Solar system"},{"zh":"月球","en":"Moon"},{"zh":"三体","en":"Three-body"}],
  order: 1,
} satisfies Path
