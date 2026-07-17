// Shared jsdom polyfills needed by store/component code that assumes a browser.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock-url'
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = () => {}
}
