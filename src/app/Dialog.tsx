import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

/** Toegankelijk dialoogvenster op basis van <dialog> (focus en Esc werken vanzelf). */
export function Dialog(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (props.open && !d.open) d.showModal();
    if (!props.open && d.open) d.close();
  }, [props.open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="dialog-title"
      onClose={props.onClose}
      onCancel={props.onClose}
    >
      {props.open && (
        <div className="stack">
          <div className="row">
            <h2 id="dialog-title" className="spacer">
              {props.title}
            </h2>
            <button type="button" className="icon-btn" aria-label="Sluiten" onClick={props.onClose}>
              <X aria-hidden size={22} />
            </button>
          </div>
          {props.children}
        </div>
      )}
    </dialog>
  );
}
