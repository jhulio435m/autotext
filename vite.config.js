import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    jsxInject: `import React from 'react'`
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;

          if (id.includes('/@fortune-sheet/')) {
            return 'spreadsheet';
          }

          if (
            id.includes('/@tiptap/')
            || id.includes('/prosemirror-')
            || id.includes('/orderedmap/')
            || id.includes('/rope-sequence/')
          ) {
            return 'editor-core';
          }

          if (id.includes('/tippy.js/')) {
            return 'editor-mention';
          }

          if (id.includes('/lucide-react/')) {
            return 'icons';
          }

          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('/react-router/')
            || id.includes('/scheduler/')
          ) {
            return 'framework';
          }

          if (id.includes('/katex/')) {
            return 'math';
          }

          if (id.includes('/@dnd-kit/')) {
            return 'dragdrop';
          }

          return 'shared';
        }
      }
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    hmr: {
      clientPort: 5174
    },
    proxy: {
      '/api': {
        target: devApiTarget,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('[PROXY_ERROR]', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`[PROXY_HIT] ${req.method} ${req.url}`);
          });
        }
      }
    }
  }
});
