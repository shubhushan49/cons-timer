#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '../dist/index.html');
if (!fs.existsSync(indexPath)) {
  console.warn('dist/index.html not found, skipping path fix');
  process.exit(0);
}

let html = fs.readFileSync(indexPath, 'utf8');
html = html.replace(/href="\/([^"]+)"/g, 'href="./$1"');
html = html.replace(/src="\/([^"]+)"/g, 'src="./$1"');
fs.writeFileSync(indexPath, html);
console.log('Fixed paths in dist/index.html for Electron file protocol');
