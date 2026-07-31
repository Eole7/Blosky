const fs = require('fs');
const path = require('path');

const workspace = process.env.GITHUB_WORKSPACE || '.';
const dist = path.join(workspace, 'dist');
const stage = path.join(workspace, 'artifacts');
const version = process.env.BUILD_VERSION || '0.0.0';
const productName = process.env.BUILD_PRODUCT_NAME || 'Blosky';

if (!fs.existsSync(dist)) {
  console.log('dist not found, nothing to stage');
  process.exit(0);
}

fs.mkdirSync(stage, { recursive: true });

const exts = [
  '.exe',
  '.blockmap',
  '.AppImage',
  '.snap',
  '.deb',
  '.zip',
  '.dmg',
  '.pkg'
];

let count = 0;

for (const f of fs.readdirSync(dist)) {
  if (exts.some(e => f.endsWith(e))) {
    const src = path.join(dist, f);
    const base = f.replace(/Blosky(?: Setup)?/g, productName).replace(/-0\.5\.0/, '-' + version);
    const dst = path.join(stage, base);
    fs.copyFileSync(src, dst);
    console.log('staged: ' + dst);
    count++;
  }
}

console.log('staged ' + count + ' artifact(s) to: ' + stage);
