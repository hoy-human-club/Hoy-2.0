/** Fictional, memory-only recovery challenge. No provider, password, storage or session effects. */
export type RecoveryStatus = 'idle' | 'sending' | 'active' | 'expired' | 'invalidated' | 'verified' | 'saving' | 'complete';
export interface RecoveryState {
  status: RecoveryStatus;
  code: string | null;
  expiresAt: number | null;
  wrong: number;
  resendAt: number;
}
export class MockRecovery {
  private generation = 0;
  private value: RecoveryState;
  constructor(resendAt = 0) {
    this.value = { status: 'idle', code: null, expiresAt: null, wrong: 0, resendAt: Number.isFinite(resendAt) ? Math.max(0, resendAt) : 0 };
  }
  get state(): RecoveryState { return { ...this.value }; }
  beginSend(now: number): number | null {
    if (this.value.status === 'sending' || this.value.status === 'saving' || now < this.value.resendAt) return null;
    this.value = { ...this.value, status: 'sending', code: null, expiresAt: null, wrong: 0 };
    return ++this.generation; // Revoke the previous challenge before the simulated send starts.
  }
  finishSend(token: number, code: string, now: number, validMinutes: number, resendSeconds: number): boolean {
    if (token !== this.generation || this.value.status !== 'sending') return false;
    if (!/^\d{6}$/.test(code) || !Number.isFinite(now) || !Number.isFinite(validMinutes) || validMinutes <= 0 || !Number.isFinite(resendSeconds) || resendSeconds < 0) return false;
    this.value = { status: 'active', code, expiresAt: now + validMinutes * 60_000, wrong: 0, resendAt: now + resendSeconds * 1000 };
    return true;
  }
  expire(now: number): void {
    if (this.value.status === 'active' && this.value.expiresAt !== null && now >= this.value.expiresAt) this.value = { ...this.value, status: 'expired', code: null };
  }
  verify(code: string, now: number): 'verified' | 'wrong' | 'expired' | 'invalidated' | 'unavailable' {
    this.expire(now);
    if (this.value.status === 'expired' || this.value.status === 'invalidated') return this.value.status;
    if (this.value.status !== 'active') return 'unavailable';
    if (this.value.code === code) {
      this.value = { ...this.value, status: 'verified', code: null };
      return 'verified';
    }
    const wrong = this.value.wrong + 1;
    this.value = { ...this.value, wrong, status: wrong >= 3 ? 'invalidated' : 'active', code: wrong >= 3 ? null : this.value.code };
    return wrong >= 3 ? 'invalidated' : 'wrong';
  }
  beginSave(): number | null {
    if (this.value.status !== 'verified') return null;
    this.value = { ...this.value, status: 'saving' };
    return ++this.generation;
  }
  finishSave(token: number): boolean {
    if (token !== this.generation || this.value.status !== 'saving') return false;
    this.value = { ...this.value, status: 'complete' };
    return true;
  }
  cancel(): void {
    ++this.generation;
    this.value = { status: 'idle', code: null, expiresAt: null, wrong: 0, resendAt: this.value.resendAt };
  }
}
