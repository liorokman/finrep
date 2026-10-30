// Runs before first paint so the page never flashes the wrong theme.
(function () {
  var q = new URLSearchParams(location.search);
  var saved = null;
  try { saved = localStorage.getItem('finrep.theme'); } catch (e) {}
  var theme = q.get('theme') || saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
})();
