import React, { useEffect } from 'react';
import type { Problem } from '../../game/types';

export function ProblemCard({ problem }: { problem: Problem | null }) {
  useEffect(() => {
    console.debug('[MR:UI] ProblemCard mount/update:', problem);
  }, [problem]);

  if (!problem) {
    return (
      <div
        style={{
          border: '1px dashed #aaa',
          borderRadius: 8,
          padding: 16,
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        Waiting for problem…
      </div>
    );
  }

  return (
    <div
      style={{
        border: '1px solid #333',
        borderRadius: 10,
        padding: 16,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 96,
        fontFamily: 'system-ui, sans-serif',
        background: '#fff',
      }}
    >
      <span
        style={{
          fontSize: 28,
          letterSpacing: 0.5,
          color: '#111',
        }}
      >
        {problem.prompt}
      </span>
    </div>
  );
}
