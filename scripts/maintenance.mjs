#!/usr/bin/env node
// Toggle the production site between coming-soon ("maintenance on") and the
// full storefront ("maintenance off"). Wraps `flyctl secrets set` so the
// operation is one command instead of four environment variables to remember.
//
// Usage:
//   pnpm maintenance on             # hide the site behind the coming-soon page
//   pnpm maintenance off            # launch — show the full storefront
//   pnpm maintenance status         # show current SITE_MODE / NOINDEX
//   pnpm maintenance on --app=...   # target a specific Fly app (default: obscuruslabs)
//
// Flags:
//   --app=<name>   Fly app to target (default "obscuruslabs")
//   --yes          Skip the launch-confirmation prompt
//   --dry-run      Print the flyctl command that would run, do nothing
//
// Requires FLY_API_TOKEN in the environment (or a logged-in flyctl).

import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const DEFAULT_APP = 'obscuruslabs';
const VALID_ACTIONS = new Set(['on', 'off', 'status']);

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const [k, v] = arg.slice(2).split('=');
      flags[k] = v ?? true;
    } else {
      positional.push(arg);
    }
  }
  return {
    action: positional[0],
    app: flags.app ?? DEFAULT_APP,
    yes: flags.yes === true,
    dryRun: flags['dry-run'] === true,
  };
}

function loadDotenvTokens() {
  // If FLY_API_TOKEN is already set, leave it alone. Otherwise try the repo's
  // .env (which stores FLYIO_API_KEY) so the script works out of the box.
  if (process.env.FLY_API_TOKEN) return;
  const envPath = new URL('../.env', import.meta.url);
  if (!existsSync(envPath)) return;
  const raw = readFileSync(envPath, 'utf8');
  const match = raw.match(/^FLYIO_API_KEY\s*=\s*"?([^"\n]+)"?/m);
  if (match) process.env.FLY_API_TOKEN = match[1];
}

function pickFlyctl() {
  const direct = spawnSync('command', ['-v', 'flyctl'], { shell: true });
  if (direct.status === 0) return { cmd: 'flyctl', args: [] };
  // Fallback: nix run, so the script works in the project's dev shell without
  // requiring a global install.
  return { cmd: 'nix', args: ['run', 'nixpkgs#flyctl', '--'] };
}

function runFlyctl({ cmd, args }, subArgs, { capture = false } = {}) {
  const fullArgs = [...args, ...subArgs];
  if (capture) {
    return spawnSync(cmd, fullArgs, { encoding: 'utf8' });
  }
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, fullArgs, { stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${fullArgs.join(' ')} exited ${code}`));
    });
  });
}

function parseSecretsList(stdout) {
  // `flyctl secrets list` is a plain table. We only need the NAME column to
  // know whether a key exists (values are never returned by the API).
  const names = new Set();
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('NAME')) continue;
    const name = trimmed.split(/\s+/)[0];
    if (name) names.add(name);
  }
  return names;
}

function parseConfigEnv(stdout) {
  // `flyctl config env -j` prints JSON { "env": { "KEY": "value", ... } }.
  try {
    const parsed = JSON.parse(stdout);
    return parsed.env ?? {};
  } catch {
    return {};
  }
}

async function status(flyctl, app) {
  const envResult = runFlyctl(flyctl, ['config', 'env', '-j', '-a', app], { capture: true });
  const secretsResult = runFlyctl(flyctl, ['secrets', 'list', '-a', app], { capture: true });

  const env = parseConfigEnv(envResult.stdout ?? '');
  const secrets = parseSecretsList(secretsResult.stdout ?? '');

  const siteMode = env.SITE_MODE ?? '(unset)';
  const noindex = env.NOINDEX ?? '(unset)';
  const isMaintenance = siteMode !== 'full';

  console.log('');
  console.log(`  app:         ${app}`);
  console.log(`  SITE_MODE:   ${siteMode}`);
  console.log(`  NOINDEX:     ${noindex}`);
  console.log(`  mode:        ${isMaintenance ? 'MAINTENANCE (coming-soon)' : 'LIVE (full storefront)'}`);
  console.log('');
  console.log(`  secrets set: ${[...secrets].sort().join(', ') || '(none)'}`);
  console.log('');
}

async function confirm(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`${question} (type "yes" to proceed) `)).trim();
  rl.close();
  return answer === 'yes';
}

async function setMode(flyctl, app, { siteMode, noindex, dryRun, skipConfirm, actionLabel }) {
  const secretArgs = [
    'secrets',
    'set',
    '-a',
    app,
    '--stage=false',
    `SITE_MODE=${siteMode}`,
    `NOINDEX=${noindex}`,
  ];

  console.log('');
  console.log(`  Action:      ${actionLabel}`);
  console.log(`  App:         ${app}`);
  console.log(`  SITE_MODE →  ${siteMode}`);
  console.log(`  NOINDEX →    ${noindex}`);
  console.log('');

  if (dryRun) {
    console.log(`  [dry-run] ${flyctl.cmd} ${[...flyctl.args, ...secretArgs].join(' ')}`);
    return;
  }

  if (siteMode === 'full' && !skipConfirm) {
    console.log('  This LAUNCHES the public site. Search engines will be allowed to index.');
    const ok = await confirm('  Proceed?');
    if (!ok) {
      console.log('  Aborted.');
      process.exitCode = 1;
      return;
    }
  }

  await runFlyctl(flyctl, secretArgs);
  console.log(`\n  Done. Fly will redeploy ${app}.`);
}

async function main() {
  const { action, app, yes, dryRun } = parseArgs(process.argv.slice(2));
  if (!VALID_ACTIONS.has(action)) {
    console.error('Usage: pnpm maintenance <on|off|status> [--app=<fly-app>] [--yes] [--dry-run]');
    process.exit(2);
  }

  loadDotenvTokens();
  const flyctl = pickFlyctl();

  if (action === 'status') {
    await status(flyctl, app);
    return;
  }

  if (action === 'on') {
    await setMode(flyctl, app, {
      siteMode: 'coming_soon',
      noindex: 'true',
      dryRun,
      skipConfirm: yes,
      actionLabel: 'maintenance ON — coming-soon page',
    });
    return;
  }

  if (action === 'off') {
    await setMode(flyctl, app, {
      siteMode: 'full',
      noindex: 'false',
      dryRun,
      skipConfirm: yes,
      actionLabel: 'maintenance OFF — launch full site',
    });
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
