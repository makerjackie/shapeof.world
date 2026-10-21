import {defineConfig, loadEnv} from 'vite'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/vendor/periodic-table/',
    build: {
      outDir: env.ONEWORLD_OUT_DIR || 'dist',
      emptyOutDir: true,
    },
  }
})
