import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readSession, writeSession, appendEvent } from "../repo/fileRepo.js";
import { withLock } from "../repo/locks.js";

export async function registerBowlRoutes(app: FastifyInstance) {
  app.post("/sessions/:id/bowls", async (req, reply) => {
    const tg = (req as any).tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const sessionId = (req.params as any).id;
    const body = z.object({
      participantIds: z.array(z.string().uuid()).min(1),
      priceRub: z.number().int().nonnegative().optional(),
      actionId: z.string().uuid()
    }).parse(req.body);

    const ifMatch = req.headers["if-match"]; // ожидаем номер версии (строка)
    await withLock(`sess:${sessionId}`, async () => {
      const s = await readSession(sessionId);
      if (!s) return reply.code(404).send({ error: "not_found" });

      if (ifMatch && String(s.version) !== String(ifMatch)) {
        return reply.code(409).send({ error: "version_conflict", version: s.version });
      }

      // простая защита от дублей: проверим по events (дорого) или держим in-memory set; на S1 допустим простую проверку:
      // Можно хранить последние N actionId в s (например, поле s._actions?: string[])
      (s as any)._actions = Array.isArray((s as any)._actions) ? (s as any)._actions : [];
      if ((s as any)._actions.includes(body.actionId)) {
        return reply.code(200).send({ ok: true, dedup: true });
      }

      const price = body.priceRub ?? s.pricePerBowlRub;
      const bowl = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        priceRub: price,
        participantIds: body.participantIds
      };
      s.bowls.unshift(bowl);
      (s as any)._actions.push(body.actionId);
      if ((s as any)._actions.length > 200) (s as any)._actions.shift(); // обрезаем хвост
      s.version++;

      await writeSession(s);
      await appendEvent(s.id, { type: "bowl.added", actor: tg.user.id, bowlId: bowl.id, actionId: body.actionId });

      reply.code(201).send({ bowl, version: s.version });
    });
  });
}