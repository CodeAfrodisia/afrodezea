// Minimal tracker; swap with Segment/GA later.
export function track(event, props = {}) {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug("[analytics]", event, props);
  }
  // TODO: send to your provider here
}
