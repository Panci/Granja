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
      name: 'copy-backend',
      closeBundle() {
        // Copia los archivos del backend PHP al dist final
        copyFile(resolve(__dirname, 'api.php'), resolve(__dirname, 'dist/api.php'));
        copyFile(resolve(__dirname, 'config.php'), resolve(__dirname, 'dist/config.php'));
        copyFile(resolve(__dirname, 'config.example.php'), resolve(__dirname, 'dist/config.example.php'));
        copyFile(resolve(__dirname, 'schema.sql'), resolve(__dirname, 'dist/schema.sql'));
        copyFile(resolve(__dirname, '.htaccess'), resolve(__dirname, 'dist/.htaccess'));
        copyFile(resolve(__dirname, 'README.md'), resolve(__dirname, 'dist/README.md'));
      }
    }
  ]
});
