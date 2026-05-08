import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        blur: resolve(__dirname, 'tools/blur/blur.html'),
        correcteur: resolve(__dirname, 'tools/correcteur/correcteur.html'),
        'password-gen': resolve(__dirname, 'tools/password-gen/password-gen.html')
      }
    }
  }
});
