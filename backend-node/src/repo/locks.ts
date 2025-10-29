const locks = new Map<string, Promise<void>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const p = new Promise<void>((resolve) => (release = resolve));
  locks.set(key, prev.then(() => p));
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(key) === p) locks.delete(key);
  }
}