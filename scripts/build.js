import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🚀 Building Discord Secret Santa Application...');

// 1. Ensure dist output directories exist
const distClient = path.join(process.cwd(), 'dist', 'client');
const distAssets = path.join(distClient, 'assets');
fs.mkdirSync(distAssets, { recursive: true });

// 2. Build Client JS with esbuild
console.log('📦 Bundling React Frontend...');
execSync('npx esbuild src/client/src/main.tsx --bundle --minify --outfile=dist/client/assets/main.js --loader:.tsx=tsx --loader:.ts=ts --jsx=automatic', { stdio: 'inherit' });

// 3. Build Tailwind CSS
console.log('🎨 Compiling Tailwind CSS...');
execSync('npx tailwindcss -i src/client/src/index.css -o dist/client/assets/style.css --minify', { stdio: 'inherit' });

// 4. Create Production HTML
console.log('📄 Generating Production index.html...');
const versionHash = Date.now().toString(36);
const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="robots" content="noindex, nofollow, noarchive, nosnippet" />
    <meta name="googlebot" content="noindex, nofollow" />
    <title>Discord Secret Santa</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🎁</text></svg>" />
    <link rel="stylesheet" href="/assets/style.css?v=${versionHash}" />
  </head>
  <body class="bg-slate-900 text-slate-100 min-h-screen font-sans antialiased selection:bg-red-500 selection:text-white">
    <div id="root"></div>
    <script type="module" src="/assets/main.js?v=${versionHash}"></script>
  </body>
</html>`;

fs.writeFileSync(path.join(distClient, 'index.html'), htmlContent, 'utf-8');

// 5. Build TypeScript Server
console.log('⚙️ Compiling Server TypeScript...');
execSync('npx tsc -p tsconfig.server.json', { stdio: 'inherit' });

console.log('✅ Build completed successfully!');
