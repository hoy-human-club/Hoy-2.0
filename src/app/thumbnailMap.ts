/**
 * The generated map of preview thumbnails, in its own chunk.
 *
 * `npm run thumbnails` writes them next to the full-size captures:
 *   docs/screenshots/<CODE>/thumb-<lang>-desktop[-dark].jpg   640×400
 *   docs/screenshots/<CODE>/thumb-<lang>-phone[-dark].jpg     195×422
 *
 * Nearly five hundred URLs is ~86 kB of strings, so this module is imported dynamically by
 * src/app/thumbnails.ts rather than sitting in the entry chunk: previews show their idle tile for
 * the one frame it takes to arrive.
 */
const files = import.meta.glob<string>(['../../docs/screenshots/**/thumb-*.jpg', '!../../docs/screenshots/M-14/**', '!../../docs/screenshots/M-14a/**'], { query: '?url', import: 'default', eager: true });

const strip = (k: string) => k.replace(/^(\.\.\/)+/, ''); // → 'docs/screenshots/…'

export const thumbs: ReadonlyMap<string, string> = new Map(Object.entries(files).map(([k, url]) => [strip(k), url]));
