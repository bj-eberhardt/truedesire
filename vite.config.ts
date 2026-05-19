import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'

// https://vite.dev/config/
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version?: string }
const appVersion = pkg.version ?? '0.0.0'

export default defineConfig({
  plugins: [react()],
  // Work around Windows environments where spawning `net use` is blocked (EPERM).
  // Vite uses it to optimize realpath handling when preserveSymlinks is false.
  resolve: { preserveSymlinks: true },
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
})
