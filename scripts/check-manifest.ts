/** Fails the build if manifest content scripts drift from the bundle outputs. */
import manifest from '../extension/manifest.json';

const EXPECTED: Record<string, string[]> = {
  'linkedin.js': ['content/linkedin.js'],
  'doccafe.js': ['content/doccafe.js'],
};

let failed = false;
for (const cs of manifest.content_scripts) {
  const entry = cs.js[cs.js.length - 1];
  const ok = Object.values(EXPECTED).some((files) => files.includes(entry));
  if (!ok) {
    console.error(`manifest check: unexpected content-script entry ${entry}`);
    failed = true;
  }
}
for (const files of Object.values(EXPECTED)) {
  for (const f of files) {
    if (!manifest.content_scripts.some((cs) => cs.js.includes(f))) {
      console.error(`manifest check: missing bundle ${f}`);
      failed = true;
    }
  }
}
const worker = manifest.background.service_worker;
if (worker !== 'background/worker.js' || manifest.options_page !== 'options/options.html') {
  console.error('manifest check: worker or options_page path drifted');
  failed = true;
}
if (failed) process.exit(1);
console.log('manifest check: bundles match content scripts');
