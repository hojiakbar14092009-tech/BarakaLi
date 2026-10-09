/** True when the browser can create a WebGL context; checked before any 3D code is downloaded. */
export function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    return context !== null && context !== undefined;
  } catch {
    return false;
  }
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function hasCoarsePointer(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
}

const HINT_KEY = 'barakali.viewerHintSeen';

export function hintAlreadySeen(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberHintSeen(): void {
  try {
    window.localStorage.setItem(HINT_KEY, '1');
  } catch {
    /* the hint may simply show again next time */
  }
}
