import "fake-indexeddb/auto";
import { beforeEach, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Override localStorage with an in-memory implementation. Node 26 provides an
// experimental global localStorage that throws on access, which breaks the
// app i18n module's top-level read. Because static imports are hoisted, we
// install the polyfill and THEN dynamically import the i18n module.
const store = new Map<string, string>();
const memoryStorage: Storage = {
  getItem: (k) => (store.has(k) ? store.get(k)! : null),
  setItem: (k, v) => void store.set(k, String(v)),
  removeItem: (k) => void store.delete(k),
  clear: () => store.clear(),
  key: (i) => Array.from(store.keys())[i] ?? null,
  get length() {
    return store.size;
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: memoryStorage,
  configurable: true,
  writable: true,
});

await import("./i18n-for-tests");

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
});
