import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // The demo build uses relative asset URLs so it can be hosted from any path.
  base: mode === 'demo' ? './' : '/',
}))
