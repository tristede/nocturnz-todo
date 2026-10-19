import { defineConfig } from 'vite';

// Chaque build a son numéro : l'appli le compare à /version.json pour savoir si une nouvelle version est en ligne
const BUILD = String(Date.now());

export default defineConfig({
  server: { port: 3200, strictPort: true },
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [{
    name: 'version-file',
    generateBundle() { this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ v: BUILD }) }); },
  }],
});
