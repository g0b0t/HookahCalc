import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { readSession, writeSession } from "../repo/fileRepo.js";

export async function registerParticipantRoutes(app: FastifyInstance) {
  app.post("/sessions/:id/participants/join", async (req, reply) => {
    const id = (req.params as any).id;
    const body = z.object({ label: z.string().min(1) }).parse(req.body);
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    s.users.push({ id: crypto.randomUUID(), label: body.label, active: true });
    s.version++;
    await writeSession(s);
    reply.send({ ok: true });
  });

  app.post("/sessions/:id/participants/leave", async (req, reply) => {
    const id = (req.params as any).id;
    const body = z.object({ userId: z.string().uuid() }).parse(req.body);
    const s = await readSession(id);
    if (!s) return reply.code(404).send({ error: "not_found" });
    s.users = s.users.filter(u => u.id !== body.userId);
    s.version++;
    await writeSession(s);
    reply.send({ ok: true });
  });
}