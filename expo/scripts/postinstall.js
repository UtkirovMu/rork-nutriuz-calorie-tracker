/**
 * Postinstall script to patch @ai-sdk/provider-utils for React Native compatibility.
 * Metro bundler cannot handle dynamic import(id) calls, so we replace them
 * with Promise.resolve(undefined) since Node.js built-in modules aren't available
 * in React Native anyway.
 */
const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, '..', 'node_modules', '@ai-sdk', 'provider-utils', 'dist', 'index.mjs'),
  path.join(__dirname, '..', 'node_modules', '@ai-sdk', 'provider-utils', 'dist', 'index.js'),
];

const searchPattern = /return import\(id\);/g;
const replacement = 'return Promise.resolve(undefined);';

let patchCount = 0;

for (const filePath of filesToPatch) {
  if (!fs.existsSync(filePath)) {
    console.log(`[postinstall] Skipping (not found): ${path.basename(filePath)}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('return import(id);')) {
    const patched = content.replace(searchPattern, replacement);
    fs.writeFileSync(filePath, patched, 'utf8');
    patchCount++;
    console.log(`[postinstall] Patched: ${path.relative(path.join(__dirname, '..'), filePath)}`);
  } else {
    console.log(`[postinstall] Already patched: ${path.basename(filePath)}`);
  }
}

console.log(`[postinstall] Done. ${patchCount} file(s) patched.`);
