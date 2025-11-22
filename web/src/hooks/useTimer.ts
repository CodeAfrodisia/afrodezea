import { useEffect, useRef, useState } from 'react';
import { every } from '../game/time';

export function useTimer(durationSec: number | null) {
  const [left, setLeft] = useState<number>(durationSec ?? 0);
  const startedRef = useRef<number | null>(null);

  useEffect(() => {
    if (durationSec == null) {
      setLeft(0);
      return;
    }
    setLeft(durationSec);
    startedRef.current = Date.now();
    const stop = every(250, () => {
      const elapsed = (Date.now() - (startedRef.current || 0)) / 1000;
      const remain = Math.max(0, durationSec - elapsed);
      setLeft(remain);
      if (remain <= 0) stop();
    });
    return stop;
  }, [durationSec]);

  return { leftSec: left, isDone: left <= 0 };
}
