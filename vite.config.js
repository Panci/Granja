import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs';

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (let entry of entries) {
    const srcPath = resolve(src, entry.name);
    const destPath = resolve(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  base: './', // Use relative paths for built assets
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
    },
  },
  plugins: [
    {
      name: 'copy-static-folders',
      closeBundle() {
        // Copy js, assets and css folders to dist
        copyDir(resolve(__dirname, 'js'), resolve(__dirname, 'dist/js'));
        copyDir(resolve(__dirname, 'assets'), resolve(__dirname, 'dist/assets'));
        copyDir(resolve(__dirname, 'css'), resolve(__dirname, 'dist/css'));

        // Copy PHP backend files to dist
        if (fs.existsSync(resolve(__dirname, 'api.php'))) {
          fs.copyFileSync(resolve(__dirname, 'api.php'), resolve(__dirname, 'dist/api.php'));
        }
        if (fs.existsSync(resolve(__dirname, 'config.php'))) {
          fs.copyFileSync(resolve(__dirname, 'config.php'), resolve(__dirname, 'dist/config.php'));
        }
      }
    }
  ]
});
