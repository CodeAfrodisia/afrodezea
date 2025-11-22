// web/src/components/math-race/ResultModal.tsx
import React from 'react';

type Props = {
  title: string;
  p1: number | undefined;
  p2: number | undefined;
  onRematch: () => void;
  onChangeSettings: () => void;
};

export function ResultModal({
  title,
  p1,
  p2,
  onRematch,
  onChangeSettings,
}: Props) {
  // Defensive guards (helps during hot reloads)
  const s1 = Number.isFinite(p1) ? (p1 as number) : 0;
  const s2 = Number.isFinite(p2) ? (p2 as number) : 0;

  console.log('[MR:UI] ResultModal render', { title, p1: s1, p2: s2 });

  const rows = [
    { label: 'P1', score: s1 },
    { label: 'CPU / P2', score: s2 },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="max-w-sm border rounded-lg p-4 shadow-sm bg-white text-black"
    >
      <h3 className="text-lg font-semibold mb-3">{title}</h3>

      <div className="space-y-2 mb-4">
        {rows.map((r) => (
          <div key={r.label} className="flex justify-between">
            <span>{r.label}</span>
            <span className="font-medium">{r.score}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          className="border rounded px-3 py-1 hover:bg-gray-100"
          onClick={() => {
            console.log('[MR:UI] ResultModal -> Rematch');
            onRematch();
          }}
        >
          Rematch
        </button>
        <button
          className="border rounded px-3 py-1 hover:bg-gray-100"
          onClick={() => {
            console.log('[MR:UI] ResultModal -> Change Settings');
            onChangeSettings();
          }}
        >
          Change Settings
        </button>
      </div>
    </div>
  );
}

export default ResultModal;
