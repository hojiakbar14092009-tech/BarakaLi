import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// The default 1 s is too tight when the API suite runs in parallel and the CPU is saturated.
configure({ asyncUtilTimeout: 10_000 });

// jsdom has no WebGL: report "no context" quietly so the 3D fallback path can be tested.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;

// jsdom has no IntersectionObserver: scroll reveals treat everything as already in view.
class InView implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '';
  readonly thresholds = [];
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element): void {
    this.callback([{ isIntersecting: true, target } as unknown as IntersectionObserverEntry], this);
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}
Object.defineProperty(globalThis, 'IntersectionObserver', { value: InView, writable: true });
