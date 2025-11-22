import type { BotPlan, Difficulty, Problem } from './types';

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function normalLike(mean: number, spread: number) {
  const u =
    Math.random() +
    Math.random() +
    Math.random() +
    Math.random() +
    Math.random() +
    Math.random();
  const z = (u - 3) / 3; // ~ N(0,1)
  return mean + z * spread;
}

export function planBotAnswer(problem: Problem, difficulty: Difficulty): BotPlan {
  const cfg = {
    easy: { mean: 1.5, spread: 0.2, acc: 0.95 },
    normal: { mean: 1.3, spread: 0.2, acc: 0.85 },
    hard: { mean: 1.1, spread: 0.2, acc: 0.7 },
  }[difficulty];

  const delaySec = clamp(normalLike(cfg.mean, cfg.spread), 0.5, 2.5);
  const isCorrect = Math.random() < cfg.acc;
  let value = problem.answer;

  if (!isCorrect) {
    const delta = Math.max(1, Math.round(Math.random() * 3));
    value = Math.random() < 0.5 ? problem.answer + delta : problem.answer - delta;
  }

  return { delayMs: Math.round(delaySec * 1000), value, isCorrect };
}
