/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react(), tailwindcss()],
    build: {
      // Only for the on-demand three.js chunk of the landing's coin arch (~560 kB, loaded when the
      // chapter nears). The main chunk stays ~431 kB; do not raise this for anything else.
      chunkSizeWarningLimit: 600,
    },
    server: {
      proxy: {
        // Real backend goes through nginx (/api/core, /api/game). Ignored while mocks are on.
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:8080',
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
    },
  }
})
