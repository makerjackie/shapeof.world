// Every change takes the full lane: there is no narrow lane in this repository.
export function selectCheckScope(_changes, _baselineVerified = false) {
  return 'full'
}

export function checkStages(_scope) {
  return [
    ['generate', ['run', 'build:prepare']],
    ['typecheck', ['run', 'typecheck']],
    ['pipeline-tests', ['exec', 'node', '--test', 'scripts/check-plan.test.mjs']],
    ['tests', ['run', 'test']],
    ['scripts', ['run', 'check:scripts']],
    ['infra', ['run', 'test:infra']],
    ['web-build', ['exec', 'vite', 'build']],
    ['client-budget', ['run', 'client:bundle-check']],
    ['worker-types', ['exec', 'wrangler', 'types', '--check']],
    // Also performs the main Worker's deployment dry-run.
    ['worker-budget', ['run', 'worker:bundle-check']],
  ]
}

export function productionIdentity(health) {
  const commit = health.release?.commit, tag = health.version?.tag
  if (health.status !== 'ok' || health.release?.channel !== 'production'
    || !/^[a-f0-9]{40}$/.test(commit ?? '')
    || !/^web-v\d{4}\.\d{2}\.\d{2}\.\d+$/.test(tag ?? '')
    || tag !== `web-v${health.release?.version}`) throw new Error('Unverified production identity')
  return { commit, tag }
}
