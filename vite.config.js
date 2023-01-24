import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

module.exports = defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/main.ts'),
      name: '3d-scene-creator',
      fileName: (format) => {
        return format == 'es' ? 'main.js' : `main.${format}.js`
      }
    },
    rollupOptions: {
      input: {
        main: "./src/main.ts"
      },
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['three', 'gsap', 'three/examples/jsm/controls/OrbitControls'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          three: 'THREE',
          gsap: 'gsap',
          'three/examples/jsm/controls/OrbitControls': 'OrbitControls'
        }
      }
    }
  }
})