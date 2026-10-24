import { DESIGNS } from '../designs'
import { registerODRegressions } from '../od-regression'

registerODRegressions(DESIGNS.filter(item => item.id === 'huangjuewan'))
