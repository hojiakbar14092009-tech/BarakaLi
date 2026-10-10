import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';

// The default 1 s is too tight when the API suite runs in parallel and the CPU is saturated.
configure({ asyncUtilTimeout: 5_000 });

// jsdom has no WebGL: report "no context" quietly so the 3D fallback path can be tested.
HTMLCanvasElement.prototype.getContext = (() =>
  null) as typeof HTMLCanvasElement.prototype.getContext;
