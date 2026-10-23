export type PendingKey = { key: string; fingerprint: string; at: number } | null;

export function makeRequestKey() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}

// One key per distinct action. The same key is reused if the same action is retried within
// 10 minutes, so the server can recognise a retry of something we couldn't confirm.
export function keyFor(ref: { current: PendingKey }, fingerprint: string) {
  const p = ref.current;
  if (!p || p.fingerprint !== fingerprint || Date.now() - p.at > 10 * 60 * 1000) {
    ref.current = { key: makeRequestKey(), fingerprint, at: Date.now() };
  }
  return ref.current!.key;
}

// True when the request got no answer at all (timeout or no connection)
export function isNoAnswer(err: any) {
  return !err?.response && (err?.code === 'ECONNABORTED' || err?.code === 'ERR_NETWORK' || err?.message === 'Network Error');
}