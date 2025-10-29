// backend-node/src/routes/bowls.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readSession, writeSession, appendEvent } from "../repo/fileRepo.js";
import { withLock } from "../repo/locks.js";
import { randomUUID } from "node:crypto";
import { extractSessionToken } from "./sessionAccess.js";

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
    const token = extractSessionToken(req);
    if (!token) return reply.code(403).send({ error: "forbidden" });

    const { status, payload } = await withLock(`sess:${sessionId}`, async () => {
      const s = await readSession(sessionId);
      if (!s) return { status: 404, payload: { error: "not_found" } } as const;

      if (s._writeToken !== token) {
        return { status: 403, payload: { error: "forbidden" } } as const;
      }

      if (ifMatch && String(s.version) !== String(ifMatch)) {
        return { status: 409, payload: { error: "version_conflict", version: s.version } } as const;
      }

      (s as any)._actions = Array.isArray((s as any)._actions) ? (s as any)._actions : [];
      if ((s as any)._actions.includes(body.actionId)) {
        return { status: 200, payload: { ok: true, dedup: true } } as const;
      }

      const participantSet = new Set(s.users.map((u) => u.id));
      const unknown = body.participantIds.filter((pid) => !participantSet.has(pid));
      if (unknown.length) {
        return {
          status: 400,
          payload: { error: "unknown_participants", participantIds: unknown },
        } as const;
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

      return { status: 201, payload: { bowl, version: s.version } } as const;
    });

    return reply.code(status).send(payload);
  });
}