// Unset ELECTRON_RUN_AS_NODE so electron initializes as an app, not as Node.js.
// This variable is set by VS Code / Claude Code (both electron-based) and would
// otherwise prevent the electron main process from loading its built-in APIs.
const { spawn } = require('child_process');
const path = require('path');

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;

const evBin = path.resolve(__dirname, '..', 'node_modules', 'electron-vite', 'bin', 'electron-vite.js');
const proc = spawn(process.execPath, [evBin, 'dev'], { stdio: 'inherit', env });
proc.on('exit', (code) => process.exit(code ?? 0));
