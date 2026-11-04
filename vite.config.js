import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

// 相対baseにより、GitHub Pagesのリポジトリ名が変わっても静的ファイルを読めます。
export default defineConfig(async ({mode}) => {
  const avatarDiagnostics = mode === 'avatar-diagnostics';
  const packageVersion = JSON.parse(await readFile(new URL('./package.json', import.meta.url), 'utf8')).version;
  const avatarDiagnosticsPlugin = avatarDiagnostics ? [{
    name:'yoribi-avatar-picker-diagnostics',
    enforce:'pre',
    resolveId(source, importer) {
      if(source==='./avatar-picker-diagnostics-runtime.js'&&/[/\\]src[/\\]avatar-editor\.js$/.test(importer??'')){
        return fileURLToPath(new URL('./src/avatar-picker-diagnostics.js', import.meta.url));
      }
    },
  }] : [];
  return {
    base: './',
    // package.json全体（scripts等）をクライアントへ同梱せず、Version値だけをbuild時に埋め込む。
    define: { __YORIBI_PACKAGE_VERSION__:JSON.stringify(packageVersion) },
    build: { outDir: mode === 'font-lab' ? 'test-artifacts/font-lab' : 'dist', emptyOutDir: true },
    // 正式buildはno-op実装だけ。診断・フォント比較はそれぞれの明示モードだけでimportグラフへ入れる。
    plugins: [...avatarDiagnosticsPlugin,
      ...(mode === 'font-lab' ? [(await import('./dev/font-lab/vite-plugin.mjs')).fontLabPlugin()] : [])],
  };
});
