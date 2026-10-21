// RS-09: fictional deterministic UTC instants, no backend or browser clock dependency.
import assert from 'node:assert/strict';
import { canReschedule, rescheduleDeadline, assertRescheduleAllowed, RESCHEDULE_CUTOFF_HOURS } from '../src/modules/customer/reschedule.ts';
const start = '2026-11-01T18:10:00Z';
const deadline = Date.parse('2026-11-01T06:10:00Z');
assert.equal(RESCHEDULE_CUTOFF_HOURS, 12);
assert.equal(rescheduleDeadline(start), deadline);
assert.equal(canReschedule(start, deadline - 1), true, 'one millisecond before deadline');
assert.equal(canReschedule(start, deadline), true, 'exactly 12 hours is allowed');
assert.equal(canReschedule(start, deadline + 1), false, 'one millisecond after deadline');
assert.doesNotThrow(() => assertRescheduleAllowed(start, deadline));
assert.throws(() => assertRescheduleAllowed(start, deadline + 1), /reschedule_cutoff/);
assert.equal(canReschedule(start, Date.parse(start)), false, 'started class');
assert.equal(canReschedule('invalid', deadline), false, 'invalid date fails closed');
assert.equal(canReschedule(start, NaN), false, 'invalid clock fails closed');
assert.equal(canReschedule('2026-11-01T13:10:00-05:00', deadline), true, 'same Bogota instant');
console.log('RS-09 cutoff: before / exact / after, invalid inputs, started class and timezone pass');
