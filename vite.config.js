import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET || 'http://127.0.0.1:4000';

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    jsxInject: `import React from 'react'`
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    hmr: {
      clientPort: 5180
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
