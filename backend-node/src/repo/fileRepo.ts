import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { ensureDir, writeAtomic } from "../utils/fsAtomic.js";
import { withLock } from "./locks.js";
import type { Session, ID } from "../domain/types.js";

const ROOT = process.env.DATA_DIR ?? "./data";
const SESS = path.join(ROOT, "sessions");
const EVTS = path.join(ROOT, "events");
const IDX  = path.join(ROOT, "index");

await Promise.all([ensureDir(SESS), ensureDir(EVTS), ensureDir(IDX)]);

export async function readSession(id: ID): Promise<Session | null> {
  try {
    const s = await fs.readFile(path.join(SESS, `${id}.json`), "utf8");
    const session = JSON.parse(s) as Session;
    if (!session._writeToken) {
      session._writeToken = randomUUID();
      await writeSession(session);
    }
    return session;
  } catch { return null; }
}

export async function writeSession(s: Session) {
  await writeAtomic(path.join(SESS, `${s.id}.json`), JSON.stringify(s));
}

export async function appendEvent(sessionId: ID, evt: any) {
  const line = JSON.stringify({ ts: new Date().toISOString(), ...evt }) + "\n";
  await fs.appendFile(path.join(EVTS, `${sessionId}.jsonl`), line, "utf8");
}

export async function indexAdd(hostTgId: number, sessionId: ID) {
  const file = path.join(IDX, "sessions_by_host.json");
  await withLock("idx:sessions_by_host", async () => {
    let j: Record<string, ID[]> = {};
    try { j = JSON.parse(await fs.readFile(file, "utf8")); } catch {}
    const key = String(hostTgId);
    j[key] = Array.from(new Set([...(j[key] ?? []), sessionId]));
    await writeAtomic(file, JSON.stringify(j));
  });
}