// web/src/components/math-race/Arena.tsx
import React, { useEffect, useState } from 'react';
import type { GameState, PlayerId } from '../../game/types';

interface Props {
  state: GameState;
  onSubmit: (p: PlayerId, v: number) => void;
  onChange: (p: PlayerId, s: string) => void;
}

export function Arena({ state, onSubmit, onChange }: Props) {
  // HARD VISIBLE DIAGNOSTICS
  useEffect(() => {
    console.log('[MR:UI] Arena mounted. status=', state.status, 'round=', state.round.index);
    return () => console.log('[MR:UI] Arena unmounted.');
  }, [state.status, state.round.index]);

  const [localP1, setLocalP1] = useState(state.players.p1.input ?? '');

  useEffect(() => {
    setLocalP1(state.players.p1.input ?? '');
  }, [state.players.p1.input]);

  const locked = state.round.locked || state.status !== 'running';
  const problemText =
    state.round.problem ? state.round.problem.prompt : '(no problem generated)';

  return (
    <div
      style={{
        border: '3px solid #444',
        padding: 16,
        borderRadius: 12,
        background: '#fffdfa',
      }}
    >
      <div style={{ marginBottom: 8, fontSize: 18, fontWeight: 700, color: '#111' }}>
        RUNNING • Round {state.round.index + 1}
      </div>

      <div style={{ marginBottom: 12, fontSize: 32, fontWeight: 800, color: '#111' }}>
        {problemText}
      </div>

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#111' }}>
            P1 Score: {state.players.p1.score}
          </div>
          <input
            aria-label="P1 Answer"
            value={localP1}
            onChange={(e) => {
              setLocalP1(e.target.value);
              onChange('p1', e.target.value);
            }}
            style={{
              width: '100%',
              padding: 10,
              fontSize: 20,
              border: '2px solid #888',
              borderRadius: 8,
            }}
            disabled={locked}
          />
          <button
            onClick={() => {
              const n = Number(localP1.trim());
              console.log('[MR:UI] P1 submit click ->', n);
              if (Number.isFinite(n)) onSubmit('p1', n);
            }}
            style={{
              marginTop: 8,
              padding: '10px 16px',
              fontWeight: 700,
              fontSize: 16,
              borderRadius: 8,
              border: '2px solid #111',
              background: locked ? '#ddd' : '#ffd54d',
              cursor: locked ? 'not-allowed' : 'pointer',
            }}
            disabled={locked}
          >
            Submit P1
          </button>
        </div>

        <div style={{ minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#111' }}>
            {state.players.p2.name} Score: {state.players.p2.score}{' '}
            {state.players.p2.isBot ? '(CPU)' : ''}
          </div>
          {state.players.p2.isBot ? (
            <div style={{ color: '#333' }}>CPU answers automatically…</div>
          ) : (
            <>
              <input
                aria-label="P2 Answer"
                value={state.players.p2.input ?? ''}
                onChange={(e) => onChange('p2', e.target.value)}
                style={{
                  width: '100%',
                  padding: 10,
                  fontSize: 20,
                  border: '2px solid #888',
                  borderRadius: 8,
                }}
                disabled={locked}
              />
              <button
                onClick={() => {
                  const n = Number((state.players.p2.input ?? '').trim());
                  console.log('[MR:UI] P2 submit click ->', n);
                  if (Number.isFinite(n)) onSubmit('p2', n);
                }}
                style={{
                  marginTop: 8,
                  padding: '10px 16px',
                  fontWeight: 700,
                  fontSize: 16,
                  borderRadius: 8,
                  border: '2px solid #111',
                  background: locked ? '#ddd' : '#90caf9',
                  cursor: locked ? 'not-allowed' : 'pointer',
                }}
                disabled={locked}
              >
                Submit P2
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 14, color: '#333' }}>
        {locked ? 'Round locked / resolving…' : 'Type your answer and press Submit.'}
      </div>
    </div>
  );
}
