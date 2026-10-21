// All shots in film order. Each module exports SHOTS and may export setup().
import * as s0 from './s0_open.js'
import * as s1 from './s1_people.js'
import * as s2 from './s2_money.js'
import * as s3 from './s3_scale.js'
import * as s4 from './s4_ability.js'
import * as s5 from './s5_powers.js'
import * as s6 from './s6_end.js'

const MODULES = [s0, s1, s2, s3, s4, s5, s6]
export const SHOTS = MODULES.flatMap((m) => m.SHOTS)
export async function setup() { for (const m of MODULES) if (m.setup) await m.setup() }
