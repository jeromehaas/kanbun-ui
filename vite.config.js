// IMPORTS
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// CONFIG
const config = defineConfig(({ mode }) => {

  // GET ENVIRONMENT
  const env = loadEnv(mode, process.cwd(), '');

  // GER SERVER BASE URL
  const serverBaseUrl = env.VITE_SERVER_BASE_URL || 'http://209.38.109.201:5001';
  const shouldProxyWebSockets = !env.VITE_SERVER_BASE_URL;

  // RETURN
  return {
    plugins: [
      vue(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5174,
      proxy: {
        '/api': {
          target: serverBaseUrl,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        ...(shouldProxyWebSockets ? {
          '/ws': {
            target: serverBaseUrl,
            changeOrigin: true,
            ws: true,
          },
        } : {}),
      },
    },
  };
});

// EXPORTS
export default config;
