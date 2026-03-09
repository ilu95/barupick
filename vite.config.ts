import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'color-data': ['./src/lib/colors.ts', './src/lib/styleMoods.ts', './src/lib/personalColor.ts'],
          'engine': ['./src/lib/recommend.ts', './src/lib/evaluation.ts'],
          'vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
})
