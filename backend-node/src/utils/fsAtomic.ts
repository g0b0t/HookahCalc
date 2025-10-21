import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}
export async function writeAtomic(filePath: string, data: string | Buffer) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.${randomUUID()}.tmp`);
  await fs.writeFile(tmp, data);
  await fs.rename(tmp, filePath); // атомарно на *nix
}