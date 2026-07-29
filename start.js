const { spawn } = require('child_process');

console.log('\x1b[36m%s\x1b[0m', '=====================================================');
console.log('\x1b[36m%s\x1b[0m', '          FaceTrack Full-Stack Launcher              ');
console.log('\x1b[36m%s\x1b[0m', '=====================================================');
console.log('\x1b[32m%s\x1b[0m', '✔ Database: Live Neon PostgreSQL (ep-empty-violet-avfujn71)');
console.log('\x1b[32m%s\x1b[0m', '✔ Backend API: http://localhost:8000');
console.log('\x1b[32m%s\x1b[0m', '✔ Frontend UI: http://localhost:5173');
console.log('-----------------------------------------------------\n');

// 1. Start PHP REST API Backend
const backend = spawn('php', ['-S', 'localhost:8000', '-t', 'backend'], {
  stdio: 'inherit',
  shell: true,
});

// 2. Start React + Vite Frontend
const frontend = spawn('cmd', ['/c', 'npm', 'run', 'dev'], {
  cwd: './frontend',
  stdio: 'inherit',
  shell: true,
});

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
