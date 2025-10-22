// backend-node/src/routes/participants.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readSession, writeSession } from "../repo/fileRepo.js";

export async function registerParticipantRoutes(app: FastifyInstance) {
  app.post("/sessions/:id/participants/join", async (req, reply) => {
    // ⬇️ write → авторизация обязательна
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const id = (req.params as any).id;
    const body = z.object({ label: z.string().min(1) }).parse(req.body);

    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });

    s.users.push({ id: randomUUID(), label: body.label, active: true });
    s.version++;
    await writeSession(s);
    return { ok: true };
  });

  app.post("/sessions/:id/participants/leave", async (req, reply) => {
    // ⬇️ write → авторизация обязательна
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const id = (req.params as any).id;
    const body = z.object({ userId: z.string().uuid() }).parse(req.body);

    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });

    s.users = s.users.filter((u) => u.id !== body.userId);
    s.version++;
    await writeSession(s);
    return { ok: true };
  });
}