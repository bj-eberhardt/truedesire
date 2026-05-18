import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Work around Windows environments where spawning `net use` is blocked (EPERM).
  // Vite uses it to optimize realpath handling when preserveSymlinks is false.
  resolve: { preserveSymlinks: true },
})
