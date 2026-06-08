import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Shaders live in src/shaders/*.glsl and are imported with the `?raw` suffix,
// e.g. `import frag from './shaders/water.glsl?raw'` — no extra plugin needed.
export default defineConfig({
  plugins: [react()],
  server: { host: true },
})
