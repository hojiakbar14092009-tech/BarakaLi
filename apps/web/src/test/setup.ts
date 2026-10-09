import '@testing-library/jest-dom/vitest';

// jsdom has no WebGL: report "no context" quietly so the 3D fallback path can be tested.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;
