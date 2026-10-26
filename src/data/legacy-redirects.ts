export const legacyWorldRedirects: Record<string, string> = {
  'city-pulse': 'global-flight-network',
  'living-earth': 'global-flight-network',
  'world-treemap': 'global-flight-network',
  'lifetime-money-glm5-3': 'follow-the-money',
  'lifetime-money-grok4-6-build': 'follow-the-money',
  'lifetime-money-grok4-6': 'follow-the-money',
  'lifetime-money-k3': 'follow-the-money',
  'lifetime-money-map-opus5': 'follow-the-money',
  'money-circulation': 'follow-the-money',
  'money-creation': 'follow-the-money',
  'money-flow-atlas': 'follow-the-money',
  'money-town': 'follow-the-money',
  'earth-in-a-day': 'earth-spin-orbit',
  'p-versus-np': 'fluid-sim',
  'riemann-primes': 'fourier',
}

// Author-approved scene merges can point at an accessible `making` world. They do not publish it.
export const legacyWorldSceneRedirects: Record<string, { worldId: string; scene: string }> = {
  'fire-gravity': { worldId: 'campfire', scene: 'candle' },
}
