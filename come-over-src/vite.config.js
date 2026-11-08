import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Builds straight into ../come-over so GitHub Pages serves it at /come-over/.
// `base: './'` keeps every asset path relative, so it works from any subfolder.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: '../come-over',
    emptyOutDir: true,
  },
})
