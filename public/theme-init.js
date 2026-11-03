// Thema en taal vóór de eerste render zetten, zodat er geen lichte flits is backstage.
// Apart bestand (geen inline script) zodat de Content-Security-Policy streng kan blijven.
try {
  var t = localStorage.getItem('aof-theme');
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
} catch (e) {
  /* privémodus: standaardthema */
}
