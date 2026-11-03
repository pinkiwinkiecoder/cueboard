import { PALETTE, type PaletteColor } from '@/lib/permissions';

/** Vaste kleur per naam, zodat iemand altijd dezelfde kleur heeft. */
function colorFor(name: string): PaletteColor {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length] ?? 'violet';
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '?';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase();
}

export function Avatar({ name, size }: { name: string; size?: number }) {
  return (
    <span
      className="avatar"
      data-color={colorFor(name)}
      aria-hidden
      style={size ? { width: size, height: size } : undefined}
    >
      {initials(name)}
    </span>
  );
}
