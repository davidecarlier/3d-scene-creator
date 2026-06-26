import { resolve } from 'path'
import { defineConfig } from 'vite'

const website = resolve(__dirname, 'website')
const { version } = require('./package.json')

// Replaces the __PKG_VERSION__ token in any HTML page with the package version,
// so the docs version label stays in sync with package.json automatically.
const injectVersion = {
  name: 'inject-pkg-version',
  transformIndexHtml(html) {
    return html.replaceAll('__PKG_VERSION__', version)
  },
}

// Build config for the website (the marketing landing page + live examples),
// as opposed to vite.config.js which builds the publishable library.
// Sources live in /website; the static, self-contained site is emitted to
// /public for Netlify.
module.exports = defineConfig({
  root: website,
  base: '/',
  plugins: [injectVersion],
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
