import { describe, expect, it } from 'vitest';
import { ARTICLES, CATEGORIES, findArticle, searchArticles } from './help';

describe('helpcentrum', () => {
  it('heeft unieke slugs in een geldige categorie', () => {
    expect(new Set(ARTICLES.map((a) => a.slug)).size).toBe(ARTICLES.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const a of ARTICLES) expect(cats.has(a.category)).toBe(true);
  });
  it('elke categorie heeft minstens één artikel', () => {
    for (const c of CATEGORIES) expect(ARTICLES.some((a) => a.category === c.id)).toBe(true);
  });
  it('elke tekst bestaat in beide talen', () => {
    for (const a of ARTICLES) {
      const texts = [
        a.title,
        a.summary,
        ...a.blocks.flatMap((b) => ('text' in b ? [b.text] : b.items)),
      ];
      for (const t of texts) {
        expect(t.en.trim().length, a.slug).toBeGreaterThan(0);
        expect(t.nl.trim().length, a.slug).toBeGreaterThan(0);
      }
    }
  });
  it('zoekt in de gekozen taal, op alle woorden', () => {
    expect(searchArticles('excel import', 'en').map((a) => a.slug)).toContain('schedule-import');
    expect(searchArticles('portofoon', 'nl').map((a) => a.slug)).toContain('announcements');
    expect(searchArticles('', 'en')).toHaveLength(ARTICLES.length);
    expect(findArticle('bestaat-niet')).toBeUndefined();
  });
});
