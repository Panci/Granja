import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.mkdirSync(resolve(dest, '..'), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

export default defineConfig({
  base: './', // Rutas relativas para que funcione en subdirectorios
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    // Generar archivos sin hash para que el backend PHP pueda servirlos
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
  plugins: [
    {
      name: 'copy-assets',
      closeBundle() {
        // Solo copia assets adicionales (no PHP ya que usamos Nixpacks/Static)
        copyFile(resolve(__dirname, '.htaccess'), resolve(__dirname, 'dist/.htaccess'));
      }
    }
  ]
});
