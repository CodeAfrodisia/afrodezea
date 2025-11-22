// web/src/game/state.ts
import { generateProblem } from './questionGen';
import { planBotAnswer } from './bot';
import { checkGameOver, resolveSubmission } from './scoring';
import type {
  BotPlan,
  Difficulty,
  GameState,
  Mode,
  PlayerId,
  Settings,
} from './types';

const TAG = '[MR:state]';

const DEFAULT_SETTINGS: Settings = {
  mode: { kind: 'timed', seconds: 60 },
  versus: 'cpu',
  difficulty: 'normal',
  roundTimeoutSec: 10,
};

const LS_KEY = 'math-race-settings-v1';

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
function saveSettings(s: Settings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(s));
  } catch {}
}

export function createInitialState(): GameState {
  const settings = loadSettings();
  const state: GameState = {
    status: 'idle',
    settings,
    players: {
      p1: { id: 'p1', name: 'P1', score: 0, input: '' },
      p2: {
        id: 'p2',
        name: settings.versus === 'cpu' ? 'CPU' : 'P2',
        score: 0,
        input: '',
        isBot: settings.versus === 'cpu',
      },
    },
    round: {
      index: 0,
      problem: null,
      locked: false,
      winner: null,
      startedAt: null,
      resolvedAt: null,
    },
    gameStartedAt: null,
    gameEndsAt: null,
  };
  console.log(TAG, 'createInitialState()', state);
  return state;
}

// --------- singleton store (no React hooks) ----------
type Store = ReturnType<typeof _createStore>;
let _store: Store | null = null;

