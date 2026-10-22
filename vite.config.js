import { defineConfig } from 'vite';

// 相対baseにより、GitHub Pagesのリポジトリ名が変わっても静的ファイルを読めます。
export default defineConfig(async ({mode}) => ({
  base: './',
  build: { outDir: mode === 'font-lab' ? 'test-artifacts/font-lab' : 'dist', emptyOutDir: true },
  // 明示的な比較モードのみ有効。本番クライアントのimportグラフに入れない。
  plugins: mode === 'font-lab' ? [(await import('./dev/font-lab/vite-plugin.mjs')).fontLabPlugin()] : [],
}));
