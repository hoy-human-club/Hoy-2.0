import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
const sourceCommit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(sourceCommit)) throw new Error('Invalid release source commit');
writeFileSync('dist/release.json', JSON.stringify({ version, sourceCommit }) + '\n');
console.log(`Release manifest: ${version} ${sourceCommit}`);
