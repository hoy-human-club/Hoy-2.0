/**
 * 0163 · Depth — a very subtle 3D response for the surfaces people choose from (tiles, interactive cards, KPI tiles,
 * class cards, quick actions). One delegated pointer listener for the whole app: the surface under a fine pointer
 * tilts at most DEPTH_MAX_DEG toward it, lifts a few pixels and catches a soft light where the pointer is. Nothing runs
 * on touch, nothing runs when the person asks for reduced motion, and nothing moves layout (transform only).
 * The selector list is the contract with src/styles/motion.css, which draws the transform, the shadow and the sheen.
 */
export const DEPTH_SELECTOR = [
  '[data-depth]', '.hub-tile:not(.is-row)', '.card.is-interactive', '.stat', '.classcard', '.cust-quick-btn',
].join(', ');
// 0165: 2.5° read as flat on wide dashboard tiles; 4° is visible without pulling attention.
const DEPTH_MAX_DEG = 4;

let installed = false;

export function installDepth(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let current: HTMLElement | null = null;
  let frame = 0;
  let last: PointerEvent | null = null;

  const release = (el: HTMLElement | null) => {
    if (!el) return;
    el.classList.remove('is-depth');
    for (const v of ['--depth-rx', '--depth-ry', '--depth-mx', '--depth-my']) el.style.removeProperty(v);
  };

  const paint = () => {
    frame = 0;
    if (!current || !last) return;
    const r = current.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const x = Math.min(1, Math.max(0, (last.clientX - r.left) / r.width));
    const y = Math.min(1, Math.max(0, (last.clientY - r.top) / r.height));
    current.style.setProperty('--depth-ry', `${((x - 0.5) * 2 * DEPTH_MAX_DEG).toFixed(2)}deg`);
    current.style.setProperty('--depth-rx', `${((0.5 - y) * 2 * DEPTH_MAX_DEG).toFixed(2)}deg`);
    current.style.setProperty('--depth-mx', `${(x * 100).toFixed(1)}%`);
    current.style.setProperty('--depth-my', `${(y * 100).toFixed(1)}%`);
  };

  document.addEventListener('pointermove', (e) => {
    if (!fine.matches || reduce.matches || e.pointerType !== 'mouse') { if (current) { release(current); current = null; } return; }
    const target = (e.target as Element | null)?.closest<HTMLElement>(DEPTH_SELECTOR) ?? null;
    if (target !== current) { release(current); current = target; current?.classList.add('is-depth'); }
    if (!current) return;
    last = e;
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });

  document.addEventListener('pointerleave', () => { release(current); current = null; });
  window.addEventListener('blur', () => { release(current); current = null; });
}
