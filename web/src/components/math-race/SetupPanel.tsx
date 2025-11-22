import React from 'react';
import type { Settings, Mode, Difficulty } from '../../game/types';

type Props = {
  /** Old prop name some versions used */
  initial?: Settings;
  /** New prop name we passed from MathRace.tsx */
  settings?: Settings;

  onStart: () => void;
  onChangeMode: (m: Mode) => void;
  onChangeVersus: (v: 'cpu' | 'local') => void;
  onChangeDifficulty: (d: Difficulty) => void;
  onChangeRoundTimeout: (sec: number | null) => void;
};

export function SetupPanel({
  initial,
  settings,
  onStart,
  onChangeMode,
  onChangeVersus,
  onChangeDifficulty,
  onChangeRoundTimeout,
}: Props) {
  const s: Settings | undefined = settings ?? initial;

  // Defensive guard so we never crash on undefined props
  if (!s) {
    console.error('[MR:UI] SetupPanel missing settings/initial; rendering fallback');
    return (
      <div style={{ border: '1px solid #c00', padding: 12, borderRadius: 8 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>
          Setup unavailable (no settings provided)
        </div>
        <button
          onClick={onStart}
          style={{ padding: '6px 10px', border: '1px solid #333', borderRadius: 6 }}
        >
          Try Start Anyway
        </button>
      </div>
    );
  }

  console.debug('[MR:UI] SetupPanel using source:', settings ? 'settings' : 'initial', s);

  const isTimed = s.mode.kind === 'timed';
  const sec = isTimed ? s.mode.seconds : 60;

  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 10, padding: 10 }}>
      {/* Mode */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Mode</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => onChangeMode({ kind: 'timed', seconds: sec })}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #333',
              background: isTimed ? '#eee' : '#fff',
            }}
          >
            Timed
          </button>
          <button
            onClick={() => onChangeMode({ kind: 'target', target: 10 })}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #333',
              background: !isTimed ? '#eee' : '#fff',
            }}
          >
            Target Score
          </button>

          {isTimed && (
            <label style={{ marginLeft: 10 }}>
              Seconds:{' '}
              <select
                value={sec}
                onChange={(e) =>
                  onChangeMode({ kind: 'timed', seconds: Number(e.target.value) })
                }
              >
                {[10, 20, 30, 45, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </div>

      {/* Opponent */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Opponent</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button
            onClick={() => onChangeVersus('cpu')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #333',
              background: s.versus === 'cpu' ? '#eee' : '#fff',
            }}
          >
            CPU
          </button>
          <button
            onClick={() => onChangeVersus('local')}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #333',
              background: s.versus === 'local' ? '#eee' : '#fff',
            }}
          >
            Local P2
          </button>
        </div>
      </div>

      {/* Difficulty */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Difficulty</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {(['easy', 'normal', 'hard'] as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => onChangeDifficulty(d)}
              style={{
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid #333',
                background: s.difficulty === d ? '#eee' : '#fff',
                textTransform: 'capitalize',
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Round timeout */}
      <div style={{ marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Round timeout (sec, 0 disables)</div>
        <select
          value={s.roundTimeoutSec ?? 0}
          onChange={(e) =>
            onChangeRoundTimeout(Number(e.target.value) || 0)
          }
        >
          {[0, 5, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onStart}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            border: '1px solid #111',
            background: '#fff',
          }}
        >
          Start
        </button>
      </div>
    </div>
  );
}
