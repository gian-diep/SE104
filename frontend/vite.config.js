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
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Tách React core ra riêng — cached lâu dài
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Tách animation library — khá nặng
          'vendor-framer': ['framer-motion'],
          // Tách icon library
          'vendor-lucide': ['lucide-react'],
        },
      },
    },
    // Cảnh báo nếu chunk > 400KB
    chunkSizeWarningLimit: 400,
  },
})