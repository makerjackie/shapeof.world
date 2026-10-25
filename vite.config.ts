import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { worldLoadManifest } from './scripts/lib/world-load-manifest.mjs'
import release from './src/data/web-release.json'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Cloudflare can evaluate this config more than once in the same build.
// Keep the client define and the emitting plugin on one build identifier.
const worldLoadBuildId = process.env.SHAPE_WORLD_LOAD_BUILD_ID ??= randomUUID()
const worldLoadDirectory = `generated/world-loads/${worldLoadBuildId}`

export default defineConfig(({ command }) => ({
  define: {
    __WORLD_LOAD_BASE__: JSON.stringify(command === 'build' ? `/${worldLoadDirectory}/` : ''),
    __WEB_BUILD__: JSON.stringify({
      version: release.version,
      commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      channel: command === 'build' ? 'production' : 'local',
    }),
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
    // Local release copies contain their own tsconfig and HTML. Watching them
    // restarts the live site while unrelated packaging jobs are running.
    // Agent worktrees under .claude/ are whole copies of the repo; watching them
    // restarts this server every time another session edits a file.
    watch: { ignored: ['**/.local/**', '**/.scratch/**', '**/private/**', '**/films/**', '**/.claude/**'] },
  },
  resolve: {
    tsconfigPaths: true,
  },
  environments: {
    client: { build: { manifest: true } },
    ssr: {
      build: {
        // Vite leaves SSR unminified by default. The Worker ships these chunks,
        // so minify them too while retaining private maps for error diagnosis.
        minify: 'oxc',
        sourcemap: true,
      },
    },
  },
  plugins: [
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'oneworld.locale.v1',
      strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
      urlPatterns: [
        {
          pattern: '/',
          localized: [
            ['en', '/en'],
            ['zh', '/'],
          ],
        },
        {
          pattern: '/:path(.*)?',
          localized: [
            ['en', '/en/:path(.*)?'],
            ['zh', '/:path(.*)?'],
          ],
        },
      ],
      routeStrategies: [
        { match: '/api/:path(.*)?', exclude: true },
      ],
    }),
    tailwindcss(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
    worldLoadManifest(worldLoadDirectory),
  ],
}))
