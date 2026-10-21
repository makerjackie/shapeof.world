// All shots in film order. Each module exports SHOTS and may export setup().
import { bt, BEAT, count, clamp, clock } from '../lib.js'
import { F } from '../facts.js'
import * as s0 from './s0_open.js'
import * as s1 from './s1_source.js'
import * as s2 from './s2_split.js'
import * as s3 from './s3_bank.js'
import * as s4 from './s4_after.js'
import * as s5 from './s5_next.js'
import * as s6 from './s6_end.js'

const MODULES = [s0, s1, s2, s3, s4, s5, s6]
export const SHOTS = MODULES.flatMap((m) => m.SHOTS)
export async function setup() { for (const m of MODULES) if (m.setup) await m.setup() }

// The running bill (top-right): each step lands with the shot that adds it.
// [bar, beat, amount in 万]; the first step puts the whole price on it.
export const BILL_STEPS = [
  [22, 6, F.price.total],
  [25, 2, F.loan.interest],
  [28, 3, -F.subsidy.save],
  [30, 2, F.deed.v],
  [30, 3, F.fund.v],
  [32, 3, F.fee.v],
]
export const BILL = {
  from: bt(22, 6), to: bt(47),
  value(t) {
    let v = 0
    for (const [b, beat, d] of BILL_STEPS) { const t0 = bt(b, beat); if (t >= t0) v = count(t, t0, BEAT * 1.2, v + d, v) }
    return v
  },
  bump(t) {
    let m = 0
    for (const [b, beat] of BILL_STEPS) { const d = t - bt(b, beat); if (d >= 0 && d < 0.6) m = Math.max(m, 1 - d / 0.6) }
    return m
  },
}
