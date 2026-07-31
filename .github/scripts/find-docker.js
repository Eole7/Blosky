const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const candidates = [
  'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
  'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe'
];

let docker = null;

for (const p of candidates) {
  if (fs.existsSync(p)) {
    docker = p;
    break;
  }
}

if (!docker) {
  try {
    docker = execSync('where docker', { encoding: 'utf8' }).trim().split('\n')[0];
  } catch (e) {
    // ignore
  }
}

if (!docker || !fs.existsSync(docker)) {
  console.error('Docker executable not found. Ensure Docker Desktop is installed and the runner service can access it.');
  process.exit(1);
}

const envFile = process.env.GITHUB_ENV;
fs.appendFileSync(envFile, 'DOCKER_EXE=' + docker + '\n');
console.log('Found Docker at: ' + docker);
