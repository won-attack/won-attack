import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export default defineConfig({
  plugins: [react()],
  server: {
    fs: { allow: [repoRoot, resolve(repoRoot, 'video')] },
    watch: { ignored: ['**/.edge-presentation-test/**'] },
    proxy: { '/api': { target: 'http://localhost:8080', changeOrigin: true } },
  },
});
