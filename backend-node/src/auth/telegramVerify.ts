import crypto from "node:crypto";

export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeSec: number
): { user?: any; auth_date?: number; start_param?: string } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new Error("missing hash");

  // data_check_string: key=value\n... (без hash)
  const pairs: string[] = [];
  for (const [k, v] of Array.from(params.entries()).filter(([k]) => k !== "hash").sort()) {
    pairs.push(`${k}=${v}`);
  }
  const dataCheckString = pairs.join("\n");

  const secret = crypto
    .createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expected = crypto.createHmac("sha256", secret).update(dataCheckString).digest("hex");

  const ok = crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(hash, "hex"));
  if (!ok) throw new Error("bad signature");

  const authDate = Number(params.get("auth_date") ?? 0);
  if (!Number.isFinite(authDate)) throw new Error("bad auth_date");
  const now = Math.floor(Date.now() / 1000);
  if (now - authDate > maxAgeSec) throw new Error("expired");

  const userStr = params.get("user");
  const startParam = params.get("start_param") ?? undefined;

  return {
    user: userStr ? JSON.parse(userStr) : undefined,
    auth_date: authDate,
    start_param: startParam
  };
}