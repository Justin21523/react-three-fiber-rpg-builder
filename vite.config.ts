import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
    dedupe: ['react', 'react-dom', '@react-three/fiber', 'three'],
  },
  optimizeDeps: {
    include: ['@react-three/fiber', '@react-three/drei', '@react-three/rapier', 'three', 'react', 'react-dom'],
  },
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three_core';
          if (id.includes('node_modules/@react-three/fiber')) return 'r3f_fiber';
          if (id.includes('node_modules/@react-three/drei')) return 'r3f_drei';
          if (id.includes('node_modules/@react-three/rapier')) return 'r3f_rapier';
          if (id.includes('node_modules/@dimforge/rapier3d-compat')) return 'rapier_wasm';
        },
      },
    },
  },
  server: { port: 3000, open: true },
});
