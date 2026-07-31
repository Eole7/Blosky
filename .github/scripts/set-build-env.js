const fs = require('fs');
const path = require('path');

const versionFile = path.join(process.env.GITHUB_WORKSPACE || '.', 'build-version.ver');
const envFile = process.env.GITHUB_ENV;

if (!fs.existsSync(versionFile)) {
  console.error('build-version.ver not found at', versionFile);
  process.exit(1);
}

const version = fs.readFileSync(versionFile, 'utf8').trim();
const productName = 'Blosky-' + version;

fs.appendFileSync(envFile, 'BUILD_VERSION=' + version + '\n');
fs.appendFileSync(envFile, 'BUILD_PRODUCT_NAME=' + productName + '\n');

console.log('Set BUILD_VERSION=' + version);
console.log('Set BUILD_PRODUCT_NAME=' + productName);
