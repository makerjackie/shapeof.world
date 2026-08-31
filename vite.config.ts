import { defineConfig } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import {viteStaticCopy} from 'vite-plugin-static-copy'

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
    allowedHosts: ['terminal.local'],
  },
  resolve: {
    tsconfigPaths: true,
  },
  plugins: [
    tailwindcss(),
    viteStaticCopy({
      targets: [
        {src: 'node_modules/cesium/Build/Cesium/Assets/**/*', dest: 'cesium/Assets', rename: {stripBase: 5}},
        {src: 'node_modules/cesium/Build/Cesium/ThirdParty/**/*', dest: 'cesium/ThirdParty', rename: {stripBase: 5}},
        {src: 'node_modules/cesium/Build/Cesium/Widgets/**/*', dest: 'cesium/Widgets', rename: {stripBase: 5}},
        {src: 'node_modules/cesium/Build/Cesium/Workers/**/*', dest: 'cesium/Workers', rename: {stripBase: 5}},
      ],
    }),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tanstackStart(),
    viteReact(),
  ],
})
