import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// ГРАММ использует GramJS (MTProto) в браузере, поэтому нужны node-полифилы.
export default defineConfig({
  // относительные пути — чтобы работало и на GitHub Pages, и внутри APK (file://)
  base: './',
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'process', 'stream', 'util', 'events', 'assert'],
      globals: { Buffer: true, global: true, process: true },
      protocolImports: true,
    }),
  ],
  define: {
    global: 'globalThis',
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          gramjs: ['telegram'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: { port: 5173 },
});
