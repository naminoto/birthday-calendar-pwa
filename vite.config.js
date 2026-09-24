import { defineConfig } from 'vite';

// 相対baseにより、GitHub Pagesのリポジトリ名が変わっても静的ファイルを読めます。
export default defineConfig({
  base: './',
  build: { outDir: 'dist', emptyOutDir: true },
});
