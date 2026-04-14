import { vi } from 'vitest';

vi.mock('three', async (importOriginal) => {
  const actual = await importOriginal<typeof import('three')>();

  class MockWebGLRenderer {
    domElement = document.createElement('canvas');
    setSize        = vi.fn();
    setPixelRatio  = vi.fn();
    render         = vi.fn();
    dispose        = vi.fn();
  }

  return {
    ...actual,                          // keep ALL real Three.js exports
    WebGLRenderer: MockWebGLRenderer,   // only swap out WebGLRenderer
  };
});
