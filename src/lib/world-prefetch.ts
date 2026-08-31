const blackHoleWarmAssets = [
  '/vendor/black-hole/demo.html',
  '/vendor/black-hole/deflection.dat',
  '/vendor/black-hole/doppler.dat',
  '/vendor/black-hole/inverse_radius.dat',
  '/vendor/black-hole/black_body.dat',
  '/vendor/black-hole/gaia/pos-x-4-0-0.dat',
  '/vendor/black-hole/gaia/neg-x-4-0-0.dat',
  '/vendor/black-hole/gaia/pos-y-4-0-0.dat',
  '/vendor/black-hole/gaia/neg-y-4-0-0.dat',
  '/vendor/black-hole/gaia/pos-z-4-0-0.dat',
  '/vendor/black-hole/gaia/neg-z-4-0-0.dat',
] as const

let blackHoleWarmStarted = false

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string
    saveData?: boolean
  }
}

function shouldAvoidWarmup(): boolean {
  const connection = (navigator as NavigatorWithConnection).connection
  return connection?.saveData === true || connection?.effectiveType === 'slow-2g'
}

export function warmWorldOnIntent(worldId: string): void {
  if (worldId !== 'black-hole-flyby' || blackHoleWarmStarted || shouldAvoidWarmup()) return
  blackHoleWarmStarted = true

  for (const asset of blackHoleWarmAssets) {
    void fetch(asset, { credentials: 'same-origin' }).catch(() => undefined)
  }
}
