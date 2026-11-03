import type { en } from './en';

type Widen<T> = { -readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };

/** Elke taal moet exact dezelfde sleutels hebben als Engels. */
export type Dictionary = Widen<typeof en>;

type Leaves<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MsgKey = Leaves<typeof en>;
export type Vars = Record<string, string | number>;

export type Lang = 'en' | 'nl' | 'fr' | 'de' | 'es' | 'it' | 'pt';

/** Talen waarin de langere teksten (helpcentrum, sjablonen, startpagina) bestaan. Andere talen tonen die in het Engels. */
export type ContentLang = 'en' | 'nl';
