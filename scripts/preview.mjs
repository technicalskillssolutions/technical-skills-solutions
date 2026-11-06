import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const server = spawn(process.execPath, ['scripts/server.mjs', 'dist'], { cwd: root, stdio: 'inherit' });
server.on('exit', code => process.exit(code ?? 0));
