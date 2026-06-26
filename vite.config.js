import { resolve } from 'path'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'

module.exports = defineConfig({
  plugins: [dts()],
  // The website build emits to /public; without this the library build would
  // copy that whole site into dist (vite's default publicDir is "public").
  publicDir: false,
  build: {
    // Wipe dist on every build so stale artifacts never leak into the published
    // package: only the library bundles and type declarations remain.
    emptyOutDir: true,
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
      // Externalize three (peer dependency) and cannon-es (optional physics dep).
      // tween.js is small and MIT-licensed, so we bundle it into the output.
      external: [/^three($|\/)/, 'cannon-es'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          three: 'THREE',
          'cannon-es': 'CANNON',
          'three/examples/jsm/controls/OrbitControls.js': 'OrbitControls',
          'three/examples/jsm/loaders/GLTFLoader.js': 'GLTFLoader'
        }
      }
    }
  }
})