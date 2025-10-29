import type { FastifyRequest } from "fastify";

export function extractSessionToken(req: FastifyRequest): string | null {
  const token = req.headers["x-session-token"];
  return typeof token === "string" && token ? token : null;
}
