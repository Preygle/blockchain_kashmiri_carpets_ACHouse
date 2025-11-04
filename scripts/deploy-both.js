const { spawn } = require('child_process');
const fs = require('fs');

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env }, shell: true });
    let out = '';
    p.stdout.on('data', (d) => (out += d.toString()));
    p.on('close', (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(cmd + ' ' + args.join(' ')));
    });
  });
}

async function main() {
  const l2 = await run('npx', ['hardhat', 'run', '--network', 'l2', 'scripts/deploy-l2.js']);
  const l1 = await run('npx', ['hardhat', 'run', '--network', 'l1', 'scripts/deploy-l1.js']);
  const l2Json = JSON.parse(l2);
  const l1Json = JSON.parse(l1);
  const out = { l2: l2Json, l1: l1Json };
  fs.writeFileSync('deploy-addresses.json', JSON.stringify(out, null, 2));
  console.log('Saved deploy-addresses.json');
  try {
    fs.mkdirSync('frontend/public', { recursive: true });
    fs.writeFileSync('frontend/public/deploy-addresses.json', JSON.stringify(out, null, 2));
    console.log('Copied to frontend/public/deploy-addresses.json');
  } catch {}
}

main().catch((e) => { console.error(e); process.exit(1); });


