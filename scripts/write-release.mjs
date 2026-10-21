import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
// PR workflows may check out head while GITHUB_SHA names GitHub's synthetic merge.
// Describe the code actually built; the event SHA is a fallback only outside a Git checkout.
let sourceCommit;
try { sourceCommit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
catch { sourceCommit = process.env.GITHUB_SHA; }
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Invalid release source commit');
writeFileSync('dist/release.json', JSON.stringify({ version, sourceCommit }) + '\n');
console.log(`Release manifest: ${version} ${sourceCommit}`);
