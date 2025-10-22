// backend-node/src/routes/bowls.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readSession, writeSession, appendEvent } from "../repo/fileRepo.js";
import { withLock } from "../repo/locks.js";
import { randomUUID } from "node:crypto";

export async function registerBowlRoutes(app: FastifyInstance) {
  app.post("/sessions/:id/bowls", async (req, reply) => {
    // ⬇️ авторизация (write)
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    // ✅ фикс: кэшируем actorId, чтобы сужение типа не терялось в колбэке
    const actorId = tg.user.id;

    const sessionId = (req.params as any).id;
    const body = z.object({
      participantIds: z.array(z.string().uuid()).min(1),
      priceRub: z.number().int().nonnegative().optional(),
      actionId: z.string().uuid(),
    }).parse(req.body);

    const ifMatch = req.headers["if-match"];

    await withLock(`sess:${sessionId}`, async () => {
      const s = await readSession(sessionId);
      if (!s) { reply.code(404).send({ error: "not_found" }); return; }

      if (ifMatch && String(s.version) !== String(ifMatch)) {
        reply.code(409).send({ error: "version_conflict", version: s.version }); return;
      }

      (s as any)._actions = Array.isArray((s as any)._actions) ? (s as any)._actions : [];
      if ((s as any)._actions.includes(body.actionId)) {
        reply.code(200).send({ ok: true, dedup: true }); return;
      }

      const price = body.priceRub ?? s.pricePerBowlRub;
      const bowl = {
        id: randomUUID(),
        at: new Date().toISOString(),
        priceRub: price,
        participantIds: body.participantIds,
      };

      s.bowls.unshift(bowl);
      (s as any)._actions.push(body.actionId);
      if ((s as any)._actions.length > 200) (s as any)._actions.shift();
      s.version++;

      await writeSession(s);
      await appendEvent(s.id, {
        type: "bowl.added",
        actor: actorId,              // ✅ используем сохранённый id
        bowlId: bowl.id,
        actionId: body.actionId,
      });

      reply.code(201).send({ bowl, version: s.version });
    });
  });
}