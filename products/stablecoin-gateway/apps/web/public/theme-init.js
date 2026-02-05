// RISK-087: Extracted from inline script to eliminate CSP unsafe-inline for scripts.
// This runs before React mounts to prevent flash of wrong theme.
(function() {
  var t = localStorage.getItem('stableflow-theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
})();
