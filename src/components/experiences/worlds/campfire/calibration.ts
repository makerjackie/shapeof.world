// Source-layout alternatives retained for review; combustion/transport equations are unchanged.
// logHeight lowers only the five leaning logs and their identical simulation emitters.
export const FIRE_CANDIDATES = {
  warm: { exposure:30, logHeight:1, source:{intensity:.22,fuelSrc:.18,bedFuel:.01,srcTemp:3,bedTemp:.35,anchorGain:1.2,srcFloor:.4,hotY1:.7,hotR0:.18,hotR1:.55} },
  wide: { exposure:30, logHeight:1, source:{intensity:.15,fuelSrc:.18,bedFuel:.01,srcTemp:5,bedTemp:.35,anchorGain:.3,srcFloor:1.1,hotY1:.55,hotR0:.3,hotR1:.6} },
  low: { exposure:35, logHeight:.65, source:{intensity:.265,fuelSrc:.25,bedFuel:.01,srcTemp:1,bedTemp:.35,anchorGain:1.2,srcFloor:.4,hotY1:.7,hotR0:.18,hotR1:.55} },
}
export const DEFAULT_FIRE = 'low'
export const CALIBRATED_SOURCE = FIRE_CANDIDATES[DEFAULT_FIRE].source
export const EARTH_BUOYANCY = 26.8
