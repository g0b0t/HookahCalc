// backend-node/src/routes/sessions.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readSession, writeSession, indexAdd } from "../repo/fileRepo.js";

export async function registerSessionRoutes(app: FastifyInstance) {
  app.post("/sessions", async (req, reply) => {
    // ⬇️ Гейт авторизации на write-ручке
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const body = z.object({
      title: z.string().min(1),
      place: z.string().optional(),
      pricePerBowlRub: z.number().int().nonnegative(),
    }).parse(req.body);

    const s = {
      id: randomUUID(),
      hostUserId: String(tg.user.id), // или свой userId маппинг
      title: body.title,
      place: body.place,
      pricePerBowlRub: body.pricePerBowlRub,
      startedAt: new Date().toISOString(),
      users: [],
      bowls: [],
      version: 1,
    };
    await writeSession(s as any);
    await indexAdd(tg.user.id, s.id);
    return reply.code(201).send({ session: s });
  });

  app.get("/sessions/:id", async (req, reply) => {
    // read-only — авторизация не обязательна (можно оставить так)
    const id = (req.params as any).id;
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return { session: s };
  });

  app.post("/sessions/:id/close", async (req, reply) => {
    // ⬇️ write → требуем авторизацию
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const id = (req.params as any).id;
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    s.closedAt = s.closedAt ?? new Date().toISOString();
    s.version++;
    await writeSession(s);
    return { ok: true };
  });
}