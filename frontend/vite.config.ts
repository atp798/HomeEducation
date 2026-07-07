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
        // Manual chunk strategy — keep it small and conservative.
        //
        // The page chunks (Login, Register, Chat, ...) are already lazy via
        // React.lazy() in App.tsx, so the *real* page-download cost is just
        // the Login chunk (3.6 KB gz) plus its transitive deps. The big
        // vendor-* chunks are the unavoidable cost of a React app.
        //
        // Trade-off: naming a chunk makes Rollup treat it as "always
        // available" and include it in the entry's static modulepreload
        // list. We only do that for libraries that genuinely need to be
        // preloaded for the first paint. Everything else auto-splits with
        // its consumer.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // Core React — preloaded, cacheable, rarely changes
          if (['react', 'react-dom', 'react-router-dom'].some(m => id.includes(m))) {
            return 'vendor-react'
          }

          // State management — used by every page via the auth store
          if (id.includes('zustand')) return 'vendor-state'

          // HTTP client — used by api/client.ts which is imported by every page
          if (id.includes('axios')) return 'vendor-api'

          // Everything else auto-splits with its consumer. If a lib is
          // only reachable from a lazy page (e.g. react-markdown is only
          // imported by MessageBubble which is only imported by Chat), it
          // ends up inside that page's chunk and is NOT preloaded.
          return undefined
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