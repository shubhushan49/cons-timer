#!/usr/bin/env node
/**
 * Prepares icons for electron-builder Linux deb package.
 * Creates build/icon.png and build/icons/*.png from assets/icon-256.png.
 * Run: node scripts/prepare-icons.js
 * Requires: npm install sharp --save-dev
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('Run: npm install sharp --save-dev');
    process.exit(1);
  }

  const root = path.join(__dirname, '..');
  const src = path.join(root, 'assets', 'icon-256.png');
  const buildDir = path.join(root, 'build');
  const iconsDir = path.join(buildDir, 'icons');

  if (!fs.existsSync(src)) {
    console.error('Missing assets/icon-256.png');
    process.exit(1);
  }

  fs.mkdirSync(iconsDir, { recursive: true });

  const sizes = [16, 32, 48, 64, 128, 256, 512];
  for (const size of sizes) {
    const out = path.join(iconsDir, `${size}x${size}.png`);
    await sharp(src).resize(size, size).toFile(out);
    console.log(`Created ${out}`);
  }

  // Also copy as build/icon.png for electron-builder default
  await sharp(src).toFile(path.join(buildDir, 'icon.png'));
  console.log('Created build/icon.png');
  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
