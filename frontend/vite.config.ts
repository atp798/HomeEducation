import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Vite 5 uses esbuild minify by default (much faster than terser)
// terser is only needed when you need more aggressive mangling
const isDev = process.env.NODE_ENV === 'development'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    globals: true,
  },
  build: {
    // Use esbuild minification (default in Vite 5, but explicit for clarity)
    minify: !isDev ? 'esbuild' : false,
    // Enable CSS code splitting for better caching
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          // Core React - MUST be first to avoid circular chunks with vendor-misc
          if (['react', 'react-dom', 'react-router-dom'].some(m => id.includes(m))) {
            return 'vendor-react'
          }
          // Markdown + its dependencies (also depends on react/unist)
          if (['react-markdown', 'remark-gfm', 'rehype', 'unist', 'mdast', 'unist'].some(m => id.includes(m))) {
            return 'vendor-markdown'
          }
          // Icons - split lucide separately since it's huge (46M)
          if (id.includes('lucide-react')) return 'vendor-icons'
          // date-fns is also large - separate chunk
          if (id.includes('date-fns')) return 'vendor-date'
          // State management
          if (id.includes('zustand')) return 'vendor-state'
          // API client
          if (id.includes('axios')) return 'vendor-api'
          // All other vendor code (should not depend on react to avoid cycles)
          return 'vendor-misc'
        },
      },
    },
    // Generate pure CO2 client manifest for better caching
    manifest: true,
    // Target modern browsers for smaller ES2015+ output
    target: 'es2020',
  },
  server: {
    host: '0.0.0.0',
    port: 7194,
    allowedHosts: ['home-edu.make-it.com.cn', '82.157.28.69', '10.8.0.34'],
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        // Disable proxy buffering so SSE chunks reach the browser immediately
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes) => {
            const ct = proxyRes.headers['content-type'] || ''
            if (ct.includes('text/event-stream')) {
              proxyRes.headers['x-accel-buffering'] = 'no'
              proxyRes.headers['cache-control'] = 'no-cache'
            }
          })
        },
      },
    },
  },
})