import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

const resolve = {
  alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
}
const modelTests = 'src/components/experiences/**/*-model.test.ts'

export default defineConfig({
  resolve,
  test: {
    // Keep the full suite stable alongside the repository's build and browser tasks.
    maxWorkers: 4,
    projects: [
      {
        resolve,
        test: {
          name: 'models',
          environment: 'node',
          include: [modelTests],
          testTimeout: 30_000,
        },
      },
      {
        resolve,
        test: {
          name: 'ui-and-integration',
          environment: 'jsdom',
          include: ['src/**/*.test.ts'],
          exclude: [modelTests],
          testTimeout: 30_000,
        },
      },
    ],
  },
})
