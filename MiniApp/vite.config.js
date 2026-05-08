import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    allowedHosts: ['.loca.lt', '.trycloudflare.com', '.lhr.life'],
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
})
