// Lightweight stub for reportWebVitals used by CRA templates.
// This avoids adding the `web-vitals` dependency while keeping the import stable.
export default function reportWebVitals(onPerfEntry) {
  if (typeof onPerfEntry === 'function') {
    try {
      // Provide a minimal stub metric so callers that expect a value don't crash.
      onPerfEntry({ name: 'reportWebVitals_stub', value: 0 });
    } catch (e) {
      // swallow errors from the callback
    }
  }
}
