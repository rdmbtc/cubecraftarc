import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    alias: {
      'prismarine-registry': './noop.js',
      'prismarine-nbt': './noop.js'
    },
  },
  build: {
    target: 'es2022',
    minify: false,
  },
  esbuild: {
    target: 'es2022',
  },
})
