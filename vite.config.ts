import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

/**
 * Chunking note: Recharts, React Flow, TanStack Table and pdf.js are all heavy
 * and are only needed on a handful of screens. Splitting them into named vendor
 * chunks keeps the shell small and lets the browser cache them independently of
 * application code. pdf.js additionally sits behind a `React.lazy` boundary, so
 * its chunk is only fetched when a manager actually opens a document.
 */
const VENDOR_CHUNKS: { test: RegExp; name: string }[] = [
  { test: /node_modules[\\/](pdfjs-dist|react-pdf)[\\/]/, name: 'vendor-pdf' },
  { test: /node_modules[\\/](recharts|d3-[a-z]+|internmap)[\\/]/, name: 'vendor-charts' },
  { test: /node_modules[\\/]@xyflow[\\/]/, name: 'vendor-flow' },
  { test: /node_modules[\\/]@tanstack[\\/]/, name: 'vendor-table' },
  { test: /node_modules[\\/](motion|framer-motion)[\\/]/, name: 'vendor-motion' },
  { test: /node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/, name: 'vendor-react' },
  { test: /node_modules[\\/](@radix-ui|sonner|react-dropzone|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/, name: 'vendor-ui' },
]

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
  },
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          const match = VENDOR_CHUNKS.find((chunk) => chunk.test.test(id))
          return match?.name
        },
      },
    },
  },
})
