/// <reference types='vitest' />
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

export default defineConfig({
  base: '',

  build: {
    minify: false,
    lib: {
      name: 'conform',
      entry: 'src/index',
      fileName: (format) => `index.${format}.js`,
    }
  },

  test: {
    environment: 'jsdom'
  },
  plugins: [
    dts(),
  ],
})
