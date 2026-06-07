const fs = require('fs');
const path = require('path');

const src = path.resolve(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
const destDir = path.resolve(__dirname, 'dist-electron');
const dest = path.join(destDir, 'sql-wasm.wasm');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

fs.copyFileSync(src, dest);
console.log('Successfully copied sql-wasm.wasm to dist-electron/');
