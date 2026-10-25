import assert from 'node:assert/strict'
import { test } from 'node:test'
import { collectWorldFiles } from './lib/world-load-manifest.mjs'

test('static closure includes CSS once, handles cycles, excludes dynamic worlds and media', () => {
  const manifest = {
    world: { file: 'world.js', imports: ['shared', 'engine'], css: ['world.css'], dynamicImports: ['other'], assets: ['model.glb'] },
    shared: { file: 'shared.js', imports: ['engine'], css: ['shared.css'] },
    engine: { file: 'engine.js', imports: ['shared'], css: ['shared.css'] },
    other: { file: 'other.js' },
  }
  assert.deepEqual(collectWorldFiles(manifest, 'world'), ['engine.js', 'shared.css', 'shared.js', 'world.css', 'world.js'])
  assert.throws(() => collectWorldFiles(manifest, 'missing'), /Missing Vite manifest/)
})
