export type Difficulty = 'easy' | 'normal' | 'hard';

export type Mode =
  | { kind: 'timed'; seconds: number }
  | { kind: 'target'; targetScore: number };

export type PlayerId = 'p1' | 'p2';

export interface Problem {
  prompt: string;
  answer: number;
}

export interface Settings {
  mode: Mode;
  versus: 'cpu' | 'local';
  difficulty: Difficulty;
  roundTimeoutSec: number | null;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  score: number;
  input: string;
  isBot?: boolean;
}

export interface RoundState {
  index: number;
  problem: Problem | null;
  locked: boolean;
  winner: PlayerId | null;
  startedAt: number | null;
  resolvedAt: number | null;
}

export interface GameState {
  status: 'idle' | 'countdown' | 'running' | 'resolved' | 'finished';
  settings: Settings;
  players: Record<PlayerId, PlayerState>;
  round: RoundState;
  gameStartedAt: number | null;
  gameEndsAt: number | null;
}

export interface BotPlan {
  delayMs: number;
  value: number;
  isCorrect: boolean;
  cancel?: () => void;
}
