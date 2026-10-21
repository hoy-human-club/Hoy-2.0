// SW-07: URL/validation rules only, with fictional edge cases; no external map requests.
import assert from 'node:assert/strict';
import { mapCoordinates, mapEmbedUrl } from '../src/components/molecule/MapSlot/mapLocation.ts';
const fallback = { lat: 1, lng: 2 };
assert.deepEqual(mapCoordinates(0, 0, fallback), { lat: 0, lng: 0 });
for (const pair of [[NaN, 2], [1, Infinity], [91, 2], [1, -181]]) assert.deepEqual(mapCoordinates(...pair, fallback), fallback);
assert.equal(mapEmbedUrl('none', 1, 2), null);
assert.equal(mapEmbedUrl('google', NaN, 2), null);
assert.equal(new URL(mapEmbedUrl('google', 1, 2)).searchParams.get('q'), '1,2');
assert.equal(new URL(mapEmbedUrl('osm', 1, 2)).searchParams.get('marker'), '1,2');
assert.equal(new URL(mapEmbedUrl('osm', 90, 180)).searchParams.get('bbox'), '179.99400,89.99580,180.00000,90.00000');
console.log('SW-07 coordinate pair validation, zero coordinates, Google/OSM URLs and bounds pass');