function _createStore() {
  const stateRef: { current: GameState } = { current: createInitialState() };
  const listeners = new Set<() => void>();
  let botTimeout: ReturnType<typeof setTimeout> | null = null;

  const set = (updater: (s: GameState) => void) => {
    updater(stateRef.current);
    listeners.forEach((l) => l());
  };
  const subscribe = (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  };

  const cancelBot = () => {
    if (botTimeout) {
      clearTimeout(botTimeout);
      botTimeout = null;
      console.log(TAG, 'cancelBot()');
    }
  };
  const scheduleBot = () => {
    const s = stateRef.current;
    console.log(TAG, 'scheduleBot() gate', {
      isBot: s.players.p2.isBot,
      locked: s.round.locked,
      hasProblem: !!s.round.problem,
      status: s.status,
    });
    if (!s.players.p2.isBot || s.round.locked || !s.round.problem) return;
    const plan: BotPlan = planBotAnswer(s.round.problem, s.settings.difficulty);
    console.log(TAG, 'scheduleBot() plan', plan);
    cancelBot();
    botTimeout = setTimeout(() => {
      console.log(TAG, 'bot submitting', plan.value);
      actions.submitAnswer('p2', plan.value);
    }, plan.delayMs);
  };

  const actions = {
    startCountdown() {
      console.log(TAG, 'startCountdown()');
      set((s) => {
        s.status = 'countdown';
      });
      console.log(TAG, 'after startCountdown', stateRef.current);
    },

    startGame() {
      console.log(TAG, 'startGame() fired with settings', stateRef.current.settings);
      set((s) => {
        // reset scores/inputs
        s.players.p1.score = 0;
        s.players.p2.score = 0;
        s.players.p1.input = '';
        s.players.p2.input = '';

        const problem = generateProblem(s.settings.difficulty);
        console.log(TAG, 'generateProblem() returned', problem);

        s.round = {
          index: 0,
          problem,
          locked: false,
          winner: null,
          startedAt: Date.now(),
          resolvedAt: null,
        };
        s.status = 'running';
        s.gameStartedAt = Date.now();
        s.gameEndsAt =
          s.settings.mode.kind === 'timed'
            ? s.gameStartedAt + s.settings.mode.seconds * 1000
            : null;
      });
      console.log(TAG, 'after startGame state', stateRef.current);
      scheduleBot();
    },

    stopGame() {
      console.log(TAG, 'stopGame()');
      cancelBot();
      set((s) => {
        s.status = 'finished';
      });
      console.log(TAG, 'after stopGame state', stateRef.current);
    },

    nextRound() {
      console.log(TAG, 'nextRound()');
      cancelBot();
      set((s) => {
        s.round.index += 1;
        const problem = generateProblem(s.settings.difficulty);
        console.log(TAG, 'generateProblem(nextRound) →', problem);

        s.round.problem = problem;
        s.round.locked = false;
        s.round.winner = null;
        s.round.startedAt = Date.now();
        s.round.resolvedAt = null;
        s.players.p1.input = '';
        s.players.p2.input = '';

        if (s.settings.mode.kind === 'timed' && s.gameEndsAt && Date.now() >= s.gameEndsAt) {
          s.status = 'finished';
        } else if (checkGameOver(s)) {
          s.status = 'finished';
        } else {
          s.status = 'running';
        }
      });
      console.log(TAG, 'after nextRound state', stateRef.current);
      if (stateRef.current.status === 'running') scheduleBot();
    },

    submitAnswer(player: PlayerId, value: number) {
      const s = stateRef.current;
      console.log(TAG, 'submitAnswer()', { player, value, problem: s.round.problem });
      const result = resolveSubmission(s, player, value);
      console.log(TAG, 'resolveSubmission →', result, 'state:', stateRef.current);

      if (result.firstCorrect) {
        set((st) => {
          st.status = 'resolved';
        });
        console.log(TAG, 'round resolved, scheduling next step');
        setTimeout(() => {
          if (checkGameOver(stateRef.current)) {
            console.log(TAG, 'game over detected after resolve');
            set((st) => {
              st.status = 'finished';
            });
          } else {
            actions.nextRound();
          }
        }, 650);
      } else {
        set((st) => {
          st.players[player].input = '';
        });
      }
    },

    setInput(player: PlayerId, input: string) {
      set((s) => {
        s.players[player].input = input;
      });
    },

    updateSettings(partial: Partial<Settings>) {
      console.log(TAG, 'updateSettings()', partial);
      set((s) => {
        s.settings = { ...s.settings, ...partial };
        s.players.p2.isBot = s.settings.versus === 'cpu';
        s.players.p2.name = s.players.p2.isBot ? 'CPU' : 'P2';
      });
      saveSettings(stateRef.current.settings);
      console.log(TAG, 'after updateSettings state', stateRef.current.settings);
    },

    setMode(mode: Mode) {
      actions.updateSettings({ mode });
    },
    setDifficulty(difficulty: Difficulty) {
      actions.updateSettings({ difficulty });
    },
    setVersus(v: 'cpu' | 'local') {
      actions.updateSettings({ versus: v });
    },
    setRoundTimeout(sec: number | null) {
      actions.updateSettings({ roundTimeoutSec: sec });
    },

    reset() {
      console.log(TAG, 'reset()');
      cancelBot();
      stateRef.current = createInitialState();
      listeners.forEach((l) => l());
      console.log(TAG, 'after reset state', stateRef.current);
    },
  };

  // background timers (no React)
  const timerIv = setInterval(() => {
    const s = stateRef.current;
    if (s.status === 'running' && s.settings.mode.kind === 'timed' && s.gameEndsAt) {
      const left = s.gameEndsAt - Date.now();
      if (left <= 0) {
        console.log(TAG, 'timerIv → time up');
        actions.stopGame();
      }
    }
  }, 200);

  const roundIv = setInterval(() => {
    const s = stateRef.current;
    if (
      s.status === 'running' &&
      s.settings.roundTimeoutSec &&
      s.round.startedAt &&
      !s.round.locked
    ) {
      const elapsed = (Date.now() - s.round.startedAt) / 1000;
      if (elapsed >= s.settings.roundTimeoutSec) {
        console.log(TAG, 'roundIv → per-round timeout elapsed');
        set((st) => {
          st.round.locked = true;
          st.status = 'resolved';
          st.round.resolvedAt = Date.now();
        });
        setTimeout(() => actions.nextRound(), 500);
      }
    }
  }, 200);

  const destroy = () => {
    console.log(TAG, 'destroy()');
    clearInterval(timerIv);
    clearInterval(roundIv);
    cancelBot();
    listeners.clear();
  };

  return {
    getState: () => stateRef.current,
    subscribe,
    actions,
    destroy,
  };
}

export function getGameStore() {
  if (!_store) _store = _createStore();
  return _store;
}

// Keep the alias the component imports expect:
export { getGameStore as useGameStore };
