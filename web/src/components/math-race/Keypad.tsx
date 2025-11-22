import React, { useEffect, useRef } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  label: string;
}

const keys = ['7','8','9','4','5','6','1','2','3','0','clr','ok'];

export function Keypad({ value, onChange, onSubmit, label }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') onChange(value + e.key);
      else if (e.key === 'Backspace') onChange('');
      else if (e.key === 'Enter') onSubmit();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [value, onChange, onSubmit]);

  return (
    <div ref={ref} aria-label={label} className="grid grid-cols-3 gap-2">
      {keys.map((k) => {
        const isOk = k === 'ok';
        const isClr = k === 'clr';
        return (
          <button
            key={k}
            onClick={() => { if (isOk) onSubmit(); else if (isClr) onChange(''); else onChange(value + k); }}
            className={`py-4 rounded-lg font-bold focus:outline-none focus:ring-4 ring-gold-400 transition ${
              isOk
                ? 'bg-gold-500 hover:bg-gold-600 text-charcoal-900'
                : isClr
                ? 'bg-wine-600 hover:bg-wine-700 text-cream-100'
                : 'bg-charcoal-700 hover:bg-charcoal-600 text-cream-100'
            }`}
          >
            {isOk ? 'Enter' : isClr ? 'Clear' : k}
          </button>
        );
      })}
      <div className="col-span-3 text-center text-2xl font-semibold mt-2">
        {value || '—'}
      </div>
    </div>
  );
}
