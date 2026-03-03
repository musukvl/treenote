/**
 * Patches electron-builder to treat 7-Zip exit code 2 (warnings) as success.
 *
 * Problem: winCodeSign archive contains macOS symlinks that can't be created
 * on Windows without admin privileges. 7-Zip extracts everything else but
 * returns exit code 2. electron-builder treats this as fatal and retries
 * indefinitely.
 *
 * Fix: Change the error handler in executeAppBuilder() to resolve (succeed)
 * when exit code is 2, since the extracted files are perfectly usable.
 *
 * Usage: node scripts/patch-builder.cjs [--revert]
 */
const fs = require('fs');
const path = require('path');

const utilPath = path.join(__dirname, '..', 'node_modules', 'builder-util', 'out', 'util.js');

const ORIGINAL = `if (error instanceof ExecError && error.exitCode === 2) {
                    error.alreadyLogged = true;
                }
                reject(error);`;

const PATCHED = `if (error instanceof ExecError && error.exitCode === 2) {
                    error.alreadyLogged = true;
                    resolve("");
                    return;
                }
                reject(error);`;

const revert = process.argv.includes('--revert');

const content = fs.readFileSync(utilPath, 'utf8');

if (revert) {
  if (content.includes(PATCHED)) {
    fs.writeFileSync(utilPath, content.replace(PATCHED, ORIGINAL));
    console.log('Reverted builder-util patch.');
  } else {
    console.log('Nothing to revert (already original).');
  }
} else {
  if (content.includes(ORIGINAL)) {
    fs.writeFileSync(utilPath, content.replace(ORIGINAL, PATCHED));
    console.log('Patched builder-util: exit code 2 treated as success.');
  } else if (content.includes(PATCHED)) {
    console.log('Already patched.');
  } else {
    console.error('ERROR: Could not find expected code in util.js. electron-builder version may have changed.');
    process.exit(1);
  }
}
