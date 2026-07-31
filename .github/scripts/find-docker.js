const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const candidates = [
  'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe',
  'C:\\Program Files\\Docker\\Docker\\resources\\docker.exe',
  'C:\\ProgramData\\DockerDesktop\\version-bin\\docker.exe',
  'C:\\Program Files\\Docker\\docker.exe'
];

let docker = null;

for (const p of candidates) {
  if (fs.existsSync(p)) {
    docker = p;
    console.log('Found Docker at known path: ' + p);
    break;
  }
}

if (!docker) {
  try {
    const result = execSync('where docker', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    const lines = result.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0 && fs.existsSync(lines[0])) {
      docker = lines[0];
      console.log('Found Docker via where: ' + docker);
    } else {
      console.log('where docker returned: ' + JSON.stringify(lines));
    }
  } catch (e) {
    console.log('where docker failed: ' + (e.message || e));
  }
}

if (!docker) {
  try {
    const pathEnv = process.env.PATH || '';
    console.log('Current PATH entries: ' + pathEnv.split(';').filter(Boolean).slice(0, 20).join('\n'));
  } catch (e) {
    // ignore
  }
  console.error('Docker executable not found for the runner service account.');
  console.error('Common causes:');
  console.error('  1. Runner service runs under a different user than your interactive session');
  console.error('  2. Docker Desktop is not installed for all users');
  console.error('  3. Docker is not in the service account PATH');
  console.error('Fix: configure the runner service to run as your user, or install Docker for all users.');
  process.exit(1);
}

const envFile = process.env.GITHUB_ENV;
fs.appendFileSync(envFile, 'DOCKER_EXE=' + docker + '\n');
console.log('DOCKER_EXE=' + docker);

try {
  const info = execSync('"' + docker + '" version --format "{{.Server.Version}}"', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  console.log('Docker server version: ' + info);
} catch (e) {
  console.log('Docker version check failed: ' + (e.message || e));
}
