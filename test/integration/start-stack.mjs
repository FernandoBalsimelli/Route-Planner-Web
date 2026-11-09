import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const config = readFileSync('test/integration/supabase/config.toml', 'utf8');
assert.match(config, /project_id = "route_planner_ci_v3"/);
try {
  execFileSync('npx', ['--yes','supabase@3.0.0','--workdir','test/integration','start','-x','realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor'], { stdio: ['ignore','pipe','pipe'], maxBuffer: 16*1024*1024 });
  console.log('Disposable local Auth and REST stack started.');
} catch (error) {
  // Startup status can print generated local keys. Redact even these disposable values.
  const text = `${error.stdout || ''}\n${error.stderr || ''}`;
  const sanitized = text.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-local-jwt]').replace(/sb_(?:secret|publishable)_[A-Za-z0-9_-]+/g, '[redacted-local-key]').replace(/postgres(?:ql)?:\/\/[^\s]+/g, '[redacted-local-database-url]');
  console.error(sanitized.split('\n').slice(-50).join('\n'));
  throw Error('Disposable Supabase startup failed; see the redacted diagnostics above.');
}
