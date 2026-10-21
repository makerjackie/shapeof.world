#!/usr/bin/env node
// 单世界快检：开发循环里替代 pnpm check 的轻量收口。
// 用法：pnpm world:check --id <world-id>
//
// 只覆盖能快速判断的三件事：类型、该世界自己的测试、世界切片校验。
// 全仓收口（infra、packs、docs、bundle、cloudflare）仍然由 pnpm check 负责。

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const argumentsList = process.argv.slice(2)
const idIndex = argumentsList.findIndex((value) => value === '--id')
const worldId = idIndex >= 0 ? argumentsList[idIndex + 1] : undefined

if (!worldId || worldId.startsWith('--')) {
  console.error('用法: pnpm world:check --id <world-id>')
  process.exit(2)
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(worldId)) {
  console.error(`世界 id 必须是 kebab-case: ${worldId}`)
  process.exit(2)
}

const worldDirectory = resolve(repositoryRoot, 'src/components/experiences/worlds', worldId)

function run(label, command, commandArguments) {
  console.log(`\n=== ${label} ===`)
  const result = spawnSync(command, commandArguments, {
    cwd: repositoryRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  return result.status === 0
}

function worldTestFiles() {
  if (!existsSync(worldDirectory)) return []
  return readdirSync(worldDirectory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && /\.test\.(ts|tsx)$/.test(entry.name))
    .map((entry) => resolve(entry.parentPath ?? entry.path, entry.name))
}

const failures = []

if (!run('typecheck', 'pnpm', ['exec', 'tsc', '--noEmit'])) failures.push('typecheck')

const testFiles = worldTestFiles()
if (testFiles.length === 0) {
  console.log(`\n=== tests ===\n跳过：${worldId} 目录下没有 *.test.ts；纯模型逻辑建议补一个。`)
} else if (!run('tests', 'pnpm', ['exec', 'vitest', 'run', ...testFiles])) {
  failures.push('tests')
}

const validator = 'scripts/validate-world.mjs'
if (!run('validate-world', 'node', [validator, '--id', worldId])) failures.push('validate-world')

console.log('')
if (failures.length > 0) {
  console.error(`FAIL  ${worldId}: ${failures.join(', ')}`)
  process.exit(1)
}

console.log(`PASS  ${worldId} 快检通过。`)
console.log('注意：快检不判断视觉质量，也不替代真实浏览器验收与最终 pnpm check。')
