import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // ✅ ensures correct asset paths
  build: {
    outDir: 'dist', // default for Vite
  },
  server: {
    historyApiFallback: true, // ✅ ensures SPA routing works in dev too
  },
})