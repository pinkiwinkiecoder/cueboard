// Publieke gegevens van Cueboard. Pas dit bestand aan als je een eigen
// kopie opzet: de rest van de site leest alles hieruit.

export const SITE = {
  name: 'Cueboard',
  creator: {
    name: 'Elias Azizov',
    /** Optionele link (bv. Instagram of LinkedIn). Leeg = geen link. */
    url: '',
  },
  /**
   * Publieke GitHub-repository met de code (open source, MIT).
   * Vul in zodra de repository bestaat, bv. 'https://github.com/jouwnaam/cueboard'.
   * Leeg = de links naar code en forum worden verborgen.
   */
  repoUrl: 'https://github.com/pinkiwinkiecoder/cueboard',
  license: 'MIT',
  year: 2026,
};

export const discussionsUrl = () => (SITE.repoUrl ? `${SITE.repoUrl}/discussions` : '');
export const issuesUrl = () => (SITE.repoUrl ? `${SITE.repoUrl}/issues` : '');
