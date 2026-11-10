import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { appendFileSync } from 'node:fs';
import assert from 'node:assert/strict';

// Only local status is read. Never link or pull credentials from a hosted project.
const status = JSON.parse(execFileSync(resolve('test/integration/node_modules/.bin/supabase'), [ '--workdir', 'test/integration', 'status', '-o', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
const url = status.API_URL || status.api_url;
const key = status.PUBLISHABLE_KEY || status.SUPABASE_PUBLISHABLE_KEY || status.ANON_KEY || status.anon_key;
assert.equal(url, 'http://127.0.0.1:54321', 'fixture must target the disposable loopback stack');
assert.ok(typeof key === 'string' && key.length > 20, `missing public key; available fields: ${Object.keys(status).join(', ')}`);
assert.ok(process.env.GITHUB_ENV, 'this setup is for the isolated CI job');
console.log(`::add-mask::${key}`);
appendFileSync(process.env.GITHUB_ENV, `NEXT_PUBLIC_SUPABASE_URL=${url}\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}\nAPI_URL=http://127.0.0.1:4456\n`);
console.log('Configured only the local publishable key and loopback endpoints.');
