import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['infra/insights/src/**/*.test.ts'],
  },
})
