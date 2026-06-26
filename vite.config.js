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
      // Externalize three and all its subpath addons (it's a peer dependency).
      // tween.js is small and MIT-licensed, so we bundle it into the output.
      external: [/^three($|\/)/],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          three: 'THREE',
          'three/examples/jsm/controls/OrbitControls.js': 'OrbitControls',
          'three/examples/jsm/loaders/GLTFLoader.js': 'GLTFLoader'
        }
      }
    }
  }
})