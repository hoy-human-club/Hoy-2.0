/** RS-09 source rule. Separate from draft cancellation-credit and payment-hold settings. */
export const RESCHEDULE_CUTOFF_HOURS = 12;

export function rescheduleDeadline(startsAt: string): number {
  return new Date(startsAt).getTime() - RESCHEDULE_CUTOFF_HOURS * 60 * 60 * 1000;
}

/** The source permits moving up to 12 hours before start, including the exact deadline. */
export function canReschedule(startsAt: string, now = Date.now()): boolean {
  const deadline = rescheduleDeadline(startsAt);
  return Number.isFinite(deadline) && Number.isFinite(now) && now <= deadline;
}

export function assertRescheduleAllowed(startsAt: string, now = Date.now()): void {
  if (!canReschedule(startsAt, now)) throw new Error('reschedule_cutoff');
}
