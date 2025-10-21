import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readSession, writeSession, indexAdd } from "../repo/fileRepo.js";

export async function registerSessionRoutes(app: FastifyInstance) {
  app.post("/sessions", async (req, reply) => {
    const tg = (req as any).tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const body = z.object({
      title: z.string().min(1),
      place: z.string().optional(),
      pricePerBowlRub: z.number().int().nonnegative()
    }).parse(req.body);

    const s = {
      id: randomUUID(),
      hostUserId: randomUUID(), // можно связать с user.id, если хранить users.json
      title: body.title,
      place: body.place,
      pricePerBowlRub: body.pricePerBowlRub,
      startedAt: new Date().toISOString(),
      users: [],
      bowls: [],
      version: 1
    };
    await writeSession(s as any);
    await indexAdd(tg.user.id, s.id);
    reply.code(201).send({ session: s });
  });

  app.get("/sessions/:id", async (req, reply) => {
    const id = (req.params as any).id;
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return { session: s };
  });

  app.post("/sessions/:id/close", async (req, reply) => {
    const id = (req.params as any).id;
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    if (s.closedAt) return reply.send({ ok: true }); // идемпотентность
    s.closedAt = new Date().toISOString();
    s.version++;
    await writeSession(s);
    return { ok: true };
  });
}