import { en } from './en';
import { nl } from './nl';
import { fr } from './fr';
import { de } from './de';
import { es } from './es';
import { it } from './it';
import { pt } from './pt';
import type { ContentLang, Dictionary, Lang, MsgKey, Vars } from './types';

export type { ContentLang, Lang, MsgKey, Vars } from './types';

export const LANGUAGES: { id: Lang; label: string; locale: string }[] = [
  { id: 'en', label: 'English', locale: 'en-GB' }, // en-GB: 24-uursklok en dag/maand
  { id: 'nl', label: 'Nederlands', locale: 'nl-BE' },
  { id: 'fr', label: 'Français', locale: 'fr-BE' },
  { id: 'de', label: 'Deutsch', locale: 'de-DE' },
  { id: 'es', label: 'Español', locale: 'es-ES' },
  { id: 'it', label: 'Italiano', locale: 'it-IT' },
  { id: 'pt', label: 'Português', locale: 'pt-PT' },
];

const DICTS: Record<Lang, Dictionary> = { en, nl, fr, de, es, it, pt };

/** Taal voor de langere inhoud: Nederlands of anders Engels. */
export function contentLang(lang: Lang): ContentLang {
  return lang === 'nl' ? 'nl' : 'en';
}

export function localeFor(lang: Lang): string {
  return LANGUAGES.find((l) => l.id === lang)?.locale ?? 'en-GB';
}

export function translate(lang: Lang, key: MsgKey, vars?: Vars): string {
  const lookup = (dict: Dictionary): string | undefined => {
    let node: unknown = dict;
    for (const part of key.split('.')) node = (node as Record<string, unknown> | undefined)?.[part];
    return typeof node === 'string' ? node : undefined;
  };
  const text = lookup(DICTS[lang]) ?? lookup(en) ?? key;
  return vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => String(vars[k] ?? m)) : text;
}

/** Fout met een vertaalbare sleutel, zodat elke laag in de juiste taal meldt. */
export class AppError extends Error {
  constructor(
    public readonly key: MsgKey,
    public readonly vars?: Vars,
  ) {
    super(key);
  }
}

export function isLang(v: unknown): v is Lang {
  return typeof v === 'string' && LANGUAGES.some((l) => l.id === v);
}
