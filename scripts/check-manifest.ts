/** Fails the build if manifest references drift or any referenced file is missing. */
import { existsSync } from 'node:fs';
import manifest from '../extension/manifest.json';

let failed = false;

function checkFile(label: string, relPath: string): void {
  if (!existsSync(new URL(`../extension/${relPath}`, import.meta.url))) {
    console.error(`manifest check: missing ${label} ${relPath}`);
    failed = true;
  }
}

checkFile('service worker', manifest.background.service_worker);
checkFile('options page', manifest.options_page);

for (const cs of manifest.content_scripts) {
  for (const js of cs.js) checkFile('content script', js);
}

if (manifest.background.service_worker !== 'background/worker.js') {
  console.error('manifest check: service_worker path drifted');
  failed = true;
}

if (failed) process.exit(1);
console.log('manifest check: all referenced files exist');