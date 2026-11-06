import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const build = spawn(process.execPath, ['scripts/build.mjs'], { cwd: root, stdio: 'inherit' });
build.on('exit', code => {
  if (code !== 0) process.exit(code ?? 1);
  const server = spawn(process.execPath, ['scripts/server.mjs', 'dist'], { cwd: root, stdio: 'inherit' });
  server.on('exit', serverCode => process.exit(serverCode ?? 0));
});
