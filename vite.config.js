const path = require('path')
const { defineConfig } = require('vite')

module.exports = defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/main.ts'),
      name: '3d-scene-creator',
      fileName: (format) => `3d-scene-creator.${format}.js`
    },
    rollupOptions: {
      // make sure to externalize deps that shouldn't be bundled
      // into your library
      external: ['three', 'gsap','three/examples/jsm/controls/OrbitControls'],
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