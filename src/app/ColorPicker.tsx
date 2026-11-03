import { Check } from 'lucide-react';
import { PALETTE, type PaletteColor } from '@/lib/permissions';
import { useT } from '@/lib/usePrefs';

/** Kies een kleur uit het palet. Kleur is nooit de enige betekenis: er staat altijd een naam bij. */
export function ColorPicker(props: { value: PaletteColor; onChange: (c: PaletteColor) => void }) {
  const { t } = useT();
  return (
    <div className="swatches" role="radiogroup" aria-label={t('common.colour')}>
      {PALETTE.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={props.value === c}
          aria-label={c}
          className="swatch"
          data-color={c}
          onClick={() => props.onChange(c)}
        >
          <span className="swatch-dot" style={{ background: 'var(--c)' }}>
            {props.value === c && <Check aria-hidden size={18} />}
          </span>
        </button>
      ))}
    </div>
  );
}
