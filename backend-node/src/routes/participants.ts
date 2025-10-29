// backend-node/src/routes/participants.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readSession, writeSession } from "../repo/fileRepo.js";
import { withLock } from "../repo/locks.js";
import { extractSessionToken } from "./sessionAccess.js";

export async function registerParticipantRoutes(app: FastifyInstance) {
  app.post("/sessions/:id/participants/join", async (req, reply) => {
    // ⬇️ write → авторизация обязательна
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const id = (req.params as any).id;
    const body = z.object({ label: z.string().min(1) }).parse(req.body);
    const token = extractSessionToken(req);
    if (!token) return reply.code(403).send({ error: "forbidden" });

    const { status, payload } = await withLock(`sess:${id}`, async () => {
      const s = await readSession(id);
      if (!s) return { status: 404, payload: { error: "not_found" } } as const;

      if (s._writeToken !== token) {
        return { status: 403, payload: { error: "forbidden" } } as const;
      }

      s.users.push({ id: randomUUID(), label: body.label, active: true });
      s.version++;
      await writeSession(s);
      return { status: 200, payload: { ok: true } } as const;
    });

    return reply.code(status).send(payload);
  });

  app.post("/sessions/:id/participants/leave", async (req, reply) => {
    // ⬇️ write → авторизация обязательна
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const id = (req.params as any).id;
    const body = z.object({ userId: z.string().uuid() }).parse(req.body);
    const token = extractSessionToken(req);
    if (!token) return reply.code(403).send({ error: "forbidden" });

    const { status, payload } = await withLock(`sess:${id}`, async () => {
      const s = await readSession(id);
      if (!s) return { status: 404, payload: { error: "not_found" } } as const;

      if (s._writeToken !== token) {
        return { status: 403, payload: { error: "forbidden" } } as const;
      }

      if (!s.users.some((u) => u.id === body.userId)) {
        return { status: 404, payload: { error: "not_found" } } as const;
      }

      s.users = s.users.filter((u) => u.id !== body.userId);
      s.version++;
      await writeSession(s);
      return { status: 200, payload: { ok: true } } as const;
    });

    return reply.code(status).send(payload);
  });
}