const locks = new Map<string, Promise<void>>();

export async function withLock(key: string, fn: () => Promise<void>) {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const p = new Promise<void>(r => (release = r));
  locks.set(key, prev.then(() => p));
  try {
    await fn();
  } finally {
    release();
    if (locks.get(key) === p) locks.delete(key);
  }
}