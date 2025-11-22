import type { Difficulty, Problem } from './types';

const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

function pick<T>(arr: T[]) {
  return arr[randInt(0, arr.length - 1)];
}

export function generateProblem(difficulty: Difficulty): Problem {
  if (difficulty === 'easy') {
    const a = randInt(0, 10);
    const b = randInt(0, 10);
    return { prompt: `${a} + ${b}`, answer: a + b };
  }

  if (difficulty === 'normal') {
    const ops = ['+', '-', '×'] as const;
    const op = pick(ops);
    let a = randInt(0, 12);
    let b = randInt(0, 12);
    if (op === '-') {
      if (a < b) [a, b] = [b, a];
      return { prompt: `${a} - ${b}`, answer: a - b };
    }
    if (op === '×') {
      return { prompt: `${a} × ${b}`, answer: a * b };
    }
    return { prompt: `${a} + ${b}`, answer: a + b };
  }

  // hard: + - × ÷ with integer results
  const ops = ['+', '-', '×', '÷'] as const;
  const op = pick(ops);
  let a = randInt(0, 12);
  let b = randInt(1, 12);

  if (op === '+') return { prompt: `${a} + ${b}`, answer: a + b };

  if (op === '-') {
    if (a < b) [a, b] = [b, a];
    return { prompt: `${a} - ${b}`, answer: a - b };
  }

  if (op === '×') return { prompt: `${a} × ${b}`, answer: a * b };

  // division: choose pairs that divide cleanly
  const x = randInt(1, 12);
  const y = randInt(1, 12);
  const product = x * y;
  const divisor = pick([x, y]);
  const dividend = product;
  const answer = dividend / divisor;
  return { prompt: `${dividend} ÷ ${divisor}`, answer };
}
