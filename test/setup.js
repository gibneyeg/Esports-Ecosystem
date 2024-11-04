import { afterEach, vi } from "vitest";

// Mock fetch globally
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  })
);

afterEach(() => {
  vi.clearAllMocks();
});
