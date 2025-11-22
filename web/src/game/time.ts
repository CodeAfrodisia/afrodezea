export function every(ms: number, fn: () => void): () => void {
  const id = setInterval(fn, ms);
  return () => clearInterval(id);
}

export function rafTick(fn: (t: number) => void): () => void {
  let running = true;
  let id = 0;
  const loop = (t: number) => {
    if (!running) return;
    fn(t);
    id = requestAnimationFrame(loop);
  };
  id = requestAnimationFrame(loop);
  return () => {
    running = false;
    cancelAnimationFrame(id);
  };
}
