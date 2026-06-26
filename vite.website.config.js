import { resolve } from 'path'
import { defineConfig } from 'vite'

const website = resolve(__dirname, 'website')

// Build config for the website (the marketing landing page + live examples),
// as opposed to vite.config.js which builds the publishable library.
// Sources live in /website; the static, self-contained site is emitted to
// /public for Netlify.
module.exports = defineConfig({
  root: website,
  base: '/',
  // Output lives outside the root (/public), so disable the default publicDir.
  publicDir: false,
  build: {
    outDir: resolve(__dirname, 'public'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(website, 'index.html'),
        docs: resolve(website, 'docs.html'),
        beach: resolve(website, 'examples/360-beach/index.html'),
        models: resolve(website, 'examples/load-models/index.html'),
        picking: resolve(website, 'examples/picking/index.html'),
        physics: resolve(website, 'examples/physics/index.html')
      }
    }
  }
})
