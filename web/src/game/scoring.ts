import type { GameState, PlayerId } from './types';

export function canSubmit(state: GameState) {
  return state.status === 'running' && !state.round.locked && state.round.problem;
}

export function resolveSubmission(
  state: GameState,
  player: PlayerId,
  value: number
): { firstCorrect: boolean } {
  if (!canSubmit(state)) return { firstCorrect: false };
  const correct = state.round.problem!.answer === value;
  if (!correct) return { firstCorrect: false };
  state.round.locked = true;
  state.round.winner = player;
  state.players[player].score += 1;
  state.round.resolvedAt = Date.now();
  return { firstCorrect: true };
}

export function checkGameOver(state: GameState): boolean {
  if (state.settings.mode.kind === 'target') {
    const target = state.settings.mode.targetScore;
    return state.players.p1.score >= target || state.players.p2.score >= target;
  }
  return false;
}
