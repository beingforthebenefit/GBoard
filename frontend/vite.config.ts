import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Two pages: the kiosk at / and the phone/iPad view at /m/. Separate entries, so the
    // kiosk never downloads the mobile view's charts and vice versa.
    rollupOptions: {
      input: {
        // Relative to the project root, which is where `vite build` runs
        main: 'index.html',
        mobile: 'm/index.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test-setup.ts', 'src/tests/**', 'src/vite-env.d.ts'],
    },
  },
})
