import { useEffect, useState } from 'react';
import { every } from '../game/time';

export function useCountdown(seconds: number, onDone?: () => void) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    setLeft(seconds);
    if (seconds <= 0) return;
    const stop = every(1000, () => {
      setLeft((v) => {
        if (v <= 1) {
          stop();
          onDone?.();
          return 0;
        }
        return v - 1;
      });
    });
    return stop;
  }, [seconds, onDone]);
  return left;
}
