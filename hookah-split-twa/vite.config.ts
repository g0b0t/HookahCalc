import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/HookahCalc/',           // ВАЖНО: деплой через Actions → базовый путь = '/'
  plugins: [react()],
})
