import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  if (mode === 'production' && (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)) {
    const line = '='.repeat(72)
    console.warn(`
${line}
⚠  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 가 없습니다.
   이 빌드는 코드에 하드코딩된 개발 DB(ywqaxxcv…)에 붙습니다.
   프로덕션이면 환경변수를 설정하고, 강제하려면 VITE_STRICT_ENV=1 을 추가하세요.
${line}
`)
    if (env.VITE_STRICT_ENV === '1') throw new Error('VITE_SUPABASE_* 미설정 (VITE_STRICT_ENV=1)')
  }
  return {
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
  }
})
