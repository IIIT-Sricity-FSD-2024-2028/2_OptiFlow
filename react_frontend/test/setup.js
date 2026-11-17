// react_frontend/test/setup.js
// Global test setup for Vitest / React testing

if (typeof window !== 'undefined') {
  // Ensure sessionStorage is available
  if (!window.sessionStorage) {
    const store = new Map();
    window.sessionStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear(),
    };
  }
}

