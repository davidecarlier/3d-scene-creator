import { resolve } from 'path'
import { defineConfig } from 'vite'

// Build config for the landing page (the marketing site + live examples),
// as opposed to vite.config.js which builds the publishable library.
// Outputs a static, self-contained site into /public for Netlify.
module.exports = defineConfig({
  root: __dirname,
  base: '/',
  // Output dir is /public, so disable the default publicDir to avoid recursion.
  publicDir: false,
  build: {
    outDir: 'public',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        beach: resolve(__dirname, 'examples/360-beach/index.html'),
        models: resolve(__dirname, 'examples/load-models/index.html'),
        picking: resolve(__dirname, 'examples/picking/index.html'),
        physics: resolve(__dirname, 'examples/physics/index.html')
      }
    }
  }
})
