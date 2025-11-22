// web/src/pages/MathRace.tsx
import React, { useEffect, useMemo, useSyncExternalStore } from 'react';
import { getGameStore } from '../game/state';
import type { GameState, Mode } from '../game/types';

import { SetupPanel } from '../components/math-race/SetupPanel';
import { Arena } from '../components/math-race/Arena';
import { ResultModal } from '../components/math-race/ResultModal';

function _selectSnapshot(s: GameState) {
  // derive a lightweight snapshot for logging / view selection
  const { status, settings, players, round, gameEndsAt } = s;
  return {
    status,
    mode: settings.mode,
    versus: settings.versus,
    difficulty: settings.difficulty,
    roundIndex: round.index,
    locked: round.locked,
    winner: round.winner,
    problem: round.problem,
    p1: players.p1.score,
    p2: players.p2.score,
    gameEndsAt,
  };
}

export default function MathRacePage() {
  const store = useMemo(() => getGameStore(), []);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const snap = _selectSnapshot(state);

  // view selection logs
  useEffect(() => {
    console.log('[MR:UI] render status=', snap.status, ' snapshot=', snap);
  }, [snap.status, snap.roundIndex, snap.locked]);

  // handlers
  const handleStart = () => {
    console.log('[MR:UI] Start clicked with settings:', state.settings);
    // countdown first (keeps Setup visible briefly), then start the game
    store.actions.startCountdown();
    setTimeout(() => {
      // re-fetch store to avoid stale closure in HMR
      getGameStore().actions.startGame();
    }, 750);
  };

  const handleRematch = () => {
    console.log('[MR:UI] Rematch clicked');
    store.actions.startCountdown();
    setTimeout(() => getGameStore().actions.startGame(), 500);
  };

  const handleChangeSettings = () => {
    console.log('[MR:UI] Change Settings clicked → resetting to Setup');
    store.actions.reset();
  };

  // SetupPanel pass-throughs
  const onChangeMode = (mode: Mode) => store.actions.setMode(mode);
  const onChangeVersus = (v: 'cpu' | 'local') => store.actions.setVersus(v);
  const onChangeDifficulty = (d: GameState['settings']['difficulty']) =>
    store.actions.setDifficulty(d);
  const onChangeRoundTimeout = (sec: number | null) => store.actions.setRoundTimeout(sec);

  // top HUD (tiny, non-blocking)
  const Header = (
    <div className="w-full flex items-center justify-between text-xs px-2 py-1">
      <div>
        {String(snap.difficulty).toUpperCase()} |{' '}
        {snap.mode.kind === 'timed'
          ? `TIMED LEFT: ${
              snap.gameEndsAt ? Math.max(0, Math.ceil((snap.gameEndsAt - Date.now()) / 1000)) : 0
            }s`
          : 'TARGET SCORE'}
      </div>
      <div>
        P1 {snap.p1} • {snap.versus.toUpperCase()} {snap.p2}
      </div>
    </div>
  );

  // view switch
  let View: React.ReactNode = null;
  switch (snap.status) {
    case 'idle':
    case 'countdown': {
      console.log('[MR:UI] Showing SetupPanel');
      View = (
        <SetupPanel
          settings={state.settings}
          onStart={handleStart}
          onChangeMode={onChangeMode}
          onChangeVersus={onChangeVersus}
          onChangeDifficulty={onChangeDifficulty}
          onChangeRoundTimeout={onChangeRoundTimeout}
        />
      );
      break;
    }
    case 'running': {
      console.log('[MR:UI] Showing Arena');
      View = (
        <Arena
          state={state}
          onSubmit={(p, v) => store.actions.submitAnswer(p, v)}
          onChange={(p, s) => store.actions.setInput(p, s)}
        />
      );
      break;
    }
    case 'resolved':
    case 'finished': {
      console.log('[MR:UI] Showing ResultModal');
      const title =
        snap.status === 'finished'
          ? snap.p1 === snap.p2
            ? 'Draw'
            : snap.p1 > snap.p2
            ? 'P1 Wins!'
            : `${state.players.p2.name} Wins!`
          : snap.winner
          ? `${snap.winner.toUpperCase()} Wins Round`
          : 'Round Over';
      View = (
        <ResultModal
          title={title}
          p1={Number.isFinite(snap.p1) ? snap.p1 : 0}
          p2={Number.isFinite(snap.p2) ? snap.p2 : 0}
          onRematch={handleRematch}
          onChangeSettings={handleChangeSettings}
        />
      );
      break;
    }
    default: {
      console.log('[MR:UI] Unknown status, falling back to SetupPanel:', snap.status);
      View = (
        <SetupPanel
          settings={state.settings}
          onStart={handleStart}
          onChangeMode={onChangeMode}
          onChangeVersus={onChangeVersus}
          onChangeDifficulty={onChangeDifficulty}
          onChangeRoundTimeout={onChangeRoundTimeout}
        />
      );
    }
  }

  return (
    <div className="w-full">
      {Header}
      <div className="p-2">{View}</div>
    </div>
  );
}
