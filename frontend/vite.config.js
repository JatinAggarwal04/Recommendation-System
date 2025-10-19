import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/', // ✅ use absolute root for Vercel
  build: {
    outDir: 'dist',
  },
})