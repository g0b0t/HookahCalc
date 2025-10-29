// backend-node/src/routes/sessions.ts
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { readSession, writeSession, indexAdd } from "../repo/fileRepo.js";
import { withLock } from "../repo/locks.js";
import type { Session, PublicSession } from "../domain/types.js";
import { extractSessionToken } from "./sessionAccess.js";

function toPublicSession(session: Session): PublicSession {
  const { _writeToken, ...rest } = session;
  return rest;
}

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

    const s: Session = {
      id: randomUUID(),
      hostUserId: String(tg.user.id), // или свой userId маппинг
      title: body.title,
      place: body.place,
      pricePerBowlRub: body.pricePerBowlRub,
      startedAt: new Date().toISOString(),
      users: [],
      bowls: [],
      version: 1,
      _writeToken: randomUUID(),
    };
    await writeSession(s);
    await indexAdd(tg.user.id, s.id);
    return reply.code(201).send({ session: toPublicSession(s), writeToken: s._writeToken });
  });

  app.get("/sessions/:id", async (req, reply) => {
    // read-only — авторизация не обязательна (можно оставить так)
    const id = (req.params as any).id;
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    return { session: toPublicSession(s) };
  });

  app.post("/sessions/:id/close", async (req, reply) => {
    // ⬇️ write → требуем авторизацию
    const tg = req.tg;
    if (!tg?.user) return reply.code(401).send({ error: "unauthorized" });

    const id = (req.params as any).id;
    const actorId = String(tg.user.id);
    const token = extractSessionToken(req);
    if (!token) return reply.code(403).send({ error: "forbidden" });

    const { status, payload } = await withLock(`sess:${id}`, async () => {
      const s = await readSession(id);
      if (!s) return { status: 404, payload: { error: "not_found" } } as const;

      if (s._writeToken !== token) {
        return { status: 403, payload: { error: "forbidden" } } as const;
      }

      if (actorId !== s.hostUserId) {
        return { status: 403, payload: { error: "forbidden" } } as const;
      }

      s.closedAt = s.closedAt ?? new Date().toISOString();
      s.version++;
      await writeSession(s);
      return { status: 200, payload: { ok: true } } as const;
    });

    return reply.code(status).send(payload);
  });
}