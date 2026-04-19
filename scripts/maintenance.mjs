#!/usr/bin/env node
// Toggle SITE_MODE between "coming_soon" and "full" on a Fly app. That is the
// only thing this script flips — NOINDEX is an *environment* property
// (staging should always be noindex; prod is noindex until we launch), set via
// `[env]` in fly.toml / fly.staging.toml, not here.
//
// Usage (default target is STAGING — safer, you have to opt into prod):
//   pnpm maintenance on                    # staging → coming-soon
//   pnpm maintenance off                   # staging → full storefront
//   pnpm maintenance status                # staging status
//
//   pnpm maintenance on  production        # prod → coming-soon
//   pnpm maintenance off production        # prod → full storefront
//   pnpm maintenance status production     # prod status
//
//   pnpm maintenance on --app=foo          # target a raw Fly app name
//
// Positional env aliases: "staging" | "stg" | "s" → obscuruslabs-staging;
// "prod" | "production" | "p" → obscuruslabs. Anything else is passed as-is.
//
// Flags:
//   --app=<name>   Fly app to target (overrides positional env)
//   --yes          Skip the launch-confirmation prompt when turning OFF on prod
//   --dry-run      Print the flyctl command that would run, do nothing
//
// Auth: uses whatever flyctl already has (env var, or `flyctl auth login`
// config). Run `flyctl auth whoami` to check who you are.

import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

const PROD_APP = 'obscuruslabs';
const STAGING_APP = 'obscuruslabs-staging';
const ENV_ALIASES = {
  prod: PROD_APP,
  production: PROD_APP,
  p: PROD_APP,
  staging: STAGING_APP,
  stg: STAGING_APP,
  s: STAGING_APP,
};
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
  const action = positional[0];
  const envArg = positional[1];
  const appFromEnvArg = envArg
    ? ENV_ALIASES[envArg.toLowerCase()] ?? envArg
    : undefined;
  return {
    action,
    app: flags.app ?? appFromEnvArg ?? STAGING_APP,
    yes: flags.yes === true,
    dryRun: flags['dry-run'] === true,
  };
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

// Strip ANSI escapes that flyctl uses for bold headers.
function stripAnsi(s) {
  return s.replace(/\x1B\[[0-9;]*m/g, '');
}

function parseSecretsList(stdout) {
  const names = new Set();
  for (const line of stripAnsi(stdout).split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('NAME')) continue;
    const name = trimmed.split(/\s+/)[0];
    if (name) names.add(name);
  }
  return names;
}

// `flyctl config env` prints two sections: "Secrets" and "Environment
// Variables". We only want the second. Each row looks like:
//   NEXT_PUBLIC_SITE_URL │ https://stg.obscuruslabs.com
function parseConfigEnv(stdout) {
  const env = {};
  const clean = stripAnsi(stdout);
  const idx = clean.indexOf('Environment Variables');
  if (idx < 0) return env;
  const section = clean.slice(idx).split('\n').slice(1); // drop the header line
  for (const line of section) {
    const t = line.trim();
    if (!t || t.startsWith('NAME')) continue;
    const [name, ...rest] = t.split('│');
    if (!name || rest.length === 0) continue;
    env[name.trim()] = rest.join('│').trim();
  }
  return env;
}

async function status(flyctl, app) {
  const envResult = runFlyctl(flyctl, ['config', 'env', '-a', app], { capture: true });
  const secretsResult = runFlyctl(flyctl, ['secrets', 'list', '-a', app], { capture: true });

  const env = parseConfigEnv(envResult.stdout ?? '');
  const secrets = parseSecretsList(secretsResult.stdout ?? '');

  const siteMode = env.SITE_MODE ?? '(unset)';
  const noindex = env.NOINDEX ?? '(unset)';
  const isMaintenance = siteMode !== 'full';

  console.log('');
  console.log(`  app:         ${app}`);
  console.log(`  SITE_MODE:   ${siteMode}`);
  console.log(`  NOINDEX:     ${noindex}  ${noindex === 'true' ? '(not indexed)' : noindex === 'false' ? '(INDEXED)' : ''}`);
  console.log(`  mode:        ${isMaintenance ? 'MAINTENANCE (coming-soon)' : 'LIVE (full storefront)'}`);
  console.log('');
  console.log(`  secrets set: ${[...secrets].sort().join(', ') || '(none)'}`);
  console.log('');

  if (app === PROD_APP && !isMaintenance && noindex === 'true') {
    console.log('  NOTE: prod is LIVE but still noindex. To allow indexing at launch:');
    console.log(`    flyctl secrets unset -a ${app} NOINDEX  # or set NOINDEX=false`);
    console.log('');
  }
}

async function confirm(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(`${question} (type "yes" to proceed) `)).trim();
  rl.close();
  return answer === 'yes';
}

async function setSiteMode(flyctl, app, { siteMode, dryRun, skipConfirm, actionLabel }) {
  const secretArgs = ['secrets', 'set', '-a', app, '--stage=false', `SITE_MODE=${siteMode}`];

  console.log('');
  console.log(`  Action:      ${actionLabel}`);
  console.log(`  App:         ${app}`);
  console.log(`  SITE_MODE →  ${siteMode}`);
  console.log(`  NOINDEX →    (unchanged — set via [env] in fly.{staging,}.toml)`);
  console.log('');

  if (dryRun) {
    console.log(`  [dry-run] ${flyctl.cmd} ${[...flyctl.args, ...secretArgs].join(' ')}`);
    return;
  }

  if (siteMode === 'full' && app === PROD_APP && !skipConfirm) {
    console.log('  This shows the full storefront on PROD.');
    console.log('  (Indexing is still controlled by NOINDEX — see `pnpm maintenance status`.)');
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
    console.error('Usage: pnpm maintenance <on|off|status> [staging|production] [--yes] [--dry-run]');
    console.error('  (default target is staging — add "production" to target prod)');
    process.exit(2);
  }

  const flyctl = pickFlyctl();

  if (action === 'status') {
    await status(flyctl, app);
    return;
  }

  if (action === 'on') {
    await setSiteMode(flyctl, app, {
      siteMode: 'coming_soon',
      dryRun,
      skipConfirm: yes,
      actionLabel: 'maintenance ON — coming-soon page',
    });
    return;
  }

  if (action === 'off') {
    await setSiteMode(flyctl, app, {
      siteMode: 'full',
      dryRun,
      skipConfirm: yes,
      actionLabel: 'maintenance OFF — full storefront',
    });
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
